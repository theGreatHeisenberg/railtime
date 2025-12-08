/**
 * Static Schedule Generator
 * 
 * Generates trip data from static GTFS schedule files when real-time APIs are unavailable.
 * This module provides fallback functionality for the 3-tier fallback strategy.
 * 
 * Requirements: 6.1, 6.2
 */

import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import scheduleData from './schedule-data.json';
import tripStopsData from './trip-stops-data.json';
import stationsData from './stations.json';
import {
  CaltrainTripUpdate,
  CaltrainTripUpdatesResponse,
  Station,
  TrainType,
  Direction,
  Segment,
  SegmentStop,
} from './types';

// Type definitions for static data
type ScheduleData = Record<string, Record<string, number>>; // stopId -> minutes since midnight
type TripStopsData = Record<string, string[]>;

const schedule = scheduleData as ScheduleData;
const tripStops = tripStopsData as TripStopsData;
const stations = stationsData as Station[];

/**
 * Convert minutes since midnight to a Date object for today in Pacific Time
 * Uses date-fns-tz for proper timezone handling that works in all environments
 *
 * @param minutesSinceMidnight - Minutes since midnight (0-1439 for same day, >1440 for next day)
 * @returns Date object in UTC representing the time in Pacific timezone
 *
 * Examples:
 *   360 (6:00 AM) -> Date for 6:00 AM today in Pacific Time
 *   870 (2:30 PM) -> Date for 2:30 PM today in Pacific Time
 *   1500 (25:00) -> Date for 1:00 AM tomorrow in Pacific Time
 */
export function getTimestampForMinutes(minutesSinceMidnight: number): Date {
  // Get what "today" is in Pacific Time
  const nowInPacific = toZonedTime(new Date(), 'America/Los_Angeles');

  // Build the target time for today in Pacific timezone
  const pacificYear = nowInPacific.getFullYear();
  const pacificMonth = nowInPacific.getMonth();
  const pacificDate = nowInPacific.getDate();

  const hours = Math.floor(minutesSinceMidnight / 60);
  const minutes = minutesSinceMidnight % 60;

  // Create a Date object representing this time in Pacific timezone
  const localDate = new Date(pacificYear, pacificMonth, pacificDate, hours, minutes, 0, 0);

  // Convert from Pacific Time to UTC
  // This works consistently regardless of the server's timezone (local, Cloudflare, EST, etc.)
  return fromZonedTime(localDate, 'America/Los_Angeles');
}

/**
 * Format minutes since midnight as a human-readable time string
 *
 * @param minutesSinceMidnight - Minutes since midnight
 * @returns Formatted time string (e.g., "6:00 AM", "2:30 PM")
 */
export function formatMinutesAsTime(minutesSinceMidnight: number): string {
  const hours = Math.floor(minutesSinceMidnight / 60);
  const minutes = minutesSinceMidnight % 60;

  // Normalize for display (25:00 -> 1:00 AM next day)
  const normalizedHours = hours % 24;
  const period = normalizedHours >= 12 ? 'PM' : 'AM';
  const displayHours = normalizedHours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');

  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Get station info by stop ID
 */
export function getStationByStopId(stopId: string): Station | undefined {
  return stations.find(s => s.stop1 === stopId || s.stop2 === stopId);
}

/**
 * Get station name by stop ID
 */
export function getStationNameByStopId(stopId: string): string {
  const station = getStationByStopId(stopId);
  return station?.stopname ?? `Stop ${stopId}`;
}

/**
 * Determine train type from train number
 * 
 * Caltrain train number ranges:
 * - 100-199: Local (weekday)
 * - 200-299: Local (weekday)
 * - 300-399: Limited (weekday)
 * - 400-499: Limited (weekday)
 * - 500-599: Bullet (weekday express)
 * - 600-699: Local (weekend)
 * - 800-899: South County Connector (local)
 */
export function getTrainType(trainNumber: string): TrainType {
  // Remove M prefix if present (e.g., M119 -> 119)
  const cleanNumber = trainNumber.startsWith('M') ? trainNumber.substring(1) : trainNumber;
  const num = parseInt(cleanNumber, 10);
  
  // Bullet trains: 500-599 (must check BEFORE Limited range)
  if (num >= 500 && num < 600) return 'Bullet';
  
  // Limited trains: 300-499
  if (num >= 300 && num < 500) return 'Limited';
  
  // Local trains: everything else
  if (num >= 100 && num < 300) return 'Local';  // Weekday local
  if (num >= 600 && num < 700) return 'Local';  // Weekend local
  if (num >= 800 && num < 900) return 'Local';  // South County Connector
  
  return 'Local';
}

/**
 * Determine direction from stop ID (odd = NB, even = SB)
 */
export function getDirectionFromStopId(stopId: string): Direction {
  const num = parseInt(stopId, 10);
  return num % 2 !== 0 ? 'NB' : 'SB';
}

/**
 * Get route ID from train number
 */
export function getRouteId(trainNumber: string): string {
  const num = parseInt(trainNumber, 10);
  if (num >= 500 && num < 600) return 'Bullet';
  if (num >= 400 && num < 500) return 'Limited';
  return 'Local';
}


/**
 * Check if a trip ID is valid for the current day of week
 * 
 * Based on GTFS calendar:
 * - Weekday (Mon-Fri): 1XX, 4XX, 5XX series (NOT 6XX or M-prefix)
 * - Weekend (Sat-Sun): 6XX series
 * - 8XX series (South County Connector) runs on weekdays
 */
function isValidTripForToday(tripId: string): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Skip M-prefix trains (duplicate service pattern)
  if (tripId.startsWith('M')) {
    return false;
  }
  
  const numericId = parseInt(tripId, 10);
  
  if (isWeekend) {
    // Weekend: only 6XX series
    return numericId >= 600 && numericId < 700;
  } else {
    // Weekday: 1XX, 4XX, 5XX, 8XX series (NOT 6XX)
    return (
      (numericId >= 100 && numericId < 200) || // Local
      (numericId >= 400 && numericId < 500) || // Limited
      (numericId >= 500 && numericId < 600) || // Bullet
      (numericId >= 800 && numericId < 900)    // South County Connector
    );
  }
}

/**
 * Generate trip updates from static GTFS schedule data
 * 
 * This function creates a CaltrainTripUpdatesResponse structure from static schedule data,
 * filtering to only include trips that are currently active (within a reasonable time window).
 * Also filters by day of week to show only relevant trains.
 * 
 * @param windowMinutes - Time window in minutes to include trips (default: 120 minutes)
 * @returns CaltrainTripUpdatesResponse with trips from static schedule
 */
export function generateTripsFromStaticSchedule(
  windowMinutes: number = 120
): CaltrainTripUpdatesResponse {
  const now = new Date();
  const entities: CaltrainTripUpdate[] = [];
  
  // Iterate through all trips in the schedule
  for (const [tripId, stopTimes] of Object.entries(schedule)) {
    // Filter by day of week
    if (!isValidTripForToday(tripId)) continue;
    
    const tripStopIds = tripStops[tripId];
    if (!tripStopIds || tripStopIds.length === 0) continue;
    
    // Build stop time updates for this trip
    const stopTimeUpdates: Array<{
      StopId: string;
      Arrival?: { Time: number };
      Departure?: { Time: number };
    }> = [];
    
    let hasActiveStop = false;
    let firstStopId = tripStopIds[0];
    
    for (const stopId of tripStopIds) {
      const minutesSinceMidnight = stopTimes[stopId];
      if (minutesSinceMidnight === undefined) continue;

      const stopTime = getTimestampForMinutes(minutesSinceMidnight);
      const timestamp = Math.floor(stopTime.getTime() / 1000);
      
      // Check if this stop is within our time window
      const minutesFromNow = (stopTime.getTime() - now.getTime()) / (1000 * 60);
      if (minutesFromNow >= -30 && minutesFromNow <= windowMinutes) {
        hasActiveStop = true;
      }
      
      stopTimeUpdates.push({
        StopId: stopId,
        Arrival: { Time: timestamp },
        Departure: { Time: timestamp },
      });
    }
    
    // Only include trips that have at least one stop within the time window
    if (!hasActiveStop || stopTimeUpdates.length === 0) continue;
    
    // Determine direction from first stop
    const direction = getDirectionFromStopId(firstStopId);
    const directionId = direction === 'NB' ? 0 : 1;
    
    entities.push({
      Id: tripId,
      TripUpdate: {
        Trip: {
          TripId: tripId,
          RouteId: getRouteId(tripId),
          DirectionId: directionId,
        },
        StopTimeUpdate: stopTimeUpdates,
        Timestamp: Math.floor(now.getTime() / 1000),
      },
    });
  }
  
  return {
    Header: {
      Timestamp: Math.floor(now.getTime() / 1000),
    },
    Entities: entities,
  };
}

/**
 * Estimate train position from schedule times
 * 
 * When GPS data is unavailable, this function estimates the train's position
 * based on scheduled times and the current time.
 * 
 * @param tripId - The trip ID to estimate position for
 * @param currentTime - Current time (defaults to now)
 * @returns Segment with estimated position, or null if cannot be determined
 */
export function estimatePositionFromSchedule(
  tripId: string,
  currentTime: Date = new Date()
): Segment | null {
  const tripSchedule = schedule[tripId];
  const tripStopIds = tripStops[tripId];
  
  if (!tripSchedule || !tripStopIds || tripStopIds.length < 2) {
    return null;
  }
  
  // Find the two stops the train is between
  let previousStop: { stopId: string; time: Date } | null = null;
  let nextStop: { stopId: string; time: Date } | null = null;
  
  for (const stopId of tripStopIds) {
    const minutesSinceMidnight = tripSchedule[stopId];
    if (minutesSinceMidnight === undefined) continue;

    const stopTime = getTimestampForMinutes(minutesSinceMidnight);
    
    if (stopTime <= currentTime) {
      previousStop = { stopId, time: stopTime };
    } else if (!nextStop) {
      nextStop = { stopId, time: stopTime };
      break;
    }
  }
  
  // Handle edge cases
  if (!previousStop && nextStop) {
    // Train hasn't started yet - at first stop
    const station = getStationByStopId(nextStop.stopId);
    const segmentStop: SegmentStop = {
      stopId: nextStop.stopId,
      stopName: getStationNameByStopId(nextStop.stopId),
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
  
  if (previousStop && !nextStop) {
    // Train has completed its journey - at last stop
    const station = getStationByStopId(previousStop.stopId);
    const segmentStop: SegmentStop = {
      stopId: previousStop.stopId,
      stopName: getStationNameByStopId(previousStop.stopId),
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
  
  if (!previousStop || !nextStop) {
    return null;
  }
  
  // Calculate progress between stops
  const totalDuration = nextStop.time.getTime() - previousStop.time.getTime();
  const elapsed = currentTime.getTime() - previousStop.time.getTime();
  const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
  
  const fromStation = getStationByStopId(previousStop.stopId);
  const toStation = getStationByStopId(nextStop.stopId);
  
  return {
    from: {
      stopId: previousStop.stopId,
      stopName: getStationNameByStopId(previousStop.stopId),
      lat: fromStation?.lat,
      lon: fromStation?.lon,
    },
    to: {
      stopId: nextStop.stopId,
      stopName: getStationNameByStopId(nextStop.stopId),
      lat: toStation?.lat,
      lon: toStation?.lon,
    },
    progress,
    estimated: true,
  };
}

/**
 * Get all stop IDs for a trip
 */
export function getTripStopIds(tripId: string): string[] {
  return tripStops[tripId] || [];
}

/**
 * Get scheduled time for a stop on a trip (in minutes since midnight)
 */
export function getScheduledTime(tripId: string, stopId: string): number | undefined {
  return schedule[tripId]?.[stopId];
}

/**
 * Get all available trip IDs
 */
export function getAllTripIds(): string[] {
  return Object.keys(schedule);
}


/**
 * Get full static schedule for a trip
 * Returns all stops with their scheduled times
 */
export function getFullTripSchedule(tripId: string): Array<{ stopId: string; scheduledTime: string; timestamp: number }> {
  // Try with and without M prefix
  const normalizedId = tripId.startsWith('M') ? tripId.substring(1) : tripId;
  const stopIds = tripStops[tripId] || tripStops[normalizedId] || tripStops[`M${normalizedId}`] || [];
  const tripSchedule = schedule[tripId] || schedule[normalizedId] || schedule[`M${normalizedId}`] || {};
  
  const result: Array<{ stopId: string; scheduledTime: string; timestamp: number }> = [];

  for (const stopId of stopIds) {
    const minutesSinceMidnight = tripSchedule[stopId];
    if (minutesSinceMidnight !== undefined) {
      const time = getTimestampForMinutes(minutesSinceMidnight);
      const scheduledTime = formatMinutesAsTime(minutesSinceMidnight);
      result.push({
        stopId,
        scheduledTime,
        timestamp: Math.floor(time.getTime() / 1000),
      });
    }
  }

  return result;
}
