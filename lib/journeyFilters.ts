import { Journey, TimeFilterMode } from './types';
import { calculateMinutesBeforeTarget } from './timeFilterUtils';

/**
 * Parses a time string (e.g., "8:30 AM", "12:45 PM") to a timestamp for the current day.
 * Returns the timestamp in milliseconds.
 */
export function parseTimeStringToTimestamp(timeString: string, referenceDate: Date = new Date()): number {
  const match = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return 0;
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const result = new Date(referenceDate);
  result.setHours(hours, minutes, 0, 0);
  return result.getTime();
}

/**
 * Gets the arrival timestamp for a journey at the destination.
 */
export function getArrivalTimestamp(journey: Journey, referenceDate: Date = new Date()): number {
  // Use predictedTime if available, otherwise scheduledTime
  const timeString = journey.destination.predictedTime || journey.destination.scheduledTime;
  return parseTimeStringToTimestamp(timeString, referenceDate);
}

/**
 * Gets the departure timestamp for a journey from the origin.
 */
export function getDepartureTimestamp(journey: Journey, referenceDate: Date = new Date()): number {
  // Use predictedTime if available, otherwise scheduledTime
  const timeString = journey.origin.predictedTime || journey.origin.scheduledTime;
  return parseTimeStringToTimestamp(timeString, referenceDate);
}

/**
 * Filters journeys by arrive_by constraint.
 * Returns only journeys that arrive at the destination at or before the target time.
 * 
 * **Feature: time-filters, Property 1: Arrive By Filter Correctness**
 * **Validates: Requirements 1.1**
 */
export function filterJourneysByArriveBy(
  journeys: Journey[],
  targetTimestamp: number,
  referenceDate: Date = new Date()
): Journey[] {
  return journeys.filter(journey => {
    const arrivalTimestamp = getArrivalTimestamp(journey, referenceDate);
    return arrivalTimestamp > 0 && arrivalTimestamp <= targetTimestamp;
  });
}

/**
 * Filters journeys by leave_by constraint.
 * Returns only journeys that depart from the origin at or before the target time.
 * 
 * **Feature: time-filters, Property 3: Leave By Filter Correctness**
 * **Validates: Requirements 2.1**
 */
export function filterJourneysByLeaveBy(
  journeys: Journey[],
  targetTimestamp: number,
  referenceDate: Date = new Date()
): Journey[] {
  return journeys.filter(journey => {
    const departureTimestamp = getDepartureTimestamp(journey, referenceDate);
    return departureTimestamp > 0 && departureTimestamp <= targetTimestamp;
  });
}

/**
 * Sorts journeys by the relevant time based on the filter mode.
 * - For arrive_by: sorts by arrival time in descending order (latest first)
 * - For leave_by: sorts by departure time in descending order (latest first)
 * - For no filter (undefined): sorts by departure time in ascending order (earliest first)
 * 
 * **Feature: time-filters, Property 2: Arrive By Sort Order**
 * **Feature: time-filters, Property 4: Leave By Sort Order**
 * **Feature: time-filters, Property 6: Default Sort Order Preservation**
 * **Validates: Requirements 1.2, 2.2, 3.3**
 */
export function sortJourneysByTimeFilter(
  journeys: Journey[],
  mode?: TimeFilterMode,
  referenceDate: Date = new Date()
): Journey[] {
  const sorted = [...journeys];

  if (mode === 'arrive_by') {
    // Sort by arrival time descending (latest arrival first)
    sorted.sort((a, b) => {
      const arrivalA = getArrivalTimestamp(a, referenceDate);
      const arrivalB = getArrivalTimestamp(b, referenceDate);
      return arrivalB - arrivalA;
    });
  } else if (mode === 'leave_by') {
    // Sort by departure time descending (latest departure first)
    sorted.sort((a, b) => {
      const departureA = getDepartureTimestamp(a, referenceDate);
      const departureB = getDepartureTimestamp(b, referenceDate);
      return departureB - departureA;
    });
  } else {
    // Default: sort by departure time ascending (earliest first)
    sorted.sort((a, b) => {
      const departureA = getDepartureTimestamp(a, referenceDate);
      const departureB = getDepartureTimestamp(b, referenceDate);
      return departureA - departureB;
    });
  }

  return sorted;
}

/**
 * Marks the best match journey (the one closest to the target time).
 * Also calculates and sets minutesBeforeTarget for each journey.
 * 
 * For arrive_by: best match is the journey with arrival closest to (but not after) target
 * For leave_by: best match is the journey with departure closest to (but not after) target
 * 
 * **Validates: Requirements 5.3, 5.4**
 */
export function markBestMatch(
  journeys: Journey[],
  mode: TimeFilterMode,
  targetTimestamp: number,
  referenceDate: Date = new Date()
): Journey[] {
  if (journeys.length === 0) {
    return [];
  }

  // Calculate minutesBeforeTarget for each journey
  const journeysWithMinutes = journeys.map(journey => {
    const relevantTimestamp = mode === 'arrive_by'
      ? getArrivalTimestamp(journey, referenceDate)
      : getDepartureTimestamp(journey, referenceDate);
    
    const minutesBeforeTarget = calculateMinutesBeforeTarget(relevantTimestamp, targetTimestamp);
    
    return {
      ...journey,
      minutesBeforeTarget,
      isBestMatch: false,
    };
  });

  // Find the journey with the smallest positive minutesBeforeTarget (closest to target)
  // Since journeys are already filtered to be <= target, all should have minutesBeforeTarget >= 0
  let bestMatchIndex = 0;
  let smallestMinutes = journeysWithMinutes[0]?.minutesBeforeTarget ?? Infinity;

  journeysWithMinutes.forEach((journey, index) => {
    if (journey.minutesBeforeTarget !== undefined && 
        journey.minutesBeforeTarget >= 0 && 
        journey.minutesBeforeTarget < smallestMinutes) {
      smallestMinutes = journey.minutesBeforeTarget;
      bestMatchIndex = index;
    }
  });

  // Mark the best match
  if (journeysWithMinutes.length > 0) {
    journeysWithMinutes[bestMatchIndex].isBestMatch = true;
  }

  return journeysWithMinutes;
}

/**
 * Applies time filtering to journeys based on the filter mode.
 * This is a convenience function that combines filtering, sorting, and marking best match.
 */
export function applyTimeFilter(
  journeys: Journey[],
  mode: TimeFilterMode,
  targetTimestamp: number,
  referenceDate: Date = new Date()
): Journey[] {
  // Step 1: Filter by the appropriate constraint
  const filtered = mode === 'arrive_by'
    ? filterJourneysByArriveBy(journeys, targetTimestamp, referenceDate)
    : filterJourneysByLeaveBy(journeys, targetTimestamp, referenceDate);

  // Step 2: Sort by the relevant time (descending)
  const sorted = sortJourneysByTimeFilter(filtered, mode, referenceDate);

  // Step 3: Mark best match and calculate minutes before target
  const marked = markBestMatch(sorted, mode, targetTimestamp, referenceDate);

  return marked;
}
