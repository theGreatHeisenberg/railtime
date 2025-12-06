/**
 * System Status API
 * 
 * Endpoint: GET /api/system/status
 * 
 * Returns system-wide service alerts and health status.
 * Aggregates data from all Caltrain APIs to provide a unified status view.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { NextResponse } from 'next/server';
import {
  getTripUpdatesWithFallback,
  getVehiclePositionsWithFallback,
  getServiceAlertsWithFallback,
  buildDataSource,
} from '@/lib/dataFetcher';
import {
  SystemStatusResponse,
  SystemHealth,
  ServiceStatus,
  ApiStatusType,
  ServiceStatusType,
} from '@/lib/types';

/**
 * Convert ServiceStatusType (including 'cached') to ServiceStatus for health reporting
 * 
 * Requirements: 11.1, 11.2 - Support automatic recovery reporting
 */
function toServiceStatus(status: ServiceStatusType | 'cached'): ServiceStatus {
  switch (status) {
    case 'realtime':
      return 'up';
    case 'cached':
      return 'degraded'; // Cached data indicates API was down but we have recent data
    case 'static':
      return 'degraded';
    case 'unavailable':
      return 'down';
    default:
      return 'down';
  }
}

/**
 * Determine overall API status based on individual service statuses
 * 
 * - operational: All APIs are returning realtime data
 * - degraded: At least one API is down, cached, or returning static data
 * - down: All APIs are unavailable
 * 
 * Requirements: 5.3, 5.4, 11.1, 11.2 - Support automatic recovery reporting
 */
function determineApiStatus(
  tripUpdatesStatus: ServiceStatusType | 'cached',
  vehiclePositionsStatus: ServiceStatusType | 'cached',
  serviceAlertsStatus: ServiceStatusType | 'cached'
): ApiStatusType {
  const statuses = [tripUpdatesStatus, vehiclePositionsStatus, serviceAlertsStatus];
  
  // All unavailable = down
  if (statuses.every(s => s === 'unavailable')) {
    return 'down';
  }
  
  // All realtime = operational (automatic recovery complete)
  if (statuses.every(s => s === 'realtime')) {
    return 'operational';
  }
  
  // Any mix (including cached) = degraded
  return 'degraded';
}

/**
 * Calculate data freshness in seconds
 * Returns the age of the most recent data update
 */
function calculateDataFreshness(timestamps: number[]): number {
  const validTimestamps = timestamps.filter(t => t > 0);
  if (validTimestamps.length === 0) return -1;
  
  const mostRecent = Math.max(...validTimestamps);
  return Math.round((Date.now() - mostRecent) / 1000);
}

export async function GET(): Promise<NextResponse> {
  try {
    // Fetch data from all sources in parallel
    const [tripUpdatesResult, vehiclePositionsResult, serviceAlertsResult] = await Promise.all([
      getTripUpdatesWithFallback(),
      getVehiclePositionsWithFallback(),
      getServiceAlertsWithFallback(),
    ]);

    // Count active trains from trip updates
    const activeTrains = tripUpdatesResult.data.Entities?.length || 0;

    // Calculate data freshness from the most recent timestamp
    const dataFreshness = calculateDataFreshness([
      tripUpdatesResult.timestamp,
      vehiclePositionsResult.timestamp,
      serviceAlertsResult.timestamp,
    ]);

    // Determine overall API status (Requirement 5.3, 5.4)
    const apiStatus = determineApiStatus(
      tripUpdatesResult.source,
      vehiclePositionsResult.source,
      serviceAlertsResult.source
    );

    // Build system health object (Requirement 5.2)
    const systemHealth: SystemHealth = {
      activeTrains,
      dataFreshness,
      apiStatus,
      services: {
        tripUpdates: toServiceStatus(tripUpdatesResult.source),
        vehiclePositions: toServiceStatus(vehiclePositionsResult.source),
        serviceAlerts: toServiceStatus(serviceAlertsResult.source),
      },
    };

    // Build data source metadata
    const dataSource = buildDataSource(
      tripUpdatesResult.source,
      vehiclePositionsResult.source,
      serviceAlertsResult.source,
      tripUpdatesResult.fallbackReason || 
        vehiclePositionsResult.fallbackReason || 
        serviceAlertsResult.fallbackReason,
      tripUpdatesResult.message || 
        vehiclePositionsResult.message || 
        serviceAlertsResult.message,
      tripUpdatesResult.source === 'realtime' ? tripUpdatesResult.timestamp : undefined
    );

    // Build response (Requirement 5.1)
    const response: SystemStatusResponse = {
      alerts: serviceAlertsResult.data,
      systemHealth,
      metadata: {
        timestamp: Date.now(),
        dataSource,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('System Status API Error:', error);

    // Return error response with unavailable status
    return NextResponse.json(
      {
        error: 'Unable to fetch system status',
        message: 'Failed to retrieve system status information. Please try again.',
        suggestions: [
          'Retry in a few seconds',
          'Visit caltrain.com for service alerts',
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
      { status: 500 }
    );
  }
}
