# Design Document: RailTime API Redesign

## Overview

This design document outlines the architecture for transforming RailTime from a station-specific predictions system to a journey-focused API architecture. The redesign introduces five new API endpoints that intelligently combine multiple Caltrain data sources (Trip Updates, Vehicle Positions, Service Alerts) with static GTFS schedule data to provide a unified, journey-centric interface.

The system implements a 3-tier fallback strategy ensuring functionality when real-time APIs are unavailable, with clear user communication about data freshness through visual indicators.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │JourneySearch│  │TrainTracker │  │ DataSourceIndicators    │  │
│  │  Component  │  │  Component  │  │ (Banner, Badge, Icons)  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API Layer                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │/api/journeys│ │/api/trains │ │/api/journeys│ │/api/system   │  │
│  │            │ │/:tripId    │ │/active     │ │/status       │  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬───────┘  │
│        │              │              │               │          │
│        └──────────────┴──────────────┴───────────────┘          │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │  Data Fetcher     │                        │
│                    │  with Fallback    │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Caltrain APIs  │  │  Static GTFS    │  │  In-Memory      │
│  (Real-time)    │  │  (Fallback)     │  │  Cache          │
│  - Trip Updates │  │  - schedule.json│  │  (Stale Data)   │
│  - Positions    │  │  - stops.json   │  │                 │
│  - Alerts       │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Fallback Decision Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Request                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Try Real-time API     │
              │ (5s timeout)          │
              └───────────┬───────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
         Success                   Failure
              │                       │
              ▼                       ▼
    ┌─────────────────┐    ┌─────────────────────┐
    │ Return data     │    │ Check cache         │
    │ source:realtime │    │ (< 5 min old?)      │
    └─────────────────┘    └──────────┬──────────┘
                                      │
                           ┌──────────┴──────────┐
                           │                     │
                      Cache Hit            Cache Miss
                           │                     │
                           ▼                     ▼
                 ┌─────────────────┐  ┌─────────────────────┐
                 │ Return data     │  │ Load static GTFS    │
                 │ source:cached   │  │ schedule data       │
                 └─────────────────┘  └──────────┬──────────┘
                                                 │
                                      ┌──────────┴──────────┐
                                      │                     │
                                   Success              Failure
                                      │                     │
                                      ▼                     ▼
                            ┌─────────────────┐  ┌─────────────────┐
                            │ Return data     │  │ Return error    │
                            │ source:static   │  │ with suggestions│
                            └─────────────────┘  └─────────────────┘
```

## Components and Interfaces

### API Endpoints

#### 1. Journey Search API (`/api/journeys`)

```typescript
interface JourneySearchRequest {
  origin: string;           // Station name
  destination: string;      // Station name
  includeInProgress?: boolean; // Include departed trains (default: false)
}

interface JourneySearchResponse {
  journeys: Journey[];
  metadata: ResponseMetadata;
}

interface Journey {
  tripId: string;
  vehicleId: string;
  trainNumber: string;
  trainType: 'Local' | 'Limited' | 'Bullet';
  direction: 'NB' | 'SB';
  origin: StopInfo;
  destination: StopInfo;
  totalStops: number;
  stopsToOrigin: number;
  stopsBetween: number;
  stopsAfterDestination: number;
  journeyDuration: number;
  currentPosition?: CurrentPosition;
}
```

#### 2. Train Details API (`/api/trains/:tripId`)

```typescript
interface TrainDetailsRequest {
  tripId: string;
  origin?: string;
  destination?: string;
}

interface TrainDetailsResponse {
  trip: TripDetails;
  metadata: ResponseMetadata;
}

interface TripDetails {
  tripId: string;
  vehicleId: string;
  trainNumber: string;
  trainType: 'Local' | 'Limited' | 'Bullet';
  direction: 'NB' | 'SB';
  routeId: string;
  status: 'scheduled' | 'active' | 'completed';
  currentPosition?: DetailedPosition;
  stops: StopTimeline[];
  alerts: ServiceAlert[];
}
```

#### 3. Train Position API (`/api/trains/:tripId/position`)

```typescript
interface PositionRequest {
  tripId: string;
  origin?: string;
  destination?: string;
}

interface PositionResponse {
  position: TrainPosition;
  metadata: ResponseMetadata;
}

interface TrainPosition {
  tripId: string;
  trainNumber: string;
  currentSegment: Segment;
  journeyContext?: JourneyContext;
}

interface Segment {
  from: SegmentStop;
  to: SegmentStop;
  progress: number;  // 0-1
  estimated?: boolean;
}
```

#### 4. Active Journeys API (`/api/journeys/active`)

```typescript
interface ActiveJourneysRequest {
  origin: string;
  destination: string;
  lookbackMinutes?: number; // Default: 30
}

interface ActiveJourneysResponse {
  activeJourneys: ActiveJourney[];
  metadata: ResponseMetadata;
}

interface ActiveJourney {
  tripId: string;
  trainNumber: string;
  trainType: 'Local' | 'Limited' | 'Bullet';
  direction: 'NB' | 'SB';
  origin: DepartedStopInfo;
  destination: UpcomingStopInfo;
  currentPosition: CurrentPosition;
}
```

#### 5. System Status API (`/api/system/status`)

```typescript
interface SystemStatusResponse {
  alerts: ServiceAlert[];
  systemHealth: SystemHealth;
  metadata: ResponseMetadata;
}

interface SystemHealth {
  activeTrains: number;
  dataFreshness: number;
  apiStatus: 'operational' | 'degraded' | 'down';
  services: {
    tripUpdates: ServiceStatus;
    vehiclePositions: ServiceStatus;
    serviceAlerts: ServiceStatus;
  };
}
```

### Shared Types

```typescript
interface ResponseMetadata {
  timestamp: number;
  dataSource: DataSource;
}

interface DataSource {
  type: 'realtime' | 'static' | 'mixed' | 'cached';
  realtimeAvailable: boolean;
  fallbackReason?: 'api-down' | 'timeout' | 'error';
  message?: string;
  lastRealtimeUpdate?: number;
  sources?: {
    tripUpdates: 'realtime' | 'static' | 'unavailable';
    vehiclePositions: 'realtime' | 'static' | 'unavailable';
    serviceAlerts: 'realtime' | 'static' | 'unavailable';
  };
}

interface StopInfo {
  stopId: string;
  stopName: string;
  scheduledTime: string;
  predictedTime: string;
  etaMinutes: number;
  status: 'approaching' | 'boarding' | 'departed' | 'scheduled';
  delayMinutes: number;
  delayStatus: 'on-time' | 'delayed' | 'early';
}
```

### Frontend Components

```typescript
// DataSourceBanner - Shows fallback status
interface DataSourceBannerProps {
  dataSource: DataSource;
}

// LiveStatusBadge - Shows LIVE/SCHEDULED badge
interface LiveStatusBadgeProps {
  dataSource: DataSource;
}

// ETADisplay - Shows ETA with optional scheduled indicator
interface ETADisplayProps {
  eta: string;
  isRealtime: boolean;
}

// JourneySearch - Main search component
interface JourneySearchProps {
  origin: string;
  destination: string;
  onTrainSelect?: (journey: Journey) => void;
}
```

## Data Models

### External Data Sources

#### Caltrain Trip Updates API Response
```typescript
interface CaltrainTripUpdates {
  Entities: Array<{
    Id: string;
    TripUpdate: {
      Trip: {
        TripId: string;
        RouteId: string;
        DirectionId: number;
      };
      StopTimeUpdate: Array<{
        StopId: string;
        Arrival?: { Time: number };
        Departure?: { Time: number };
      }>;
      Timestamp: number;
    };
  }>;
}
```

#### Caltrain Vehicle Positions API Response
```typescript
interface CaltrainVehiclePositions {
  Entities: Array<{
    Id: string;
    Vehicle: {
      Trip: { TripId: string };
      Position: {
        Latitude: number;
        Longitude: number;
        Bearing: number;
      };
    };
  }>;
}
```

### Internal Data Structures

#### Static Schedule Data
```typescript
// lib/schedule-data.json
type ScheduleData = Record<string, Record<string, string>>;
// { tripId: { stopId: "8:15 AM", ... }, ... }

// lib/trip-stops-data.json
type TripStopsData = Record<string, string[]>;
// { tripId: [stopId1, stopId2, ...], ... }

// lib/stations.json
interface Station {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}
```

#### Cache Structure
```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface DataFetcherCache {
  tripUpdates: CacheEntry<CaltrainTripUpdates> | null;
  vehiclePositions: CacheEntry<CaltrainVehiclePositions> | null;
  serviceAlerts: CacheEntry<ServiceAlert[]> | null;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Journey Filtering Correctness
*For any* origin station, destination station, and set of trip data, all returned journeys SHALL contain stops at both the origin and destination stations, with the origin stop occurring before the destination stop in the trip sequence.
**Validates: Requirements 1.1**

### Property 2: Journey Response Completeness
*For any* valid journey returned by the Journey API, the journey object SHALL contain non-null values for tripId, trainNumber, trainType, direction, origin (with etaMinutes), destination (with etaMinutes), and journeyDuration.
**Validates: Requirements 1.2**

### Property 3: Journey Sorting Order
*For any* list of journeys returned by the Journey API with length > 1, each journey's origin.etaMinutes SHALL be less than or equal to the next journey's origin.etaMinutes.
**Validates: Requirements 1.3**

### Property 4: Past Train Exclusion
*For any* trip where the current time is after the origin station's departure time, the Journey API SHALL exclude that trip from results when includeInProgress is false, and SHALL include it when includeInProgress is true.
**Validates: Requirements 1.4**

### Property 5: Stop Timeline Completeness
*For any* valid trip ID, the Train Details API SHALL return a stops array where each stop contains stopId, stopName, scheduledArrival, predictedArrival, and status fields.
**Validates: Requirements 2.1**

### Property 6: Segment Labeling Correctness
*For any* train details request with origin and destination parameters, stops before the origin SHALL have segment "before-origin", stops from origin to destination SHALL have segment "journey", and stops after destination SHALL have segment "after-destination".
**Validates: Requirements 2.2**

### Property 7: Passed Stop Marking
*For any* stop in a train's timeline where the current time is after the stop's departure time, the stop SHALL have status "passed" and etaMinutes SHALL be null.
**Validates: Requirements 2.4**

### Property 8: Position Response Structure
*For any* valid position request, the response SHALL contain a currentSegment object with from (stopId, stopName), to (stopId, stopName), and progress (number between 0 and 1).
**Validates: Requirements 3.1**

### Property 9: Journey Context Calculation
*For any* position request with origin and destination, the sum of stationsUntilOrigin + 1 (origin) + stationsBetweenOriginAndDestination + 1 (destination) + stationsAfterDestination SHALL equal the total number of stops on the trip.
**Validates: Requirements 3.2**

### Property 10: Position Estimation Marking
*For any* position response where real-time GPS data is unavailable, the currentSegment.estimated field SHALL be true.
**Validates: Requirements 3.4**

### Property 11: Active Journey Filtering
*For any* origin, destination, and lookbackMinutes value, all returned active journeys SHALL have departed the origin within lookbackMinutes of the current time AND have not yet arrived at the destination.
**Validates: Requirements 4.1, 4.3**

### Property 12: Active Journey Response Completeness
*For any* active journey returned, the response SHALL include origin.minutesAgo (positive number) and destination.etaMinutes (positive number).
**Validates: Requirements 4.2**

### Property 13: System Status Response Completeness
*For any* system status request, the response SHALL include systemHealth.activeTrains (number), systemHealth.dataFreshness (number), and systemHealth.apiStatus (string).
**Validates: Requirements 5.1, 5.2**

### Property 14: Degraded Status Reporting
*For any* system status request where at least one Caltrain API returns an error, the systemHealth.apiStatus SHALL be "degraded" and the affected service in systemHealth.services SHALL have status "down".
**Validates: Requirements 5.3**

### Property 15: Trip Updates Fallback Behavior
*For any* data fetch where the Trip Updates API is unavailable, the returned data SHALL have source "static" and the response metadata SHALL have dataSource.type as "static" or "mixed".
**Validates: Requirements 6.1**

### Property 16: Fallback Message Inclusion
*For any* API response where dataSource.type is not "realtime", the dataSource.message field SHALL be a non-empty string.
**Validates: Requirements 6.3**

### Property 17: Cache Priority in Fallback
*For any* data fetch where the real-time API fails and valid cached data exists with age less than 5 minutes, the system SHALL return cached data with source "cached" before falling back to static data.
**Validates: Requirements 6.4**

### Property 18: Metadata Presence
*For any* successful API response, the response SHALL contain a metadata object with timestamp (number) and dataSource.type (one of "realtime", "static", "mixed", "cached").
**Validates: Requirements 7.1, 9.1**

### Property 19: Non-Realtime Metadata Fields
*For any* API response where dataSource.type is not "realtime", the dataSource object SHALL contain fallbackReason (string) and message (string).
**Validates: Requirements 7.2**

### Property 20: Mixed Source Breakdown
*For any* API response where dataSource.type is "mixed", the dataSource.sources object SHALL specify the status of tripUpdates, vehiclePositions, and serviceAlerts individually.
**Validates: Requirements 7.3**

### Property 21: UI Indicator Correctness
*For any* dataSource.type value, the UI SHALL render the corresponding indicator: "realtime" → green LIVE badge, "static" → yellow warning banner, "mixed" → blue info banner, "cached" → orange banner with timestamp.
**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 22: Error Response Structure
*For any* API error response, the response SHALL contain an error field (string), suggestions field (array), and metadata.dataSource.type as "unavailable".
**Validates: Requirements 9.2**

### Property 23: Recovery Attempt on Request
*For any* API request when the system is in fallback mode, the system SHALL first attempt to fetch from real-time APIs before using fallback data.
**Validates: Requirements 11.1**

### Property 24: Automatic Recovery
*For any* API request where the system was previously in fallback mode and real-time APIs are now available, the response SHALL have dataSource.type as "realtime".
**Validates: Requirements 11.2**

## Error Handling

### API Error Responses

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  suggestions: string[];
  metadata: {
    timestamp: number;
    dataSource: {
      type: 'unavailable';
      realtimeAvailable: false;
      fallbackReason: 'error';
      sources: {
        tripUpdates: 'unavailable';
        vehiclePositions: 'unavailable';
        serviceAlerts: 'unavailable';
      };
    };
  };
}
```

### Error Scenarios

| Scenario | HTTP Status | Error Message | Suggestions |
|----------|-------------|---------------|-------------|
| Invalid origin/destination | 400 | "Missing required parameters" | Provide both origin and destination |
| Station not found | 404 | "Station not found" | Check station name spelling |
| All APIs down + no static | 500 | "No data available" | Retry, visit caltrain.com |
| Timeout | 504 | "Request timeout" | Retry in a few seconds |

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests:

- **Unit tests** verify specific examples, edge cases, and integration points
- **Property-based tests** verify universal properties that should hold across all valid inputs

### Property-Based Testing Framework

**Library:** fast-check (TypeScript/JavaScript)

**Configuration:**
- Minimum iterations: 100 per property
- Shrinking enabled for failure case minimization

### Test Organization

```
__tests__/
├── unit/
│   ├── journeys.test.ts
│   ├── trains.test.ts
│   ├── position.test.ts
│   ├── active-journeys.test.ts
│   ├── system-status.test.ts
│   └── fallback.test.ts
├── properties/
│   ├── journey-filtering.property.ts
│   ├── response-structure.property.ts
│   ├── fallback-behavior.property.ts
│   └── metadata.property.ts
└── integration/
    ├── api-endpoints.test.ts
    └── fallback-recovery.test.ts
```

### Property Test Annotations

Each property-based test MUST include a comment referencing the correctness property:

```typescript
// **Feature: api-redesign, Property 1: Journey Filtering Correctness**
// **Validates: Requirements 1.1**
test.prop([tripDataArb, originArb, destinationArb])('filtered journeys stop at both stations', ...);
```

### Test Generators

```typescript
// Arbitrary generators for property tests
const stationNameArb = fc.constantFrom(
  'San Francisco', 'Millbrae', 'San Mateo', 'Redwood City',
  'Palo Alto', 'Mountain View', 'Sunnyvale', 'Santa Clara', 'San Jose Diridon'
);

const tripIdArb = fc.stringOf(fc.constantFrom('1', '2', '3', '4', '5', '6'), { minLength: 2, maxLength: 3 });

const stopTimeArb = fc.record({
  StopId: fc.string(),
  Arrival: fc.option(fc.record({ Time: fc.integer({ min: 0 }) })),
  Departure: fc.option(fc.record({ Time: fc.integer({ min: 0 }) }))
});

const tripUpdateArb = fc.record({
  Id: tripIdArb,
  TripUpdate: fc.record({
    Trip: fc.record({
      TripId: tripIdArb,
      RouteId: fc.constantFrom('Local Weekday', 'Limited', 'Bullet'),
      DirectionId: fc.constantFrom(0, 1)
    }),
    StopTimeUpdate: fc.array(stopTimeArb, { minLength: 2, maxLength: 25 }),
    Timestamp: fc.integer({ min: 0 })
  })
});

const dataSourceTypeArb = fc.constantFrom('realtime', 'static', 'mixed', 'cached');
```

### Unit Test Coverage

- Journey API: origin/destination filtering, sorting, past train exclusion
- Train Details API: stop timeline generation, segment labeling
- Position API: progress calculation, estimation marking
- Active Journeys API: lookback filtering, response fields
- System Status API: health aggregation, alert formatting
- Fallback Logic: cache priority, static data generation, recovery
