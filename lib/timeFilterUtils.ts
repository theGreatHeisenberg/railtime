import { TimeFilterMode, TimeFilterValidation, ValidatedTimeFilter } from './types';

/**
 * Quick select time option for the time picker
 */
export interface QuickSelectTime {
  hour: number;
  minute: number;
  label: string;
  disabled: boolean;
}

/**
 * Default quick select times (common commute times)
 */
const QUICK_SELECT_HOURS = [
  { hour: 9, label: '9 AM' },
  { hour: 12, label: '12 PM' },
  { hour: 17, label: '5 PM' },
  { hour: 18, label: '6 PM' },
];

/**
 * Parses a target time from either ISO 8601 format or Unix timestamp.
 * Returns the timestamp in milliseconds, or null if invalid.
 */
export function parseTargetTime(targetTime: string | number): number | null {
  if (typeof targetTime === 'number') {
    // Unix timestamp - could be seconds or milliseconds
    // If less than year 2000 in ms, assume it's in seconds
    if (targetTime < 946684800000) {
      return targetTime * 1000;
    }
    return targetTime;
  }

  if (typeof targetTime === 'string') {
    // Try parsing as number first (string representation of timestamp)
    const numericValue = Number(targetTime);
    if (!isNaN(numericValue) && numericValue > 0) {
      // Same logic as above for seconds vs milliseconds
      if (numericValue < 946684800000) {
        return numericValue * 1000;
      }
      return numericValue;
    }

    // Try parsing as ISO 8601 date string
    const date = new Date(targetTime);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  return null;
}


/**
 * Checks if a given timestamp is in the future relative to the current time.
 */
export function isTimeInFuture(timestamp: number, now: number = Date.now()): boolean {
  return timestamp > now;
}

/**
 * Validates time filter parameters from API request.
 * Returns a validation result with either the validated filter or an error.
 */
export function validateTimeFilterParams(
  timeFilter?: string,
  targetTime?: string | number,
  now: number = Date.now()
): TimeFilterValidation {
  // If no timeFilter provided, no validation needed
  if (!timeFilter) {
    return { valid: false, error: 'No time filter specified', code: 400 };
  }

  // Validate timeFilter value
  if (timeFilter !== 'arrive_by' && timeFilter !== 'leave_by') {
    return {
      valid: false,
      error: "timeFilter must be 'arrive_by' or 'leave_by'",
      code: 400,
    };
  }

  // Check if targetTime is provided
  if (targetTime === undefined || targetTime === null || targetTime === '') {
    return {
      valid: false,
      error: 'targetTime is required when timeFilter is specified',
      code: 400,
    };
  }

  // Parse and validate targetTime format
  const parsedTime = parseTargetTime(targetTime);
  if (parsedTime === null) {
    return {
      valid: false,
      error: 'targetTime must be ISO 8601 format or Unix timestamp',
      code: 400,
    };
  }

  // Check if targetTime is in the future
  if (!isTimeInFuture(parsedTime, now)) {
    return {
      valid: false,
      error: 'targetTime must be in the future',
      code: 400,
    };
  }

  return {
    valid: true,
    filter: {
      mode: timeFilter as TimeFilterMode,
      targetTimestamp: parsedTime,
    },
  };
}

/**
 * Calculates the number of minutes between a journey time and the target time.
 * Returns a positive number representing minutes before the target.
 */
export function calculateMinutesBeforeTarget(
  journeyTimestamp: number,
  targetTimestamp: number
): number {
  const diffMs = targetTimestamp - journeyTimestamp;
  return Math.round(diffMs / 60000);
}

/**
 * Gets the next hour rounded up from the given time.
 * For example, 2:45 PM → 3:00 PM, 3:00 PM → 4:00 PM
 */
export function getNextHourRoundedUp(now: Date = new Date()): Date {
  const result = new Date(now);
  result.setMinutes(0, 0, 0);
  result.setHours(result.getHours() + 1);
  return result;
}

/**
 * Gets quick select time options, filtering out times that are in the past.
 * Returns only times that are in the future relative to the current time.
 */
export function getFutureQuickSelectTimes(now: Date = new Date()): QuickSelectTime[] {
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  return QUICK_SELECT_HOURS.map(({ hour, label }) => {
    // A time is in the future if its hour is greater than current hour,
    // or if equal hour but we're at minute 0 (edge case)
    const isFuture = hour > currentHour || (hour === currentHour && currentMinutes === 0);
    
    return {
      hour,
      minute: 0,
      label,
      disabled: !isFuture,
    };
  }).filter(time => !time.disabled);
}

/**
 * Formats a timestamp as a human-readable time string.
 */
export function formatTimeForDisplay(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
