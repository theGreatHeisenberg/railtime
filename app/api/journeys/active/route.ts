/**
 * Active Journeys API
 * 
 * Endpoint: GET /api/journeys/active
 * 
 * Returns trains that have departed the origin station within the lookback period
 * and have not yet reached the destination. Useful for tracking trains you're already on.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTripUpdatesWithFallback,
  getVehiclePositionsWithFallback,
  buildDataSource,
} from '@/lib/dataFetcher';
import { getTrainType } from '@/lib/staticScheduleGenerator';
import {
  ActiveJourney,
  ActiveJourneysResponse,
  DepartedStopInfo,
  UpcomingStopInfo,
  Direction,
  CurrentPosition,
  CaltrainTripUpdate,
  VehiclePosition,
} from '@/lib/types';
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

// Default lookback period in minutes (Requirement 4.4)
const DEFAULT_LOOKBACK_MINUTES = 30;

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
 * Calculate minutes since a timestamp
 */
function calculateMinutesAgo(timestamp: number): number {
  const now = Date.now();
  const targetTime = timestamp * 1000;
  return Math.round((now - targetTime) / (1000 * 60));
}

/**
 * Get direction from stop ID (odd = NB, even = SB)
 */
function getDirectionFromStopId(stopId: string): Direction {
  const num = parseInt(stopId, 10);
  return num % 2 !== 0 ? 'NB' : 'SB';
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
 * Build DepartedStopInfo for origin that has been passed
 */
function buildDepartedStopInfo(
  stopUpdate: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate'][0],
  station: Station
): DepartedStopInfo {
  const timestamp = stopUpdate.Departure?.Time || stopUpdate.Arrival?.Time || 0;
  const minutesAgo = calculateMinutesAgo(timestamp);
  
  return {
    stopId: stopUpdate.StopId,
    stopName: station.stopname,
    scheduledTime: formatTime(timestamp),
    predictedTime: formatTime(timestamp),
    etaMinutes: null, // Already passed
    status: 'departed',
    delayMinutes: 0,
    delayStatus: 'on-time',
    minutesAgo,
    actualDeparture: formatTime(timestamp),
  };
}

/**
 * Build UpcomingStopInfo for destination that hasn't been reached
 */
function buildUpcomingStopInfo(
  stopUpdate: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate'][0],
  station: Station
): UpcomingStopInfo {
  const timestamp = stopUpdate.Arrival?.Time || stopUpdate.Departure?.Time || 0;
  const etaMinutes = calculateEtaMinutes(timestamp);
  
  return {
    stopId: stopUpdate.StopId,
    stopName: station.stopname,
    scheduledTime: formatTime(timestamp),
    predictedTime: formatTime(timestamp),
    etaMinutes: etaMinutes > 0 ? etaMinutes : 0,
    status: etaMinutes <= 5 ? 'approaching' : 'scheduled',
    delayMinutes: 0,
    delayStatus: 'on-time',
  };
}

/**
 * Get the station order index for a stop ID
 * This helps determine if a train has passed a station based on remaining stops
 */
function getStationOrderIndex(stopId: string): number {
  // Stop IDs are ordered: lower numbers are north (SF), higher are south (SJ/Gilroy)
  // Odd numbers are NB platform, even are SB platform
  const baseId = Math.floor(parseInt(stopId, 10) / 10) * 10;
  return baseId;
}

/**
 * Check if a train has passed a station based on its remaining stops
 * The GTFS-RT feed removes stops once they're passed, so we check if the
 * first remaining stop is AFTER the station in question
 */
function hasTrainPassedStation(
  stopTimeUpdates: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate'],
  station: Station,
  direction: Direction
): boolean {
  if (stopTimeUpdates.length === 0) return false;
  
  const firstRemainingStopId = stopTimeUpdates[0].StopId;
  const stationStopId = direction === 'NB' ? station.stop1 : station.stop2;
  
  const firstRemainingOrder = getStationOrderIndex(firstRemainingStopId);
  const stationOrder = getStationOrderIndex(stationStopId);
  
  // For NB trains, they go from high numbers to low (SJ → SF)
  // So if first remaining stop has lower order than station, train has passed it
  if (direction === 'NB') {
    return firstRemainingOrder < stationOrder;
  }
  
  // For SB trains, they go from low numbers to high (SF → SJ)
  // So if first remaining stop has higher order than station, train has passed it
  return firstRemainingOrder > stationOrder;
}

/**
 * Process a trip update into an ActiveJourney if it matches criteria
 * 
 * Criteria (Requirement 4.1, 4.3):
 * - Train has departed origin (origin no longer in remaining stops)
 * - Train has not yet reached destination (destination still in remaining stops)
 * - Departure was within lookback period (estimated from first remaining stop)
 */
function processActiveTrip(
  tripUpdate: CaltrainTripUpdate,
  originStation: Station,
  destinationStation: Station,
  lookbackMinutes: number,
  vehiclePositions: VehiclePosition[]
): ActiveJourney | null {
  const stopTimeUpdates = tripUpdate.TripUpdate.StopTimeUpdate;
  if (stopTimeUpdates.length === 0) return null;
  
  // Determine direction from first remaining stop
  const firstStopId = stopTimeUpdates[0].StopId;
  const direction = getDirectionFromStopId(firstStopId);
  
  // Check if destination is still in remaining stops
  const destinationIndex = getStopIndex(stopTimeUpdates, destinationStation);
  if (destinationIndex === -1) {
    // Destination already passed or not on this route
    return null;
  }
  
  // Check if origin is still in remaining stops
  const originIndex = getStopIndex(stopTimeUpdates, originStation);
  
  if (originIndex !== -1) {
    // Origin is still in remaining stops - train hasn't departed origin yet
    // This is a future train, not an active one
    return null;
  }
  
  // Origin is NOT in remaining stops - check if train has actually passed it
  // (vs origin not being on this route at all)
  if (!hasTrainPassedStation(stopTimeUpdates, originStation, direction)) {
    // Train hasn't passed origin - origin might not be on this route
    return null;
  }
  
  // Train has passed origin and destination is still ahead
  // Estimate when train departed origin based on first remaining stop time
  const firstStopTimestamp = stopTimeUpdates[0].Departure?.Time || stopTimeUpdates[0].Arrival?.Time || 0;
  const firstStopEta = calculateEtaMinutes(firstStopTimestamp);
  
  // Rough estimate: origin was passed ~5-10 minutes before first remaining stop
  // This is imprecise but gives us a reasonable lookback check
  const estimatedOriginMinutesAgo = Math.max(0, -firstStopEta + 5);
  
  if (estimatedOriginMinutesAgo > lookbackMinutes) {
    // Train departed too long ago
    return null;
  }
  
  const destinationStop = stopTimeUpdates[destinationIndex];
  const destinationTimestamp = destinationStop.Arrival?.Time || destinationStop.Departure?.Time || 0;
  const destinationEtaMinutes = calculateEtaMinutes(destinationTimestamp);
  
  // Check if train has not yet reached destination (ETA > 0)
  if (destinationEtaMinutes < 0) {
    return null;
  }
  
  // Build active journey
  const tripId = tripUpdate.TripUpdate.Trip.TripId;
  const trainType = getTrainType(tripId);
  
  // Create a synthetic departed stop info for origin
  const originInfo: DepartedStopInfo = {
    stopId: direction === 'NB' ? originStation.stop1 : originStation.stop2,
    stopName: originStation.stopname,
    scheduledTime: '--',
    predictedTime: '--',
    etaMinutes: null,
    status: 'departed',
    delayMinutes: 0,
    delayStatus: 'on-time',
    minutesAgo: estimatedOriginMinutesAgo,
    actualDeparture: '--',
  };
  
  const destinationInfo = buildUpcomingStopInfo(destinationStop, destinationStation);
  
  return {
    tripId,
    trainNumber: tripId,
    trainType,
    direction,
    origin: originInfo,
    destination: destinationInfo,
    currentPosition: getCurrentPosition(tripId, vehiclePositions),
  };
}


export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const lookbackMinutesParam = searchParams.get('lookbackMinutes');
  
  // Parse lookbackMinutes with default (Requirement 4.4)
  const lookbackMinutes = lookbackMinutesParam 
    ? parseInt(lookbackMinutesParam, 10) 
    : DEFAULT_LOOKBACK_MINUTES;
  
  // Validate lookbackMinutes is a positive number
  if (isNaN(lookbackMinutes) || lookbackMinutes <= 0) {
    return NextResponse.json(
      {
        error: 'Invalid parameters',
        message: 'lookbackMinutes must be a positive number',
        suggestions: ['Provide a positive number for lookbackMinutes, e.g., 30'],
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
  
  // Validate origin != destination
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
    
    const tripUpdates = tripUpdatesResult.data;
    const vehiclePositions = vehiclePositionsResult.data.Entities || [];
    
    // Process trips into active journeys
    const activeJourneys: ActiveJourney[] = [];
    
    for (const entity of tripUpdates.Entities || []) {
      const activeJourney = processActiveTrip(
        entity,
        originStation,
        destinationStation,
        lookbackMinutes,
        vehiclePositions
      );
      
      if (activeJourney) {
        activeJourneys.push(activeJourney);
      }
    }
    
    // Sort by minutes since departure (most recent first)
    activeJourneys.sort((a, b) => a.origin.minutesAgo - b.origin.minutesAgo);
    
    // Build response with metadata
    const dataSource = buildDataSource(
      tripUpdatesResult.source,
      vehiclePositionsResult.source,
      'realtime', // Service alerts not used in this endpoint
      tripUpdatesResult.fallbackReason || vehiclePositionsResult.fallbackReason,
      tripUpdatesResult.message || vehiclePositionsResult.message,
      tripUpdatesResult.source === 'realtime' ? tripUpdatesResult.timestamp : undefined
    );
    
    // Requirement 4.5: Return empty array when no trains match
    const response: ActiveJourneysResponse = {
      activeJourneys,
      metadata: {
        timestamp: Date.now(),
        dataSource,
      },
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Active Journeys API Error:', error);
    
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
