/**
 * Response Helpers
 * 
 * Provides consistent response formatting utilities for all API endpoints.
 * Ensures all responses include proper metadata with timestamp and dataSource.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 9.1, 9.2
 */

import {
  DataSource,
  DataSourceType,
  FallbackReason,
  ResponseMetadata,
  ServiceStatusType,
  ErrorResponse,
} from './types';

/**
 * Creates a ResponseMetadata object with timestamp and dataSource
 * 
 * Requirements: 7.1, 9.1 - All responses include metadata with timestamp and dataSource
 */
export function createMetadata(dataSource: DataSource): ResponseMetadata {
  return {
    timestamp: Date.now(),
    dataSource,
  };
}

/**
 * Creates a DataSource object for realtime data
 * 
 * Requirements: 7.1 - dataSource type as "realtime"
 */
export function createRealtimeDataSource(): DataSource {
  return {
    type: 'realtime',
    realtimeAvailable: true,
    sources: {
      tripUpdates: 'realtime',
      vehiclePositions: 'realtime',
      serviceAlerts: 'realtime',
    },
  };
}

/**
 * Creates a DataSource object for static/fallback data
 * 
 * Requirements: 7.2 - Non-realtime includes fallbackReason and message
 */
export function createStaticDataSource(
  fallbackReason: FallbackReason = 'api-down',
  message: string = 'Showing scheduled times. Real-time data is temporarily unavailable.'
): DataSource {
  return {
    type: 'static',
    realtimeAvailable: false,
    fallbackReason,
    message,
    sources: {
      tripUpdates: 'static',
      vehiclePositions: 'static',
      serviceAlerts: 'static',
    },
  };
}

/**
 * Creates a DataSource object for cached data
 * 
 * Requirements: 7.4 - Cached data includes timestamp of last successful update
 */
export function createCachedDataSource(
  lastRealtimeUpdate: number,
  fallbackReason: FallbackReason = 'api-down',
  message: string = 'Showing cached data. Real-time data is temporarily unavailable.'
): DataSource {
  return {
    type: 'cached',
    realtimeAvailable: false,
    fallbackReason,
    message,
    lastRealtimeUpdate,
    sources: {
      tripUpdates: 'realtime',
      vehiclePositions: 'realtime',
      serviceAlerts: 'realtime',
    },
  };
}

/**
 * Creates a DataSource object for mixed data sources
 * 
 * Requirements: 7.3 - Mixed sources specify individual source statuses
 */
export function createMixedDataSource(
  sources: {
    tripUpdates: ServiceStatusType;
    vehiclePositions: ServiceStatusType;
    serviceAlerts: ServiceStatusType;
  },
  fallbackReason?: FallbackReason,
  message?: string,
  lastRealtimeUpdate?: number
): DataSource {
  const hasRealtime = Object.values(sources).some(s => s === 'realtime');
  
  return {
    type: 'mixed',
    realtimeAvailable: hasRealtime,
    fallbackReason,
    message: message || 'Some data sources are using fallback data.',
    lastRealtimeUpdate,
    sources,
  };
}

/**
 * Creates a DataSource object for unavailable data
 * 
 * Requirements: 9.2 - Error responses have dataSource showing unavailable status
 */
export function createUnavailableDataSource(
  fallbackReason: FallbackReason = 'error'
): DataSource {
  return {
    type: 'unavailable',
    realtimeAvailable: false,
    fallbackReason,
    sources: {
      tripUpdates: 'unavailable',
      vehiclePositions: 'unavailable',
      serviceAlerts: 'unavailable',
    },
  };
}

/**
 * Builds a DataSource object based on individual service statuses
 * 
 * Determines the overall type based on the combination of sources:
 * - All realtime → "realtime"
 * - All static → "static"
 * - All unavailable → "unavailable"
 * - Mix → "mixed"
 * 
 * Requirements: 7.1, 7.2, 7.3
 */
export function buildDataSourceFromServices(
  tripUpdatesStatus: ServiceStatusType,
  vehiclePositionsStatus: ServiceStatusType,
  serviceAlertsStatus: ServiceStatusType,
  fallbackReason?: FallbackReason,
  message?: string,
  lastRealtimeUpdate?: number
): DataSource {
  const sources = {
    tripUpdates: tripUpdatesStatus,
    vehiclePositions: vehiclePositionsStatus,
    serviceAlerts: serviceAlertsStatus,
  };
  
  const statuses = [tripUpdatesStatus, vehiclePositionsStatus, serviceAlertsStatus];
  
  // Determine overall type
  let type: DataSourceType;
  if (statuses.every(s => s === 'realtime')) {
    type = 'realtime';
  } else if (statuses.every(s => s === 'unavailable')) {
    type = 'unavailable';
  } else if (statuses.every(s => s === 'static')) {
    type = 'static';
  } else {
    type = 'mixed';
  }
  
  const realtimeAvailable = statuses.some(s => s === 'realtime');
  
  const dataSource: DataSource = {
    type,
    realtimeAvailable,
    sources,
  };
  
  // Add fallback info for non-realtime sources (Requirement 7.2)
  if (type !== 'realtime') {
    dataSource.fallbackReason = fallbackReason;
    dataSource.message = message || getDefaultFallbackMessage(type);
  }
  
  // Add last realtime update for cached data (Requirement 7.4)
  if (lastRealtimeUpdate) {
    dataSource.lastRealtimeUpdate = lastRealtimeUpdate;
  }
  
  return dataSource;
}

/**
 * Get default fallback message based on data source type
 */
function getDefaultFallbackMessage(type: DataSourceType): string {
  switch (type) {
    case 'static':
      return 'Showing scheduled times. Real-time data is temporarily unavailable.';
    case 'cached':
      return 'Showing cached data. Real-time data is temporarily unavailable.';
    case 'mixed':
      return 'Some data sources are using fallback data.';
    case 'unavailable':
      return 'Unable to retrieve data. Please try again later.';
    default:
      return '';
  }
}

/**
 * Interface for success response options
 */
export interface SuccessResponseOptions<T> {
  data: T;
  dataSource: DataSource;
}

/**
 * Creates a success response with consistent metadata
 * 
 * Requirements: 7.1, 9.1 - All responses include metadata with timestamp and dataSource
 * 
 * @param options - The response data and dataSource
 * @returns Object with data spread and metadata attached
 */
export function createSuccessResponse<T extends object>(
  options: SuccessResponseOptions<T>
): T & { metadata: ResponseMetadata } {
  const { data, dataSource } = options;
  
  return {
    ...data,
    metadata: createMetadata(dataSource),
  };
}

/**
 * Interface for error response options
 */
export interface ErrorResponseOptions {
  error: string;
  message: string;
  suggestions?: string[];
  fallbackReason?: FallbackReason;
}

/**
 * Creates an error response with consistent structure
 * 
 * Requirements: 9.2 - Error responses include error message, suggestions array,
 * and metadata with dataSource showing unavailable status
 * 
 * @param options - Error details and optional suggestions
 * @returns Properly formatted ErrorResponse object
 */
export function createErrorResponse(options: ErrorResponseOptions): ErrorResponse {
  const {
    error,
    message,
    suggestions = [],
    fallbackReason = 'error',
  } = options;
  
  return {
    error,
    message,
    suggestions,
    metadata: {
      timestamp: Date.now(),
      dataSource: {
        type: 'unavailable',
        realtimeAvailable: false,
        fallbackReason,
        sources: {
          tripUpdates: 'unavailable',
          vehiclePositions: 'unavailable',
          serviceAlerts: 'unavailable',
        },
      },
    },
  };
}

/**
 * Common error response creators for frequently used error types
 */

/**
 * Creates a "missing parameters" error response
 */
export function createMissingParamsError(
  paramNames: string[],
  additionalSuggestions: string[] = []
): ErrorResponse {
  return createErrorResponse({
    error: 'Missing required parameters',
    message: `Required parameters: ${paramNames.join(', ')}`,
    suggestions: [
      `Provide ${paramNames.join(' and ')} query parameters`,
      ...additionalSuggestions,
    ],
  });
}

/**
 * Creates a "not found" error response
 */
export function createNotFoundError(
  resourceType: string,
  resourceName: string,
  suggestions: string[] = []
): ErrorResponse {
  return createErrorResponse({
    error: `${resourceType} not found`,
    message: `${resourceType} "${resourceName}" not found`,
    suggestions: suggestions.length > 0 ? suggestions : [
      `Check ${resourceType.toLowerCase()} name spelling`,
    ],
  });
}

/**
 * Creates an "invalid parameters" error response
 */
export function createInvalidParamsError(
  message: string,
  suggestions: string[] = []
): ErrorResponse {
  return createErrorResponse({
    error: 'Invalid parameters',
    message,
    suggestions,
  });
}

/**
 * Creates a "no data available" error response
 */
export function createNoDataError(
  message: string = 'Unable to fetch data. Please try again.',
  suggestions: string[] = ['Retry in a few seconds', 'Visit caltrain.com for schedule information']
): ErrorResponse {
  return createErrorResponse({
    error: 'No data available',
    message,
    suggestions,
  });
}

/**
 * Creates a "timeout" error response
 */
export function createTimeoutError(
  suggestions: string[] = ['Retry in a few seconds']
): ErrorResponse {
  return createErrorResponse({
    error: 'Request timeout',
    message: 'The request took too long to complete.',
    suggestions,
    fallbackReason: 'timeout',
  });
}

/**
 * Type guard to check if a response is an error response
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    'message' in response &&
    'suggestions' in response &&
    'metadata' in response
  );
}
