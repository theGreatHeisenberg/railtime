/**
 * Journey Search API
 * 
 * Endpoint: GET /api/journeys
 * 
 * Returns trains that travel from origin to destination station.
 * Implements 3-tier fallback strategy for data availability.
 * Supports time-based filtering with "arrive_by" and "leave_by" modes.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 9.1
 * Time Filter Requirements: 3.1, 3.2, 3.4, 3.5
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTripUpdatesWithFallback,
  getVehiclePositionsWithFallback,
  buildDataSource,
} from '@/lib/dataFetcher';
import {
  getTrainType,
  generateTripsFromStaticSchedule,
} from '@/lib/staticScheduleGenerator';
import {
  Journey,
  JourneySearchResponse,
  StopInfo,
  Direction,
  CurrentPosition,
  CaltrainTripUpdate,
  VehiclePosition,
  TimeFilterInfo,
} from '@/lib/types';
import {
  validateTimeFilterParams,
  formatTimeForDisplay,
} from '@/lib/timeFilterUtils';
import {
  filterJourneysByArriveBy,
  filterJourneysByLeaveBy,
  sortJourneysByTimeFilter,
  markBestMatch,
} from '@/lib/journeyFilters';
import stationsData from '@/lib/stations.json';

interface Station {
  stopname: string;
  urlname: string;
  stop1: string;
  stop2: string;
  lat: number;
  lon: number;
}

const stations = stationsData as Station[];

/**
 * Find station by name (case-insensitive, partial match)
 */
function findStationByName(name: string): Station | undefined {
  const normalizedName = name.toLowerCase().trim();
  return stations.find(s => 
    s.stopname.toLowerCase() === normalizedName ||
    s.urlname.toLowerCase() === normalizedName ||
    s.stopname.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(s.stopname.toLowerCase())
  );
}

/**
 * Check if a stop ID belongs to a station
 */
function stopBelongsToStation(stopId: string, station: Station): boolean {
  return stopId === station.stop1 || stopId === station.stop2;
}

/**
 * Get stop index in trip's stop sequence
 */
function getStopIndex(
  stopTimeUpdates: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate'],
  station: Station
): number {
  return stopTimeUpdates.findIndex(
    update => stopBelongsToStation(update.StopId, station)
  );
}

/**
 * Format timestamp to human-readable time
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
  });
}

/**
 * Calculate ETA in minutes from now
 */
function calculateEtaMinutes(timestamp: number): number {
  const now = Date.now();
  const targetTime = timestamp * 1000;
  return Math.round((targetTime - now) / (1000 * 60));
}

/**
 * Normalize trip ID for comparison (remove M prefix)
 * Realtime API uses "119" while static schedule uses "M119"
 */
function normalizeTrainNumber(tripId: string): string {
  // Remove M prefix if present (e.g., M119 -> 119)
  if (tripId.startsWith('M')) {
    return tripId.substring(1);
  }
  return tripId;
}

/**
 * Get direction from stop ID (odd = NB, even = SB)
 */
function getDirectionFromStopId(stopId: string): Direction {
  const num = parseInt(stopId, 10);
  return num % 2 !== 0 ? 'NB' : 'SB';
}

/**
 * Build StopInfo from stop time update
 */
function buildStopInfo(
  stopUpdate: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate'][0],
  station: Station
): StopInfo {
  const timestamp = stopUpdate.Departure?.Time || stopUpdate.Arrival?.Time || 0;
  const etaMinutes = calculateEtaMinutes(timestamp);
  
  return {
    stopId: stopUpdate.StopId,
    stopName: station.stopname,
    scheduledTime: formatTime(timestamp), // In fallback, scheduled = predicted
    predictedTime: formatTime(timestamp),
    etaMinutes: etaMinutes > 0 ? etaMinutes : null,
    status: etaMinutes <= 0 ? 'departed' : etaMinutes <= 5 ? 'approaching' : 'scheduled',
    delayMinutes: 0, // Will be calculated if we have scheduled data
    delayStatus: 'on-time',
  };
}

/**
 * Get current position for a trip from vehicle positions
 */
function getCurrentPosition(
  tripId: string,
  vehiclePositions: VehiclePosition[]
): CurrentPosition | undefined {
  const position = vehiclePositions.find(
    p => p.Vehicle?.Trip?.TripId === tripId
  );
  
  if (!position?.Vehicle?.Position) return undefined;
  
  return {
    lat: position.Vehicle.Position.Latitude,
    lon: position.Vehicle.Position.Longitude,
    bearing: position.Vehicle.Position.Bearing,
    speed: position.Vehicle.Position.Speed,
    timestamp: position.Vehicle.Timestamp * 1000,
  };
}

/**
 * Process a trip update into a Journey if it matches origin/destination
 */
function processTrip(
  tripUpdate: CaltrainTripUpdate,
  originStation: Station,
  destinationStation: Station,
  includeInProgress: boolean,
  vehiclePositions: VehiclePosition[],
  isRealtime: boolean = true
): Journey | null {
  const stopTimeUpdates = tripUpdate.TripUpdate.StopTimeUpdate;
  
  // Find origin and destination in the trip's stops
  const originIndex = getStopIndex(stopTimeUpdates, originStation);
  const destinationIndex = getStopIndex(stopTimeUpdates, destinationStation);
  
  // Trip must stop at both stations with origin before destination
  if (originIndex === -1 || destinationIndex === -1 || originIndex >= destinationIndex) {
    return null;
  }
  
  const originStop = stopTimeUpdates[originIndex];
  const destinationStop = stopTimeUpdates[destinationIndex];
  
  const originTimestamp = originStop.Departure?.Time || originStop.Arrival?.Time || 0;
  const destinationTimestamp = destinationStop.Arrival?.Time || destinationStop.Departure?.Time || 0;
  
  const originEtaMinutes = calculateEtaMinutes(originTimestamp);
  
  // Filter out past trains unless includeInProgress is true
  if (originEtaMinutes < -5 && !includeInProgress) {
    return null;
  }
  
  // Build journey
  const tripId = tripUpdate.TripUpdate.Trip.TripId;
  const direction = getDirectionFromStopId(originStop.StopId);
  const trainType = getTrainType(tripId);
  
  const originInfo = buildStopInfo(originStop, originStation);
  const destinationInfo = buildStopInfo(destinationStop, destinationStation);
  
  // Calculate journey duration in minutes
  const journeyDuration = Math.round((destinationTimestamp - originTimestamp) / 60);
  
  return {
    tripId,
    vehicleId: tripUpdate.Id,
    trainNumber: tripId,
    trainType,
    direction,
    origin: originInfo,
    destination: destinationInfo,
    totalStops: stopTimeUpdates.length,
    stopsToOrigin: originIndex,
    stopsBetween: destinationIndex - originIndex - 1,
    stopsAfterDestination: stopTimeUpdates.length - destinationIndex - 1,
    journeyDuration,
    currentPosition: getCurrentPosition(tripId, vehiclePositions),
    isRealtime,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const includeInProgress = searchParams.get('includeInProgress') === 'true';
  
  // Parse time filter parameters (Requirements 3.1, 3.2)
  const timeFilter = searchParams.get('timeFilter');
  const targetTime = searchParams.get('targetTime');
  
  // Validate required parameters
  if (!origin || !destination) {
    return NextResponse.json(
      {
        error: 'Missing required parameters',
        message: 'Both origin and destination station names are required',
        suggestions: ['Provide both origin and destination query parameters'],
        metadata: {
          timestamp: Date.now(),
          dataSource: {
            type: 'unavailable' as const,
            realtimeAvailable: false,
            fallbackReason: 'error' as const,
            sources: {
              tripUpdates: 'unavailable' as const,
              vehiclePositions: 'unavailable' as const,
              serviceAlerts: 'unavailable' as const,
            },
          },
        },
      },
      { status: 400 }
    );
  }
  
  // Validate time filter parameters if provided (Requirements 3.4, 3.5)
  let validatedTimeFilter: { mode: 'arrive_by' | 'leave_by'; targetTimestamp: number } | null = null;
  
  if (timeFilter) {
    const validation = validateTimeFilterParams(timeFilter, targetTime ?? undefined);
    
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid time filter parameters',
          message: validation.error,
          suggestions: [
            "Use timeFilter='arrive_by' or 'leave_by'",
            'Provide targetTime in ISO 8601 format (e.g., 2024-01-15T09:00:00) or Unix timestamp',
            'Ensure targetTime is in the future',
          ],
          metadata: {
            timestamp: Date.now(),
            dataSource: {
              type: 'unavailable' as const,
              realtimeAvailable: false,
              fallbackReason: 'error' as const,
              sources: {
                tripUpdates: 'unavailable' as const,
                vehiclePositions: 'unavailable' as const,
                serviceAlerts: 'unavailable' as const,
              },
            },
          },
        },
        { status: validation.code }
      );
    }
    
    validatedTimeFilter = validation.filter;
  }
  
  // Find stations
  const originStation = findStationByName(origin);
  const destinationStation = findStationByName(destination);
  
  if (!originStation) {
    return NextResponse.json(
      {
        error: 'Station not found',
        message: `Origin station "${origin}" not found`,
        suggestions: ['Check station name spelling', 'Use station names like "San Francisco", "Palo Alto", "San Jose Diridon"'],
        metadata: {
          timestamp: Date.now(),
          dataSource: {
            type: 'unavailable' as const,
            realtimeAvailable: false,
            fallbackReason: 'error' as const,
            sources: {
              tripUpdates: 'unavailable' as const,
              vehiclePositions: 'unavailable' as const,
              serviceAlerts: 'unavailable' as const,
            },
          },
        },
      },
      { status: 404 }
    );
  }
  
  if (!destinationStation) {
    return NextResponse.json(
      {
        error: 'Station not found',
        message: `Destination station "${destination}" not found`,
        suggestions: ['Check station name spelling', 'Use station names like "San Francisco", "Palo Alto", "San Jose Diridon"'],
        metadata: {
          timestamp: Date.now(),
          dataSource: {
            type: 'unavailable' as const,
            realtimeAvailable: false,
            fallbackReason: 'error' as const,
            sources: {
              tripUpdates: 'unavailable' as const,
              vehiclePositions: 'unavailable' as const,
              serviceAlerts: 'unavailable' as const,
            },
          },
        },
      },
      { status: 404 }
    );
  }
  
  // Validate origin != destination (Requirement 1.5)
  if (originStation.stopname === destinationStation.stopname) {
    return NextResponse.json(
      {
        error: 'Invalid parameters',
        message: 'Origin and destination cannot be the same station',
        suggestions: ['Choose different stations for origin and destination'],
        metadata: {
          timestamp: Date.now(),
          dataSource: {
            type: 'unavailable' as const,
            realtimeAvailable: false,
            fallbackReason: 'error' as const,
            sources: {
              tripUpdates: 'unavailable' as const,
              vehiclePositions: 'unavailable' as const,
              serviceAlerts: 'unavailable' as const,
            },
          },
        },
      },
      { status: 400 }
    );
  }
  
  try {
    // Fetch data with fallback
    const [tripUpdatesResult, vehiclePositionsResult] = await Promise.all([
      getTripUpdatesWithFallback(),
      getVehiclePositionsWithFallback(),
    ]);
    
    const realtimeTripUpdates = tripUpdatesResult.data;
    const vehiclePositions = vehiclePositionsResult.data.Entities || [];
    
    // Track which trip IDs are from realtime data (normalized for comparison)
    const realtimeTripIds = new Set(
      (realtimeTripUpdates.Entities || []).map(e => e.TripUpdate.Trip.TripId)
    );
    
    // Also track normalized train numbers from realtime data for deduplication
    // This handles cases like realtime "119" matching static "M119"
    const realtimeNormalizedIds = new Set(
      (realtimeTripUpdates.Entities || []).map(e => normalizeTrainNumber(e.TripUpdate.Trip.TripId))
    );
    
    // Calculate time window for static schedule data
    // For time filters, extend window to target time; otherwise use 12 hours for "show more"
    let staticWindowMinutes = 720; // 12 hours default for "Depart Now" mode
    if (validatedTimeFilter) {
      const now = Date.now();
      const targetTimestamp = validatedTimeFilter.targetTimestamp;
      const minutesUntilTarget = Math.ceil((targetTimestamp - now) / (1000 * 60));
      staticWindowMinutes = Math.max(staticWindowMinutes, minutesUntilTarget + 60);
    }
    
    // Generate static schedule data to include future trains
    const staticTrips = generateTripsFromStaticSchedule(staticWindowMinutes);
    
    // Build maps of realtime trips and their stop coverage
    // Key: tripId, Value: { hasOrigin, hasDestination, hasBoth }
    interface RealtimeStopInfo {
      hasOrigin: boolean;
      hasDestination: boolean;
      hasBoth: boolean;
      originStopUpdate?: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate'][0];
    }
    const realtimeTripsStopInfo = new Map<string, RealtimeStopInfo>();
    
    for (const entity of realtimeTripUpdates.Entities || []) {
      const tripId = entity.TripUpdate.Trip.TripId;
      const stops = entity.TripUpdate.StopTimeUpdate;
      const originStopUpdate = stops.find(s => stopBelongsToStation(s.StopId, originStation));
      const hasOrigin = !!originStopUpdate;
      const hasDestination = stops.some(s => stopBelongsToStation(s.StopId, destinationStation));
      const info: RealtimeStopInfo = { 
        hasOrigin, 
        hasDestination, 
        hasBoth: hasOrigin && hasDestination,
        originStopUpdate 
      };
      realtimeTripsStopInfo.set(tripId, info);
      realtimeTripsStopInfo.set(normalizeTrainNumber(tripId), info);
    }
    
    // Legacy compatibility map
    const realtimeTripsWithRequiredStops = new Map<string, boolean>();
    for (const [tripId, info] of realtimeTripsStopInfo) {
      realtimeTripsWithRequiredStops.set(tripId, info.hasBoth);
    }
    
    // Add static trips that aren't in realtime data OR where realtime data is incomplete
    // Check both exact match and normalized match (M119 matches 119)
    const additionalStaticTrips = (staticTrips.Entities || []).filter(entity => {
      const tripId = entity.TripUpdate.Trip.TripId;
      const normalizedId = normalizeTrainNumber(tripId);
      
      // Check if realtime version exists
      const realtimeExists = realtimeTripIds.has(tripId) || realtimeNormalizedIds.has(normalizedId);
      
      if (!realtimeExists) {
        // No realtime version, include static
        return true;
      }
      
      // Realtime version exists - check if it has the required stops
      const realtimeHasStops = realtimeTripsWithRequiredStops.get(tripId) || 
                               realtimeTripsWithRequiredStops.get(normalizedId);
      
      // Include static version if realtime doesn't have required stops
      return !realtimeHasStops;
    });
    
    // Merge: realtime trips first, then static trips for future trains
    const allTripUpdates = {
      ...realtimeTripUpdates,
      Entities: [...(realtimeTripUpdates.Entities || []), ...additionalStaticTrips],
    };
    
    // Process trips into journeys
    let journeys: Journey[] = [];
    
    // Track seen departure times to deduplicate trains with same departure
    // Key: departure timestamp, Value: journey (prefer realtime > partial > scheduled)
    const seenDepartures = new Map<number, Journey>();
    
    // Track which static trips were added because realtime was incomplete
    const staticTripIds = new Set(additionalStaticTrips.map(e => e.TripUpdate.Trip.TripId));
    
    for (const entity of allTripUpdates.Entities || []) {
      const tripId = entity.TripUpdate.Trip.TripId;
      const normalizedId = normalizeTrainNumber(tripId);
      
      // Check realtime stop coverage for this trip
      const realtimeInfo = realtimeTripsStopInfo.get(tripId) || realtimeTripsStopInfo.get(normalizedId);
      
      // Determine realtime status:
      // - Full realtime: has both origin and destination in realtime data
      // - Partial realtime: has origin in realtime but using static for destination
      // - Static: no realtime data available
      const isFromRealtimeApi = realtimeTripIds.has(tripId) || realtimeNormalizedIds.has(normalizedId);
      const isStaticTrip = staticTripIds.has(tripId);
      const isFullRealtime = isFromRealtimeApi && !isStaticTrip && realtimeInfo?.hasBoth;
      const isPartialRealtime = isStaticTrip && realtimeInfo?.hasOrigin && !realtimeInfo?.hasBoth;
      
      const journey = processTrip(
        entity,
        originStation,
        destinationStation,
        includeInProgress,
        vehiclePositions,
        isFullRealtime
      );
      
      if (journey) {
        // Use normalized train number for display (remove M prefix)
        journey.trainNumber = normalizeTrainNumber(journey.trainNumber);
        
        // If this is a static trip but we have realtime origin data, enhance it
        if (isPartialRealtime && realtimeInfo?.originStopUpdate) {
          const realtimeOriginStop = realtimeInfo.originStopUpdate;
          const realtimeTimestamp = realtimeOriginStop.Departure?.Time || realtimeOriginStop.Arrival?.Time || 0;
          const realtimeEtaMinutes = calculateEtaMinutes(realtimeTimestamp);
          
          // Update origin with realtime data
          journey.origin.predictedTime = formatTime(realtimeTimestamp);
          journey.origin.etaMinutes = realtimeEtaMinutes > 0 ? realtimeEtaMinutes : null;
          journey.origin.status = realtimeEtaMinutes <= 0 ? 'departed' : realtimeEtaMinutes <= 5 ? 'approaching' : 'scheduled';
          
          // Mark as partial realtime
          journey.isRealtime = true;
          journey.isPartialRealtime = true;
        }
        
        // Get the departure timestamp for deduplication
        // Round to nearest minute to handle slight time differences
        const originStop = entity.TripUpdate.StopTimeUpdate.find(
          s => stopBelongsToStation(s.StopId, originStation)
        );
        const departureTimestamp = originStop?.Departure?.Time || originStop?.Arrival?.Time || 0;
        const roundedDeparture = Math.round(departureTimestamp / 60) * 60; // Round to minute
        
        // Check if we already have a journey with this departure time
        const existingJourney = seenDepartures.get(roundedDeparture);
        
        // Priority: full realtime > partial realtime > static
        const getJourneyPriority = (j: Journey) => {
          if (j.isRealtime && !j.isPartialRealtime) return 3; // Full realtime
          if (j.isRealtime && j.isPartialRealtime) return 2;  // Partial realtime
          return 1; // Static
        };
        
        if (!existingJourney) {
          seenDepartures.set(roundedDeparture, journey);
        } else if (getJourneyPriority(journey) > getJourneyPriority(existingJourney)) {
          seenDepartures.set(roundedDeparture, journey);
        }
      }
    }
    
    // Convert map values to array
    journeys = Array.from(seenDepartures.values());
    
    // Build response metadata
    const dataSource = buildDataSource(
      tripUpdatesResult.source,
      vehiclePositionsResult.source,
      'realtime', // Service alerts not used in this endpoint
      tripUpdatesResult.fallbackReason || vehiclePositionsResult.fallbackReason,
      tripUpdatesResult.message || vehiclePositionsResult.message,
      tripUpdatesResult.source === 'realtime' ? tripUpdatesResult.timestamp : undefined
    );
    
    // Apply time filtering if specified (Requirements 1.1, 1.2, 2.1, 2.2)
    let timeFilterInfo: TimeFilterInfo | undefined;
    let suggestions: string[] | undefined;
    
    if (validatedTimeFilter) {
      const { mode, targetTimestamp } = validatedTimeFilter;
      const referenceDate = new Date();
      
      // Step 1: Filter journeys by time constraint
      if (mode === 'arrive_by') {
        journeys = filterJourneysByArriveBy(journeys, targetTimestamp, referenceDate);
      } else {
        journeys = filterJourneysByLeaveBy(journeys, targetTimestamp, referenceDate);
      }
      
      // Step 2: Sort by relevant time (descending for time filters)
      journeys = sortJourneysByTimeFilter(journeys, mode, referenceDate);
      
      // Step 3: Mark best match and calculate minutes before target (Requirements 5.3, 5.4)
      journeys = markBestMatch(journeys, mode, targetTimestamp, referenceDate);
      
      // Build time filter info for response
      const targetTimeFormatted = formatTimeForDisplay(targetTimestamp);
      
      // Handle empty results with helpful messages (Requirements 1.3, 2.3)
      if (journeys.length === 0) {
        const stationName = mode === 'arrive_by' 
          ? destinationStation.stopname 
          : originStation.stopname;
        const modeDescription = mode === 'arrive_by' 
          ? `arrive at ${stationName}` 
          : `depart from ${stationName}`;
        const alternativeMode = mode === 'arrive_by' ? 'Leave By' : 'Arrive By';
        
        timeFilterInfo = {
          mode,
          targetTime: targetTimeFormatted,
          targetTimestamp,
          message: `No trains ${modeDescription} before ${targetTimeFormatted}`,
        };
        suggestions = [
          'Try a later target time',
          `Switch to '${alternativeMode}' mode`,
          'Check the schedule for available trains',
        ];
      } else {
        timeFilterInfo = {
          mode,
          targetTime: targetTimeFormatted,
          targetTimestamp,
        };
      }
    } else {
      // Default: Sort by origin ETA ascending (Requirement 1.3, 3.3)
      journeys.sort((a, b) => {
        const etaA = a.origin.etaMinutes ?? Infinity;
        const etaB = b.origin.etaMinutes ?? Infinity;
        return etaA - etaB;
      });
    }
    
    const response: JourneySearchResponse = {
      journeys,
      metadata: {
        timestamp: Date.now(),
        dataSource,
      },
      ...(timeFilterInfo && { timeFilterInfo }),
      ...(suggestions && { suggestions }),
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Journey API Error:', error);
    
    return NextResponse.json(
      {
        error: 'No data available',
        message: 'Unable to fetch train data. Please try again.',
        suggestions: ['Retry in a few seconds', 'Visit caltrain.com for schedule information'],
        metadata: {
          timestamp: Date.now(),
          dataSource: {
            type: 'unavailable' as const,
            realtimeAvailable: false,
            fallbackReason: 'error' as const,
            sources: {
              tripUpdates: 'unavailable' as const,
              vehiclePositions: 'unavailable' as const,
              serviceAlerts: 'unavailable' as const,
            },
          },
        },
      },
      { status: 500 }
    );
  }
}
