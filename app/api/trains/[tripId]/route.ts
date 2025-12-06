/**
 * Train Details API
 * 
 * Endpoint: GET /api/trains/:tripId
 * 
 * Returns complete details about a specific train including:
 * - Full stop timeline with scheduled and predicted times
 * - Segment labels (before-origin, journey, after-destination) when origin/destination provided
 * - Current position from Vehicle Positions API
 * - Passed stops marked with status "passed" and null ETA
 * - Relevant service alerts
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTripUpdatesWithFallback,
  getVehiclePositionsWithFallback,
  getServiceAlertsWithFallback,
  buildDataSource,
  getEstimatedPosition,
} from '@/lib/dataFetcher';
import {
  getStationNameByStopId,
  getStationByStopId,
  getTrainType,
  getDirectionFromStopId,
  getRouteId,
  getFullTripSchedule,
} from '@/lib/staticScheduleGenerator';
import {
  TrainDetailsResponse,
  TripDetails,
  StopTimeline,
  StopSegment,
  TripStatus,
  DetailedPosition,
  ServiceAlert,
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
 * Determine stop status based on ETA
 */
function getStopStatus(etaMinutes: number): 'approaching' | 'boarding' | 'departed' | 'scheduled' | 'passed' {
  if (etaMinutes < -2) return 'passed';
  if (etaMinutes <= 0) return 'boarding';
  if (etaMinutes <= 5) return 'approaching';
  return 'scheduled';
}

/**
 * Determine trip status based on stops
 */
function determineTripStatus(
  stopTimeUpdates: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate']
): TripStatus {
  if (stopTimeUpdates.length === 0) return 'scheduled';
  
  const now = Date.now();
  const firstStopTime = (stopTimeUpdates[0].Departure?.Time || stopTimeUpdates[0].Arrival?.Time || 0) * 1000;
  const lastStopTime = (stopTimeUpdates[stopTimeUpdates.length - 1].Arrival?.Time || 
                        stopTimeUpdates[stopTimeUpdates.length - 1].Departure?.Time || 0) * 1000;
  
  if (now < firstStopTime) return 'scheduled';
  if (now > lastStopTime) return 'completed';
  return 'active';
}

/**
 * Find trip update by trip ID
 */
function findTripUpdate(
  entities: CaltrainTripUpdate[],
  tripId: string
): CaltrainTripUpdate | undefined {
  return entities.find(e => e.TripUpdate?.Trip?.TripId === tripId);
}

/**
 * Get current position for a trip from vehicle positions
 */
function getDetailedPosition(
  tripId: string,
  vehiclePositions: VehiclePosition[],
  stopTimeUpdates: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate']
): DetailedPosition | undefined {
  const position = vehiclePositions.find(
    p => p.Vehicle?.Trip?.TripId === tripId
  );
  
  if (!position?.Vehicle?.Position) {
    // Try to get estimated position
    const estimated = getEstimatedPosition(tripId);
    if (estimated) {
      return {
        lat: estimated.from.lat || 0,
        lon: estimated.from.lon || 0,
        timestamp: Date.now(),
        lastPassedStop: estimated.from,
        nextStop: estimated.to,
        progressToNextStop: estimated.progress,
      };
    }
    return undefined;
  }
  
  // Find last passed stop and next stop
  const now = Date.now();
  let lastPassedIndex = -1;
  
  for (let i = 0; i < stopTimeUpdates.length; i++) {
    const stopTime = (stopTimeUpdates[i].Departure?.Time || stopTimeUpdates[i].Arrival?.Time || 0) * 1000;
    if (stopTime <= now) {
      lastPassedIndex = i;
    } else {
      break;
    }
  }
  
  const lastPassedStop = lastPassedIndex >= 0 ? stopTimeUpdates[lastPassedIndex] : stopTimeUpdates[0];
  const nextStopIndex = lastPassedIndex + 1;
  const nextStop = nextStopIndex < stopTimeUpdates.length ? stopTimeUpdates[nextStopIndex] : stopTimeUpdates[stopTimeUpdates.length - 1];
  
  // Calculate progress to next stop
  let progressToNextStop = 0;
  if (lastPassedIndex >= 0 && nextStopIndex < stopTimeUpdates.length) {
    const lastTime = (lastPassedStop.Departure?.Time || lastPassedStop.Arrival?.Time || 0) * 1000;
    const nextTime = (nextStop.Arrival?.Time || nextStop.Departure?.Time || 0) * 1000;
    const totalDuration = nextTime - lastTime;
    if (totalDuration > 0) {
      progressToNextStop = Math.max(0, Math.min(1, (now - lastTime) / totalDuration));
    }
  }
  
  const lastStation = getStationByStopId(lastPassedStop.StopId);
  const nextStation = getStationByStopId(nextStop.StopId);
  
  return {
    lat: position.Vehicle.Position.Latitude,
    lon: position.Vehicle.Position.Longitude,
    bearing: position.Vehicle.Position.Bearing,
    speed: position.Vehicle.Position.Speed,
    timestamp: position.Vehicle.Timestamp * 1000,
    lastPassedStop: {
      stopId: lastPassedStop.StopId,
      stopName: getStationNameByStopId(lastPassedStop.StopId),
      lat: lastStation?.lat,
      lon: lastStation?.lon,
    },
    nextStop: {
      stopId: nextStop.StopId,
      stopName: getStationNameByStopId(nextStop.StopId),
      lat: nextStation?.lat,
      lon: nextStation?.lon,
    },
    progressToNextStop,
  };
}


/**
 * Build stop timeline by merging static schedule with real-time data
 * 
 * This ensures we show the FULL journey including:
 * - Passed stops (from static schedule, marked as 'passed')
 * - Current/upcoming stops (from real-time data with live ETAs)
 */
function buildStopTimeline(
  tripId: string,
  realtimeStopUpdates: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate'],
  originStation?: Station,
  destinationStation?: Station
): StopTimeline[] {
  const timeline: StopTimeline[] = [];
  
  // Get full static schedule for this trip
  const staticSchedule = getFullTripSchedule(tripId);
  
  // Create a map of real-time stop data for quick lookup
  const realtimeStopMap = new Map<string, CaltrainTripUpdate['TripUpdate']['StopTimeUpdate'][0]>();
  for (const stop of realtimeStopUpdates) {
    realtimeStopMap.set(stop.StopId, stop);
  }
  
  // Get the first real-time stop ID to determine where real-time data starts
  const firstRealtimeStopId = realtimeStopUpdates[0]?.StopId;
  
  // Use static schedule as the base (full journey)
  // If no static schedule, fall back to real-time only
  const baseStops = staticSchedule.length > 0 ? staticSchedule : realtimeStopUpdates.map(s => ({
    stopId: s.StopId,
    scheduledTime: formatTime(s.Arrival?.Time || s.Departure?.Time || 0),
    timestamp: s.Arrival?.Time || s.Departure?.Time || 0,
  }));
  
  // Find origin and destination indices
  let originIndex = -1;
  let destinationIndex = -1;
  
  if (originStation) {
    originIndex = baseStops.findIndex(s => stopBelongsToStation(s.stopId, originStation));
  }
  if (destinationStation) {
    destinationIndex = baseStops.findIndex(s => stopBelongsToStation(s.stopId, destinationStation));
  }
  
  // Track if we've reached the real-time portion of the journey
  let reachedRealtimeSection = false;
  // Track if we've already marked a stop as "approaching" (only one allowed)
  let hasApproachingStop = false;
  
  for (let i = 0; i < baseStops.length; i++) {
    const staticStop = baseStops[i];
    const realtimeStop = realtimeStopMap.get(staticStop.stopId);
    
    // Check if this is where real-time data starts
    if (staticStop.stopId === firstRealtimeStopId) {
      reachedRealtimeSection = true;
    }
    
    // Use real-time data if available, otherwise use static
    let arrivalTime: number;
    let departureTime: number;
    let isPassed: boolean;
    
    if (realtimeStop) {
      // Real-time data available for this stop
      arrivalTime = realtimeStop.Arrival?.Time || realtimeStop.Departure?.Time || staticStop.timestamp;
      departureTime = realtimeStop.Departure?.Time || realtimeStop.Arrival?.Time || staticStop.timestamp;
      const etaMinutes = calculateEtaMinutes(arrivalTime);
      isPassed = etaMinutes < -2;
    } else if (!reachedRealtimeSection && staticSchedule.length > 0) {
      // Before real-time section - this stop has been passed
      arrivalTime = staticStop.timestamp;
      departureTime = staticStop.timestamp;
      isPassed = true;
    } else {
      // No real-time data and after real-time section started (shouldn't happen often)
      arrivalTime = staticStop.timestamp;
      departureTime = staticStop.timestamp;
      const etaMinutes = calculateEtaMinutes(arrivalTime);
      isPassed = etaMinutes < -2;
    }
    
    const etaMinutes = calculateEtaMinutes(arrivalTime);
    let status = isPassed ? 'passed' : getStopStatus(etaMinutes);
    
    // Only allow ONE approaching stop - the first upcoming one
    if (status === 'approaching') {
      if (hasApproachingStop) {
        status = 'scheduled'; // Downgrade subsequent "approaching" to "scheduled"
      } else {
        hasApproachingStop = true;
      }
    }
    
    // Determine segment label
    let segment: StopSegment | undefined;
    if (originIndex !== -1 && destinationIndex !== -1) {
      if (i < originIndex) {
        segment = 'before-origin';
      } else if (i >= originIndex && i <= destinationIndex) {
        segment = 'journey';
      } else {
        segment = 'after-destination';
      }
    }
    
    const stopTimeline: StopTimeline = {
      stopId: staticStop.stopId,
      stopName: getStationNameByStopId(staticStop.stopId),
      scheduledTime: staticStop.scheduledTime || formatTime(arrivalTime),
      predictedTime: formatTime(arrivalTime),
      scheduledArrival: staticStop.scheduledTime || formatTime(arrivalTime),
      predictedArrival: formatTime(arrivalTime),
      scheduledDeparture: staticStop.scheduledTime || formatTime(departureTime),
      predictedDeparture: formatTime(departureTime),
      etaMinutes: status === 'passed' ? null : etaMinutes,
      status,
      delayMinutes: 0,
      delayStatus: 'on-time',
      segment,
      isFromStaticSchedule: !realtimeStop,
    };
    
    timeline.push(stopTimeline);
  }
  
  return timeline;
}

/**
 * Filter service alerts relevant to a trip
 */
function filterRelevantAlerts(
  alerts: ServiceAlert[],
  stopIds: string[]
): ServiceAlert[] {
  return alerts.filter(alert => {
    // Include alerts with no specific stations (system-wide)
    if (!alert.affectedStations || alert.affectedStations.length === 0) {
      return true;
    }
    // Include alerts that affect any stop on this trip
    return alert.affectedStations.some(stationId => stopIds.includes(stationId));
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse> {
  const { tripId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  
  // Validate trip ID
  if (!tripId) {
    return NextResponse.json(
      {
        error: 'Missing required parameter',
        message: 'Trip ID is required',
        suggestions: ['Provide a valid trip ID in the URL path'],
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
  
  // Find optional origin/destination stations
  const originStation = origin ? findStationByName(origin) : undefined;
  const destinationStation = destination ? findStationByName(destination) : undefined;
  
  try {
    // Fetch data with fallback
    const [tripUpdatesResult, vehiclePositionsResult, alertsResult] = await Promise.all([
      getTripUpdatesWithFallback(),
      getVehiclePositionsWithFallback(),
      getServiceAlertsWithFallback(),
    ]);
    
    const tripUpdates = tripUpdatesResult.data;
    const vehiclePositions = vehiclePositionsResult.data.Entities || [];
    const alerts = alertsResult.data;
    
    // Find the specific trip
    const tripUpdate = findTripUpdate(tripUpdates.Entities || [], tripId);
    
    if (!tripUpdate) {
      return NextResponse.json(
        {
          error: 'Trip not found',
          message: `No trip found with ID "${tripId}"`,
          suggestions: ['Check the trip ID', 'The trip may have completed or not started yet'],
          metadata: {
            timestamp: Date.now(),
            dataSource: {
              type: tripUpdatesResult.source === 'realtime' ? 'realtime' : 'static',
              realtimeAvailable: tripUpdatesResult.source === 'realtime',
              fallbackReason: tripUpdatesResult.fallbackReason,
              message: tripUpdatesResult.message,
              sources: {
                tripUpdates: tripUpdatesResult.source,
                vehiclePositions: vehiclePositionsResult.source,
                serviceAlerts: alertsResult.source,
              },
            },
          },
        },
        { status: 404 }
      );
    }
    
    const stopTimeUpdates = tripUpdate.TripUpdate.StopTimeUpdate;
    const firstStopId = stopTimeUpdates[0]?.StopId || '';
    
    // Build stop timeline (Requirement 2.1) - merges static + realtime data
    const stops = buildStopTimeline(tripId, stopTimeUpdates, originStation, destinationStation);
    
    // Get current position (Requirement 2.3)
    const currentPosition = getDetailedPosition(tripId, vehiclePositions, stopTimeUpdates);
    
    // Get relevant alerts (Requirement 2.5)
    const stopIds = stopTimeUpdates.map(s => s.StopId);
    const relevantAlerts = filterRelevantAlerts(alerts, stopIds);
    
    // Build trip details
    const tripDetails: TripDetails = {
      tripId,
      vehicleId: tripUpdate.Id,
      trainNumber: tripId,
      trainType: getTrainType(tripId),
      direction: getDirectionFromStopId(firstStopId),
      routeId: tripUpdate.TripUpdate.Trip.RouteId || getRouteId(tripId),
      status: determineTripStatus(stopTimeUpdates),
      currentPosition,
      stops,
      alerts: relevantAlerts,
    };
    
    // Build response with metadata
    const dataSource = buildDataSource(
      tripUpdatesResult.source,
      vehiclePositionsResult.source,
      alertsResult.source,
      tripUpdatesResult.fallbackReason || vehiclePositionsResult.fallbackReason || alertsResult.fallbackReason,
      tripUpdatesResult.message || vehiclePositionsResult.message || alertsResult.message,
      tripUpdatesResult.source === 'realtime' ? tripUpdatesResult.timestamp : undefined
    );
    
    const response: TrainDetailsResponse = {
      trip: tripDetails,
      metadata: {
        timestamp: Date.now(),
        dataSource,
      },
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Train Details API Error:', error);
    
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
