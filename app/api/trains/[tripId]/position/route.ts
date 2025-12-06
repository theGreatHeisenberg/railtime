/**
 * Train Position API
 * 
 * Endpoint: GET /api/trains/:tripId/position
 * 
 * Returns the current position of a specific train including:
 * - Current segment with from/to stations and progress percentage
 * - Journey context when origin/destination provided
 * - Position marked as estimated when GPS unavailable
 * 
 * Requirements: 3.1, 3.2, 3.4
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTripUpdatesWithFallback,
  getVehiclePositionsWithFallback,
  buildDataSource,
  getEstimatedPosition,
} from '@/lib/dataFetcher';
import {
  getStationNameByStopId,
  getStationByStopId,
} from '@/lib/staticScheduleGenerator';
import {
  PositionResponse,
  TrainPosition,
  Segment,
  JourneyContext,
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
 * Find trip update by trip ID
 */
function findTripUpdate(
  entities: CaltrainTripUpdate[],
  tripId: string
): CaltrainTripUpdate | undefined {
  return entities.find(e => e.TripUpdate?.Trip?.TripId === tripId);
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Threshold distance (in km) to consider train "at" a station
 * ~200 meters accounts for platform length and GPS accuracy
 */
const AT_STATION_THRESHOLD_KM = 0.2;

/**
 * Find which segment the train is in based on GPS coordinates
 * Returns the index of the "from" station, or -1 if before first stop
 * 
 * Algorithm:
 * 1. Find the closest station to the train
 * 2. If train is within threshold of a station, it's "at" that station
 * 3. Otherwise, find which two consecutive stations the train is between
 */
function findSegmentByGPS(
  trainLat: number,
  trainLon: number,
  stopTimeUpdates: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate']
): { fromIndex: number; toIndex: number; progress: number; atStation: boolean } | null {
  
  // Build array of stations with coordinates
  const stationsWithCoords: Array<{
    index: number;
    stopId: string;
    lat: number;
    lon: number;
    distance: number;
  }> = [];
  
  for (let i = 0; i < stopTimeUpdates.length; i++) {
    const station = getStationByStopId(stopTimeUpdates[i].StopId);
    if (station?.lat && station?.lon) {
      const distance = calculateDistance(trainLat, trainLon, station.lat, station.lon);
      stationsWithCoords.push({
        index: i,
        stopId: stopTimeUpdates[i].StopId,
        lat: station.lat,
        lon: station.lon,
        distance,
      });
    }
  }
  
  if (stationsWithCoords.length < 2) return null;
  
  // Find closest station
  const closestStation = stationsWithCoords.reduce((min, s) => 
    s.distance < min.distance ? s : min
  );
  
  // Check if train is "at" the closest station
  if (closestStation.distance < AT_STATION_THRESHOLD_KM) {
    // Find the next station in the route (if any)
    const nextStationIndex = closestStation.index + 1;
    const hasNextStation = nextStationIndex < stopTimeUpdates.length;
    
    return {
      fromIndex: closestStation.index,
      // If at a station, set "to" as the next station so UI can show where train is heading
      toIndex: hasNextStation ? nextStationIndex : closestStation.index,
      progress: 0, // At the "from" station, 0% progress toward "to"
      atStation: true,
    };
  }
  
  // Find which segment the train is in by checking each consecutive pair
  // The train is in segment [i, i+1] if it's closest to the line between those stations
  let bestSegment: { fromIndex: number; toIndex: number; progress: number } | null = null;
  let bestScore = Infinity;
  
  for (let i = 0; i < stationsWithCoords.length - 1; i++) {
    const from = stationsWithCoords[i];
    const to = stationsWithCoords[i + 1];
    
    // Skip if stations are not consecutive in the route
    if (to.index !== from.index + 1) continue;
    
    const segmentDistance = calculateDistance(from.lat, from.lon, to.lat, to.lon);
    const distFromStart = calculateDistance(from.lat, from.lon, trainLat, trainLon);
    const distToEnd = calculateDistance(trainLat, trainLon, to.lat, to.lon);
    
    // Calculate progress along this segment (0-1)
    // Using ratio of distance from start to total segment distance
    let progress = segmentDistance > 0 ? distFromStart / segmentDistance : 0;
    progress = Math.max(0, Math.min(1, progress));
    
    // Score: how well does this segment explain the train's position?
    // Lower is better - ideally distFromStart + distToEnd ≈ segmentDistance
    const deviation = Math.abs((distFromStart + distToEnd) - segmentDistance);
    
    // Also consider if train is roughly between the two stations
    // (not way off to the side)
    if (deviation < bestScore && distFromStart <= segmentDistance * 1.2 && distToEnd <= segmentDistance * 1.2) {
      bestScore = deviation;
      bestSegment = {
        fromIndex: from.index,
        toIndex: to.index,
        progress,
      };
    }
  }
  
  if (bestSegment) {
    return { ...bestSegment, atStation: false };
  }
  
  return null;
}

/**
 * Calculate current segment from vehicle position and stop times
 * 
 * Uses GPS-based segment detection when available:
 * 1. If GPS available: Find which segment train is in by comparing coordinates
 * 2. If GPS unavailable: Fall back to time-based estimation
 * 
 * Requirement 3.1: Return current segment with from/to stations and progress
 * Requirement 3.4: Mark position as estimated when GPS unavailable
 */
function calculateCurrentSegment(
  tripId: string,
  vehiclePositions: VehiclePosition[],
  stopTimeUpdates: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate']
): Segment {
  const now = Date.now();
  
  // Try to find real-time GPS position
  const vehiclePosition = vehiclePositions.find(
    p => p.Vehicle?.Trip?.TripId === tripId
  );
  
  // ========== GPS-BASED SEGMENT DETECTION (Primary) ==========
  if (vehiclePosition) {
    const trainLat = vehiclePosition.Vehicle.Position.Latitude;
    const trainLon = vehiclePosition.Vehicle.Position.Longitude;
    
    const gpsSegment = findSegmentByGPS(trainLat, trainLon, stopTimeUpdates);
    
    if (gpsSegment) {
      const fromStop = stopTimeUpdates[gpsSegment.fromIndex];
      const toStop = stopTimeUpdates[gpsSegment.toIndex];
      const fromStation = getStationByStopId(fromStop.StopId);
      const toStation = getStationByStopId(toStop.StopId);
      
      // If train is at a station, from is current station, to is next station
      // This allows UI to show "At [from], heading to [to]"
      if (gpsSegment.atStation) {
        return {
          from: {
            stopId: fromStop.StopId,
            stopName: getStationNameByStopId(fromStop.StopId),
            lat: fromStation?.lat,
            lon: fromStation?.lon,
          },
          to: {
            stopId: toStop.StopId,
            stopName: getStationNameByStopId(toStop.StopId),
            lat: toStation?.lat,
            lon: toStation?.lon,
          },
          progress: 0, // At the "from" station
          estimated: false,
        };
      }
      
      return {
        from: {
          stopId: fromStop.StopId,
          stopName: getStationNameByStopId(fromStop.StopId),
          lat: fromStation?.lat,
          lon: fromStation?.lon,
        },
        to: {
          stopId: toStop.StopId,
          stopName: getStationNameByStopId(toStop.StopId),
          lat: toStation?.lat,
          lon: toStation?.lon,
        },
        progress: gpsSegment.progress,
        estimated: false,
      };
    }
  }
  
  // ========== TIME-BASED FALLBACK (Secondary) ==========
  // Find last passed stop and next stop based on predicted times
  let lastPassedIndex = -1;
  
  for (let i = 0; i < stopTimeUpdates.length; i++) {
    const stopTime = (stopTimeUpdates[i].Departure?.Time || stopTimeUpdates[i].Arrival?.Time || 0) * 1000;
    if (stopTime <= now) {
      lastPassedIndex = i;
    } else {
      break;
    }
  }
  
  // Handle edge cases
  if (lastPassedIndex === -1) {
    // Train hasn't started yet - at first stop
    const firstStop = stopTimeUpdates[0];
    const station = getStationByStopId(firstStop.StopId);
    const segmentStop = {
      stopId: firstStop.StopId,
      stopName: getStationNameByStopId(firstStop.StopId),
      lat: station?.lat,
      lon: station?.lon,
    };
    return {
      from: segmentStop,
      to: segmentStop,
      progress: 0,
      estimated: true,
    };
  }
  
  if (lastPassedIndex >= stopTimeUpdates.length - 1) {
    // Train has completed its journey - at last stop
    const lastStop = stopTimeUpdates[stopTimeUpdates.length - 1];
    const station = getStationByStopId(lastStop.StopId);
    const segmentStop = {
      stopId: lastStop.StopId,
      stopName: getStationNameByStopId(lastStop.StopId),
      lat: station?.lat,
      lon: station?.lon,
    };
    return {
      from: segmentStop,
      to: segmentStop,
      progress: 1,
      estimated: true,
    };
  }
  
  // Train is between two stops - calculate time-based progress
  const fromStop = stopTimeUpdates[lastPassedIndex];
  const toStop = stopTimeUpdates[lastPassedIndex + 1];
  const fromStation = getStationByStopId(fromStop.StopId);
  const toStation = getStationByStopId(toStop.StopId);
  
  const fromTime = (fromStop.Departure?.Time || fromStop.Arrival?.Time || 0) * 1000;
  const toTime = (toStop.Arrival?.Time || toStop.Departure?.Time || 0) * 1000;
  const totalDuration = toTime - fromTime;
  
  let progress = 0;
  if (totalDuration > 0) {
    progress = Math.max(0, Math.min(1, (now - fromTime) / totalDuration));
  }
  
  return {
    from: {
      stopId: fromStop.StopId,
      stopName: getStationNameByStopId(fromStop.StopId),
      lat: fromStation?.lat,
      lon: fromStation?.lon,
    },
    to: {
      stopId: toStop.StopId,
      stopName: getStationNameByStopId(toStop.StopId),
      lat: toStation?.lat,
      lon: toStation?.lon,
    },
    progress,
    estimated: true,
  };
}

/**
 * Calculate journey context when origin/destination provided
 * Requirement 3.2: Include journey context with station counts
 */
function calculateJourneyContext(
  stopTimeUpdates: CaltrainTripUpdate['TripUpdate']['StopTimeUpdate'],
  originStation: Station,
  destinationStation: Station
): JourneyContext | null {
  // Find origin and destination indices
  const originIndex = stopTimeUpdates.findIndex(s => 
    stopBelongsToStation(s.StopId, originStation)
  );
  const destinationIndex = stopTimeUpdates.findIndex(s => 
    stopBelongsToStation(s.StopId, destinationStation)
  );
  
  // Validate that both stations are found and in correct order
  if (originIndex === -1 || destinationIndex === -1 || originIndex >= destinationIndex) {
    return null;
  }
  
  const totalStops = stopTimeUpdates.length;
  
  // Calculate station counts
  // stationsUntilOrigin: stops before origin (not including origin)
  const stationsUntilOrigin = originIndex;
  
  // stationsBetweenOriginAndDestination: stops between origin and destination (not including origin and destination)
  const stationsBetweenOriginAndDestination = destinationIndex - originIndex - 1;
  
  // stationsAfterDestination: stops after destination (not including destination)
  const stationsAfterDestination = totalStops - destinationIndex - 1;
  
  return {
    stationsUntilOrigin,
    stationsBetweenOriginAndDestination,
    stationsAfterDestination,
  };
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
    const [tripUpdatesResult, vehiclePositionsResult] = await Promise.all([
      getTripUpdatesWithFallback(),
      getVehiclePositionsWithFallback(),
    ]);
    
    const tripUpdates = tripUpdatesResult.data;
    const vehiclePositions = vehiclePositionsResult.data.Entities || [];
    
    // Find the specific trip
    const tripUpdate = findTripUpdate(tripUpdates.Entities || [], tripId);
    
    if (!tripUpdate) {
      // Try to get estimated position from static schedule
      const estimatedSegment = getEstimatedPosition(tripId);
      
      if (estimatedSegment) {
        // Return estimated position from static schedule
        const position: TrainPosition = {
          tripId,
          trainNumber: tripId,
          currentSegment: estimatedSegment,
          journeyContext: originStation && destinationStation 
            ? undefined // Can't calculate without stop time updates
            : undefined,
        };
        
        const response: PositionResponse = {
          position,
          metadata: {
            timestamp: Date.now(),
            dataSource: {
              type: 'static',
              realtimeAvailable: false,
              fallbackReason: 'api-down',
              message: 'Position estimated from schedule. Real-time data unavailable.',
              sources: {
                tripUpdates: 'static',
                vehiclePositions: 'static',
                serviceAlerts: 'unavailable',
              },
            },
          },
        };
        
        return NextResponse.json(response);
      }
      
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
                serviceAlerts: 'unavailable',
              },
            },
          },
        },
        { status: 404 }
      );
    }
    
    const stopTimeUpdates = tripUpdate.TripUpdate.StopTimeUpdate;
    
    // Calculate current segment (Requirement 3.1, 3.4)
    const currentSegment = calculateCurrentSegment(tripId, vehiclePositions, stopTimeUpdates);
    
    // Calculate journey context if origin/destination provided (Requirement 3.2)
    let journeyContext: JourneyContext | undefined;
    if (originStation && destinationStation) {
      const context = calculateJourneyContext(stopTimeUpdates, originStation, destinationStation);
      if (context) {
        journeyContext = context;
      }
    }
    
    // Build position response
    const position: TrainPosition = {
      tripId,
      trainNumber: tripId,
      currentSegment,
      journeyContext,
    };
    
    // Build response with metadata
    const dataSource = buildDataSource(
      tripUpdatesResult.source,
      vehiclePositionsResult.source,
      'unavailable', // We don't fetch alerts for position endpoint
      tripUpdatesResult.fallbackReason || vehiclePositionsResult.fallbackReason,
      tripUpdatesResult.message || vehiclePositionsResult.message,
      tripUpdatesResult.source === 'realtime' ? tripUpdatesResult.timestamp : undefined
    );
    
    const response: PositionResponse = {
      position,
      metadata: {
        timestamp: Date.now(),
        dataSource,
      },
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Train Position API Error:', error);
    
    // Try to get estimated position as last resort
    const estimatedSegment = getEstimatedPosition(tripId);
    
    if (estimatedSegment) {
      const position: TrainPosition = {
        tripId,
        trainNumber: tripId,
        currentSegment: estimatedSegment,
      };
      
      const response: PositionResponse = {
        position,
        metadata: {
          timestamp: Date.now(),
          dataSource: {
            type: 'static',
            realtimeAvailable: false,
            fallbackReason: 'error',
            message: 'Position estimated from schedule due to error.',
            sources: {
              tripUpdates: 'static',
              vehiclePositions: 'static',
              serviceAlerts: 'unavailable',
            },
          },
        },
      };
      
      return NextResponse.json(response);
    }
    
    return NextResponse.json(
      {
        error: 'No data available',
        message: 'Unable to fetch train position. Please try again.',
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
