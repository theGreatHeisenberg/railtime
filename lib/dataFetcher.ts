/**
 * Data Fetcher with 3-Tier Fallback Support
 * 
 * This module provides unified data fetching with a 3-tier fallback strategy:
 * 1. Real-time API data (primary)
 * 2. Cached data (if < 5 minutes old)
 * 3. Static GTFS schedule data (last resort)
 * 
 * Requirements: 6.1, 6.2, 6.4, 10.1, 10.2, 10.3, 10.4
 */

import {
  CaltrainTripUpdatesResponse,
  VehiclePositionsResponse,
  VehiclePosition,
  CacheEntry,
  DataSource,
  ServiceStatusType,
  FallbackReason,
  ServiceAlert,
  Segment,
} from './types';
import {
  generateTripsFromStaticSchedule,
  estimatePositionFromSchedule,
} from './staticScheduleGenerator';

// Cache configuration
const TRIP_UPDATES_CACHE_TTL = 10 * 1000; // 10 seconds
const VEHICLE_POSITIONS_CACHE_TTL = 5 * 1000; // 5 seconds
const STALE_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes for fallback
const FETCH_TIMEOUT = 5 * 1000; // 5 seconds

// API endpoints
const TRIP_UPDATES_URL = 'https://www.caltrain.com/files/rt/tripupdates/CT.json';
const VEHICLE_POSITIONS_URL = 'https://www.caltrain.com/files/rt/vehiclepositions/CT.json';
const SERVICE_ALERTS_URL = 'https://www.caltrain.com/gtfs/api/v1/servicealerts/Caltrain';

// In-memory cache
interface DataFetcherCache {
  tripUpdates: CacheEntry<CaltrainTripUpdatesResponse> | null;
  vehiclePositions: CacheEntry<VehiclePositionsResponse> | null;
  serviceAlerts: CacheEntry<ServiceAlert[]> | null;
}

const cache: DataFetcherCache = {
  tripUpdates: null,
  vehiclePositions: null,
  serviceAlerts: null,
};

/**
 * Fetch with timeout utility
 * 
 * @param url - URL to fetch
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Response or throws on timeout/error
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}


/**
 * Check if cache entry is valid (within TTL)
 */
function isCacheValid<T>(entry: CacheEntry<T> | null, ttlMs: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttlMs;
}

/**
 * Check if cache entry is stale but usable for fallback (< 5 minutes old)
 */
function isCacheUsableForFallback<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < STALE_CACHE_MAX_AGE;
}

/**
 * Result type for data fetching operations
 * 
 * Source can be:
 * - 'realtime': Fresh data from real-time API
 * - 'cached': Stale but usable cached data (< 5 minutes old)
 * - 'static': Static GTFS schedule data
 * - 'unavailable': No data available
 */
export interface FetchResult<T> {
  data: T;
  source: ServiceStatusType | 'cached';
  timestamp: number;
  fallbackReason?: FallbackReason;
  message?: string;
}

/**
 * Get trip updates with 3-tier fallback
 * 
 * ALWAYS attempts real-time API first on every request to support automatic recovery.
 * Tries: real-time API → cached data → static schedule
 * 
 * Requirements: 11.1, 11.2 - Always attempt real-time first, automatic recovery
 * 
 * @returns Trip updates data with source information
 */
export async function getTripUpdatesWithFallback(): Promise<FetchResult<CaltrainTripUpdatesResponse>> {
  // ALWAYS try real-time API first on every request (Requirement 11.1)
  // This ensures automatic recovery when APIs come back online (Requirement 11.2)
  try {
    const response = await fetchWithTimeout(TRIP_UPDATES_URL);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data: CaltrainTripUpdatesResponse = await response.json();
    
    // Update cache on successful real-time fetch
    cache.tripUpdates = {
      data,
      timestamp: Date.now(),
    };
    
    return {
      data,
      source: 'realtime',
      timestamp: Date.now(),
    };
  } catch (error) {
    const fallbackReason: FallbackReason = 
      error instanceof Error && error.message === 'Request timeout' 
        ? 'timeout' 
        : 'api-down';
    
    // Try stale cache as fallback (Requirement 6.4 - cache priority before static)
    if (isCacheUsableForFallback(cache.tripUpdates)) {
      return {
        data: cache.tripUpdates!.data,
        source: 'cached', // Report as 'cached' for stale cache data
        timestamp: cache.tripUpdates!.timestamp,
        fallbackReason,
        message: 'Using cached data from ' + formatTimestamp(cache.tripUpdates!.timestamp),
      };
    }
    
    // Fall back to static schedule
    const staticData = generateTripsFromStaticSchedule();
    return {
      data: staticData,
      source: 'static',
      timestamp: Date.now(),
      fallbackReason,
      message: 'Real-time data unavailable. Showing scheduled times.',
    };
  }
}

/**
 * Get vehicle positions with fallback
 * 
 * ALWAYS attempts real-time API first on every request to support automatic recovery.
 * Tries: real-time API → cached data → position estimation from schedule
 * 
 * Requirements: 11.1, 11.2 - Always attempt real-time first, automatic recovery
 * 
 * @returns Vehicle positions data with source information
 */
export async function getVehiclePositionsWithFallback(): Promise<FetchResult<VehiclePositionsResponse>> {
  // ALWAYS try real-time API first on every request (Requirement 11.1)
  // This ensures automatic recovery when APIs come back online (Requirement 11.2)
  try {
    const response = await fetchWithTimeout(VEHICLE_POSITIONS_URL);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data: VehiclePositionsResponse = await response.json();
    
    // Update cache on successful real-time fetch
    cache.vehiclePositions = {
      data,
      timestamp: Date.now(),
    };
    
    return {
      data,
      source: 'realtime',
      timestamp: Date.now(),
    };
  } catch (error) {
    const fallbackReason: FallbackReason = 
      error instanceof Error && error.message === 'Request timeout' 
        ? 'timeout' 
        : 'api-down';
    
    // Try stale cache as fallback (Requirement 6.4 - cache priority before static)
    if (isCacheUsableForFallback(cache.vehiclePositions)) {
      return {
        data: cache.vehiclePositions!.data,
        source: 'cached', // Report as 'cached' for stale cache data
        timestamp: cache.vehiclePositions!.timestamp,
        fallbackReason,
        message: 'Using cached positions from ' + formatTimestamp(cache.vehiclePositions!.timestamp),
      };
    }
    
    // Return empty positions - estimation will be done per-trip
    return {
      data: {
        Header: { Timestamp: Math.floor(Date.now() / 1000) },
        Entities: [],
      },
      source: 'static',
      timestamp: Date.now(),
      fallbackReason,
      message: 'GPS positions unavailable. Positions are estimated from schedule.',
    };
  }
}


/**
 * Get service alerts
 * 
 * ALWAYS attempts real-time API first on every request to support automatic recovery.
 * Service alerts are optional and don't affect the main data source status.
 * 
 * Requirements: 11.1, 11.2 - Always attempt real-time first, automatic recovery
 * 
 * @returns Service alerts with source information
 */
export async function getServiceAlertsWithFallback(): Promise<FetchResult<ServiceAlert[]>> {
  // ALWAYS try real-time API first on every request (Requirement 11.1)
  // This ensures automatic recovery when APIs come back online (Requirement 11.2)
  try {
    const response = await fetchWithTimeout(SERVICE_ALERTS_URL);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse alerts from new Caltrain API format (array of alerts)
    const alerts: ServiceAlert[] = parseServiceAlertsFromArray(data);
    
    // Update cache on successful real-time fetch
    cache.serviceAlerts = {
      data: alerts,
      timestamp: Date.now(),
    };
    
    return {
      data: alerts,
      source: 'realtime',
      timestamp: Date.now(),
    };
  } catch (error) {
    const fallbackReason: FallbackReason = 
      error instanceof Error && error.message === 'Request timeout' 
        ? 'timeout' 
        : 'api-down';
    
    // Try stale cache as fallback (Requirement 6.4 - cache priority before static)
    if (isCacheUsableForFallback(cache.serviceAlerts)) {
      return {
        data: cache.serviceAlerts!.data,
        source: 'cached', // Report as 'cached' for stale cache data
        timestamp: cache.serviceAlerts!.timestamp,
        fallbackReason,
        message: 'Using cached alerts from ' + formatTimestamp(cache.serviceAlerts!.timestamp),
      };
    }
    
    // Return empty alerts
    return {
      data: [],
      source: 'unavailable',
      timestamp: Date.now(),
      fallbackReason,
      message: 'Service alerts unavailable.',
    };
  }
}

/**
 * Parse service alerts from new Caltrain API format (array of alerts)
 * API: https://www.caltrain.com/gtfs/api/v1/servicealerts/Caltrain
 */
function parseServiceAlertsFromArray(data: unknown): ServiceAlert[] {
  const alerts: ServiceAlert[] = [];
  
  try {
    // New API returns an array directly
    const alertArray = Array.isArray(data) ? data : [];
    
    for (const entity of alertArray) {
      const alert = entity?.Alert;
      if (!alert) continue;
      
      // Get English text from translations
      const getEnglishText = (textObj: { Translation?: Array<{ Text: string; Language: string }> }) => {
        const translations = textObj?.Translation || [];
        const english = translations.find(t => t.Language === 'en');
        return english?.Text || translations[0]?.Text || '';
      };
      
      const headerText = getEnglishText(alert.HeaderText) || 'Service Alert';
      const descriptionText = getEnglishText(alert.DescriptionText) || '';
      
      // Skip alerts with empty description
      if (!descriptionText.trim()) continue;
      
      // Determine severity from SeverityLevel or Cause
      let severity: 'info' | 'warning' | 'severe' = 'info';
      if (alert.SeverityLevel >= 4 || alert.Cause === 1) {
        severity = 'severe';
      } else if (alert.SeverityLevel >= 3 || alert.Cause === 3) {
        severity = 'warning';
      }
      
      // Extract affected stops
      const affectedStations: string[] = [];
      for (const informedEntity of alert.InformedEntity || []) {
        if (informedEntity.StopId) {
          affectedStations.push(informedEntity.StopId);
        }
      }
      
      alerts.push({
        id: String(entity.Id) || `alert-${Date.now()}`,
        severity,
        title: headerText || descriptionText.substring(0, 50),
        description: descriptionText,
        affectedStations: affectedStations.length > 0 ? affectedStations : undefined,
        startTime: alert.ActivePeriod?.[0]?.Start,
        endTime: alert.ActivePeriod?.[0]?.End,
      });
    }
  } catch {
    // Return empty array on parse error
  }
  
  return alerts;
}

/**
 * Get estimated position for a trip when GPS is unavailable
 */
export function getEstimatedPosition(tripId: string): Segment | null {
  return estimatePositionFromSchedule(tripId);
}

/**
 * Get vehicle position for a specific trip
 */
export function getVehiclePositionForTrip(
  tripId: string,
  positions: VehiclePosition[]
): VehiclePosition | undefined {
  return positions.find(p => p.Vehicle?.Trip?.TripId === tripId);
}

/**
 * Build combined data source information
 * 
 * Handles automatic recovery by properly reporting source types:
 * - 'realtime': Core sources (trip updates + vehicle positions) are real-time
 * - 'cached': Using stale but usable cached data for core sources
 * - 'mixed': Some core sources are real-time, others are fallback
 * - 'static': Using static GTFS schedule data for core sources
 * 
 * NOTE: Service alerts are OPTIONAL and don't affect the overall status.
 * They are decoupled from the main data source determination.
 * 
 * Requirements: 11.1, 11.2 - Support automatic recovery reporting
 */
export function buildDataSource(
  tripUpdatesSource: ServiceStatusType | 'cached',
  vehiclePositionsSource: ServiceStatusType | 'cached',
  serviceAlertsSource: ServiceStatusType | 'cached',
  fallbackReason?: FallbackReason,
  message?: string,
  lastRealtimeUpdate?: number
): DataSource {
  // Only consider core sources (trip updates + vehicle positions) for status
  // Service alerts are optional and don't affect the overall status
  const coreRealtime = 
    tripUpdatesSource === 'realtime' && 
    vehiclePositionsSource === 'realtime';
  
  const coreCached = 
    tripUpdatesSource === 'cached' || 
    vehiclePositionsSource === 'cached';
  
  const coreStatic = 
    tripUpdatesSource === 'static' && 
    vehiclePositionsSource === 'static';
  
  const coreUnavailable = 
    tripUpdatesSource === 'unavailable' || 
    vehiclePositionsSource === 'unavailable';
  
  // Determine overall data source type based on CORE sources only
  let type: DataSource['type'];
  if (coreRealtime) {
    type = 'realtime';
  } else if (coreCached && !coreStatic && !coreUnavailable) {
    type = 'cached';
  } else if (coreStatic || coreUnavailable) {
    type = 'static';
  } else {
    type = 'mixed';
  }
  
  // Map 'cached' back to 'static' for the sources breakdown (API compatibility)
  const mapSourceForApi = (source: ServiceStatusType | 'cached'): ServiceStatusType => {
    return source === 'cached' ? 'static' : source;
  };
  
  return {
    type,
    realtimeAvailable: tripUpdatesSource === 'realtime',
    fallbackReason: type !== 'realtime' ? fallbackReason : undefined,
    message: type !== 'realtime' ? message : undefined,
    lastRealtimeUpdate,
    sources: {
      tripUpdates: mapSourceForApi(tripUpdatesSource),
      vehiclePositions: mapSourceForApi(vehiclePositionsSource),
      serviceAlerts: mapSourceForApi(serviceAlertsSource),
    },
  };
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Clear all caches (useful for testing)
 */
export function clearCache(): void {
  cache.tripUpdates = null;
  cache.vehiclePositions = null;
  cache.serviceAlerts = null;
}

/**
 * Get cache status (useful for debugging)
 */
export function getCacheStatus(): {
  tripUpdates: { valid: boolean; age: number | null };
  vehiclePositions: { valid: boolean; age: number | null };
  serviceAlerts: { valid: boolean; age: number | null };
} {
  const now = Date.now();
  return {
    tripUpdates: {
      valid: isCacheValid(cache.tripUpdates, TRIP_UPDATES_CACHE_TTL),
      age: cache.tripUpdates ? now - cache.tripUpdates.timestamp : null,
    },
    vehiclePositions: {
      valid: isCacheValid(cache.vehiclePositions, VEHICLE_POSITIONS_CACHE_TTL),
      age: cache.vehiclePositions ? now - cache.vehiclePositions.timestamp : null,
    },
    serviceAlerts: {
      valid: cache.serviceAlerts !== null,
      age: cache.serviceAlerts ? now - cache.serviceAlerts.timestamp : null,
    },
  };
}
