# RailTime API Redesign - Design Document

**Version:** 2.0  
**Date:** January 2025  
**Status:** Design Phase

---

## Executive Summary

This document outlines a redesign of RailTime's API architecture to support enhanced journey tracking features, including:
- Source-to-destination train filtering
- Real-time train position tracking (station-based, not GPS)
- Complete trip timeline visualization
- Past train tracking (for users already on board)

The redesign introduces a new API layer that intelligently combines multiple Caltrain data sources to provide a unified, journey-focused interface for the frontend.

---

## Table of Contents

1. [Current Architecture Problems](#current-architecture-problems)
2. [Data Sources Available](#data-sources-available)
3. [Proposed API Architecture](#proposed-api-architecture)
4. [API Endpoint Specifications](#api-endpoint-specifications)
5. [Frontend Integration](#frontend-integration)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Implementation Strategy](#implementation-strategy)
8. [Performance Considerations](#performance-considerations)

---

## Current Architecture Problems

### Problem 1: Limited Journey Context
**Current:** Station-specific predictions API only returns trains at the queried station.
**Issue:** Cannot filter trains by destination or show complete journey information.

### Problem 2: Incomplete Stop Lists
**Current:** Predictions API only returns the queried station's stop.
**Issue:** Cannot show "next station" or calculate "stations between source and destination."
**Workaround:** Using static GTFS data, but this doesn't include real-time updates for all stops.

### Problem 3: No Past Train Tracking
**Current:** Once a train passes the origin station, it disappears from predictions.
**Issue:** Users who board the train cannot continue tracking it.

### Problem 4: Missing Complete Trip Timeline
**Current:** Cannot show all stops from trip start to end with real-time ETAs.
**Issue:** Timeline view is incomplete or relies on static schedules.

---

## Data Sources Available

### 1. GTFS Static Data (Build Time)
**Location:** `/gtfs_data/*.txt` → processed into `/lib/*.json`

**Files:**
- `schedule-data.json` - Trip ID → Stop ID → Scheduled Time
- `trip-stops-data.json` - Trip ID → [All Stop IDs in sequence]
- `stations.json` - Station metadata (names, coordinates, stop IDs)

**Use Cases:**
- Station names and metadata
- Stop sequence ordering
- Baseline schedules for comparison

---

### 2. Station Predictions API (Real-time)
**Endpoint:** `https://www.caltrain.com/gtfs/stops/{station}/predictions`

**Returns:**
```json
{
  "data": [{
    "predictions": [{
      "TripUpdate": {
        "Trip": {"TripId": "160", "RouteId": "...", "DirectionId": 1},
        "StopTimeUpdate": [
          {"StopId": "70231", "Arrival": {"Time": 1764648189}}
        ]
      }
    }]
  }]
}
```

**Characteristics:**
- ✅ Fast (5KB)
- ✅ Station-specific
- ❌ Only returns queried station's stop
- ❌ Missing complete trip information

**Use Cases:**
- Quick station-specific queries
- Initial train discovery at origin

---

### 3. Trip Updates API (Real-time, System-Wide)
**Endpoint:** `https://www.caltrain.com/files/rt/tripupdates/CT.json`

**Returns:**
```json
{
  "Entities": [{
    "Id": "160",
    "TripUpdate": {
      "Trip": {"TripId": "160", "RouteId": "Local Weekday", "DirectionId": 1},
      "StopTimeUpdate": [
        {"StopId": "70012", "Departure": {"Time": 1764647700}},
        {"StopId": "70022", "Arrival": {"Time": 1764647970}, "Departure": {"Time": 1764648030}},
        {"StopId": "70032", "Arrival": {"Time": 1764648234}, "Departure": {"Time": 1764648294}},
        // ... ALL stops for this trip
      ]
    }
  }]
}
```

**Characteristics:**
- ✅ Complete stop lists with real-time ETAs
- ✅ All active trains
- ✅ Can track trains anywhere on route
- ❌ Large payload (~100KB)
- ❌ Requires client-side filtering

**Use Cases:**
- Complete trip timeline
- Past train tracking
- Multi-station queries

---

### 4. Vehicle Positions API (Real-time)
**Endpoint:** `https://www.caltrain.com/files/rt/vehiclepositions/CT.json`

**Returns:**
```json
{
  "Entities": [{
    "Id": "160",
    "Vehicle": {
      "Trip": {"TripId": "160"},
      "Position": {
        "Latitude": 37.7759,
        "Longitude": -122.39559,
        "Bearing": 0
      }
    }
  }]
}
```

**Use Cases:**
- GPS-based map visualization
- Train position interpolation

---

### 5. Service Alerts API (Real-time)
**Endpoint:** `https://www.caltrain.com/files/rt/servicealerts/CT.json`

**Use Cases:**
- Service disruptions
- Delay notifications
- Bus bridge alerts

---

## Proposed API Architecture

### Design Principles

1. **Journey-Centric:** APIs should be organized around user journeys, not data sources
2. **Smart Aggregation:** Backend combines multiple Caltrain APIs intelligently
3. **Efficient Caching:** Cache system-wide data, serve filtered results
4. **Progressive Enhancement:** Start with essential data, load details on demand

---

### API Layer Structure

```
Frontend
    ↓
Next.js API Routes (New Unified Layer)
    ↓
Caltrain APIs + Static GTFS Data
```

---

## API Endpoint Specifications

### 1. Journey Search API

**Endpoint:** `GET /api/journeys`

**Purpose:** Find all trains from source to destination with ETAs

**Query Parameters:**
```typescript
{
  origin: string;        // Station name (e.g., "Sunnyvale")
  destination: string;   // Station name (e.g., "San Francisco")
  includeInProgress?: boolean; // Include trains already past origin (default: false)
}
```

**Response:**
```typescript
{
  journeys: [
    {
      tripId: string;           // "160"
      vehicleId: string;        // "160"
      trainNumber: string;      // "160"
      trainType: "Local" | "Limited" | "Bullet";
      direction: "NB" | "SB";
      
      // Origin station info
      origin: {
        stopId: string;         // "70231"
        stopName: string;       // "Sunnyvale"
        scheduledTime: string;  // "8:15 AM"
        predictedTime: string;  // "8:17 AM"
        etaMinutes: number;     // 5
        status: "approaching" | "boarding" | "departed";
        delayMinutes: number;   // 2
        delayStatus: "on-time" | "delayed" | "early";
      },
      
      // Destination station info
      destination: {
        stopId: string;         // "70012"
        stopName: string;       // "San Francisco"
        scheduledTime: string;  // "9:15 AM"
        predictedTime: string;  // "9:17 AM"
        etaMinutes: number;     // 65
        delayMinutes: number;   // 2
      },
      
      // Journey summary
      totalStops: number;       // 22 (all stops on trip)
      stopsToOrigin: number;    // 5 (stops before origin)
      stopsBetween: number;     // 10 (stops between origin and destination)
      stopsAfterDestination: number; // 7
      journeyDuration: number;  // 60 (minutes from origin to destination)
      
      // Current position (if train is in progress)
      currentPosition?: {
        lastPassedStop: string; // "Mountain View"
        nextStop: string;       // "Sunnyvale"
        stopsUntilOrigin: number; // 1
      }
    }
  ],
  metadata: {
    origin: { stopId: string; stopName: string; },
    destination: { stopId: string; stopName: string; },
    timestamp: number;
    direction: "NB" | "SB";
    dataSource: {
      type: "realtime" | "static" | "mixed";
      realtimeAvailable: boolean;
      fallbackReason?: "api-down" | "no-data" | "timeout" | "error";
      message?: string; // User-friendly message
      lastRealtimeUpdate?: number; // Timestamp of last successful realtime fetch
    }
  }
}
```

**Data Sources Used:**
1. Trip Updates API (for complete stop lists + real-time ETAs)
2. Static GTFS (for station names, stop sequence)
3. Vehicle Positions API (for current position)

**Backend Logic:**
```typescript
1. Fetch Trip Updates (system-wide)
2. Filter trains that stop at BOTH origin AND destination
3. Calculate stop counts and journey duration
4. Determine current position from Vehicle Positions
5. Sort by ETA at origin
6. Return filtered, enriched journey list
```

---

### 2. Train Details API

**Endpoint:** `GET /api/trains/:tripId`

**Purpose:** Get complete information about a specific train/trip

**Query Parameters:**
```typescript
{
  tripId: string;        // "160" (required)
  origin?: string;       // Optional: highlight origin station
  destination?: string;  // Optional: highlight destination station
}
```

**Response:**
```typescript
{
  trip: {
    tripId: string;
    vehicleId: string;
    trainNumber: string;
    trainType: "Local" | "Limited" | "Bullet";
    direction: "NB" | "SB";
    routeId: string;
    
    // Current status
    status: "scheduled" | "active" | "completed";
    currentPosition?: {
      latitude: number;
      longitude: number;
      bearing: number;
      lastPassedStopId: string;
      lastPassedStopName: string;
      nextStopId: string;
      nextStopName: string;
      etaToNextStop: number; // minutes
    },
    
    // Complete stop timeline
    stops: [
      {
        stopId: string;
        stopName: string;
        stopSequence: number;     // 1, 2, 3...
        scheduledArrival: string; // "8:15 AM"
        predictedArrival: string; // "8:17 AM"
        scheduledDeparture: string;
        predictedDeparture: string;
        etaMinutes: number | null; // null if already passed
        delayMinutes: number;
        status: "passed" | "next" | "upcoming" | "skipped";
        
        // Journey context (if origin/destination provided)
        isOrigin?: boolean;
        isDestination?: boolean;
        segment?: "before-origin" | "journey" | "after-destination";
      }
    ],
    
    // Service alerts (if any)
    alerts: [
      {
        alertId: string;
        severity: "info" | "warning" | "critical";
        message: string;
        affectedStops: string[];
      }
    ]
  },
  metadata: {
    timestamp: number;
    dataAge: number; // seconds since last update
    dataSource: {
      type: "realtime" | "static" | "mixed";
      realtimeAvailable: boolean;
      fallbackReason?: "api-down" | "no-data" | "timeout" | "error";
      message?: string;
      sources: {
        tripUpdates: "realtime" | "static" | "unavailable";
        vehiclePositions: "realtime" | "static" | "unavailable";
        serviceAlerts: "realtime" | "static" | "unavailable";
      }
    }
  }
}
```

**Data Sources Used:**
1. Trip Updates API (complete stop list with ETAs)
2. Vehicle Positions API (current location)
3. Static GTFS (station names, scheduled times)
4. Service Alerts API (disruptions)

**Backend Logic:**
```typescript
1. Fetch Trip Updates for specific tripId
2. Fetch Vehicle Position for vehicleId
3. Merge with static GTFS for station names
4. Calculate current position and next stop
5. Mark stops as passed/next/upcoming based on current time
6. Enrich with origin/destination context if provided
7. Attach relevant service alerts
```

---

### 3. Train Position API (Station-Based)

**Endpoint:** `GET /api/trains/:tripId/position`

**Purpose:** Get train's position relative to stations (for corridor view)

**Query Parameters:**
```typescript
{
  tripId: string;
  origin?: string;       // Optional: for journey context
  destination?: string;
}
```

**Response:**
```typescript
{
  position: {
    tripId: string;
    trainNumber: string;
    
    // Current segment
    currentSegment: {
      from: {
        stopId: string;
        stopName: string;
        stopSequence: number;
        departureTime: string;
      },
      to: {
        stopId: string;
        stopName: string;
        stopSequence: number;
        arrivalTime: string;
        etaMinutes: number;
      },
      progress: number; // 0-1 (estimated progress between stations)
    },
    
    // Journey context (if origin/destination provided)
    journeyContext?: {
      stationsUntilOrigin: number;
      stationsBetweenOriginAndDestination: number;
      stationsAfterDestination: number;
      currentSegment: "before-origin" | "to-origin" | "journey" | "after-destination";
      
      nextStations: [
        {
          stopName: string;
          etaMinutes: number;
          isOrigin: boolean;
          isDestination: boolean;
        }
      ]
    }
  }
}
```

**Data Sources Used:**
1. Trip Updates API (stop ETAs)
2. Vehicle Positions API (current GPS location)
3. Static GTFS (station coordinates for interpolation)

**Backend Logic:**
```typescript
1. Get vehicle GPS position
2. Find nearest two stations on route
3. Calculate progress between them based on:
   - Distance from each station
   - Time elapsed vs total segment time
4. Determine journey context relative to origin/destination
5. List upcoming stations with ETAs
```

---

### 4. Past Trains API

**Endpoint:** `GET /api/journeys/active`

**Purpose:** Track trains that have already departed origin (for users on board)

**Query Parameters:**
```typescript
{
  origin: string;
  destination: string;
  lookbackMinutes?: number; // Default: 30 (how far back to look)
}
```

**Response:**
```typescript
{
  activeJourneys: [
    {
      // Same structure as Journey Search API
      // But includes trains that departed origin up to lookbackMinutes ago
      tripId: string;
      trainNumber: string;
      origin: {
        stopName: string;
        departedAt: string;
        minutesAgo: number; // How long ago train left origin
      },
      destination: {
        stopName: string;
        etaMinutes: number;
        predictedTime: string;
      },
      currentPosition: {
        lastPassedStop: string;
        nextStop: string;
        stopsUntilDestination: number;
      }
    }
  ]
}
```

**Data Sources Used:**
1. Trip Updates API (complete trip data)
2. Vehicle Positions API (current location)

**Backend Logic:**
```typescript
1. Fetch Trip Updates
2. Filter trains where:
   - Origin stop has passed (current time > departure time)
   - Destination stop is upcoming (current time < arrival time)
   - Departure was within lookbackMinutes
3. Calculate current position
4. Return active journeys
```

---

### 5. System Status API

**Endpoint:** `GET /api/system/status`

**Purpose:** Get system-wide alerts and status

**Response:**
```typescript
{
  alerts: [
    {
      id: string;
      severity: "info" | "warning" | "critical";
      title: string;
      description: string;
      affectedStations: string[];
      affectedRoutes: string[];
      startTime: string;
      endTime?: string;
    }
  ],
  systemHealth: {
    activeTrains: number;
    dataFreshness: number; // seconds since last update
    apiStatus: "operational" | "degraded" | "down";
  }
}
```

**Data Sources Used:**
1. Service Alerts API
2. Trip Updates API (for active train count)

---

## Frontend Integration

### Component Architecture

```
App
├── JourneySearch (uses /api/journeys)
│   └── TrainCard (shows journey summary)
│
├── TrainTracker (uses /api/trains/:tripId)
│   ├── CorridorView (uses /api/trains/:tripId/position)
│   │   └── StationMarkers
│   │   └── TrainIcon
│   │
│   └── TimelineView (uses /api/trains/:tripId)
│       └── StopList
│       └── ETAIndicators
│
└── ActiveJourneys (uses /api/journeys/active)
    └── OnboardTracker
```

---

### Frontend API Calls

#### 1. Journey Search Flow

```typescript
// User selects origin and destination
const searchJourneys = async (origin: string, destination: string) => {
  const response = await fetch(
    `/api/journeys?origin=${origin}&destination=${destination}`
  );
  const data = await response.json();
  
  // Display list of trains
  setJourneys(data.journeys);
};

// Refresh every 30 seconds
useEffect(() => {
  searchJourneys(origin, destination);
  const interval = setInterval(() => searchJourneys(origin, destination), 30000);
  return () => clearInterval(interval);
}, [origin, destination]);
```

---

#### 2. Train Selection Flow

```typescript
// User selects a train
const selectTrain = async (tripId: string) => {
  const response = await fetch(
    `/api/trains/${tripId}?origin=${origin}&destination=${destination}`
  );
  const data = await response.json();
  
  setSelectedTrain(data.trip);
  setView('corridor'); // or 'timeline'
};
```

---

#### 3. Corridor View (Station-Based Position)

```typescript
// Show train position in corridor view
const fetchTrainPosition = async (tripId: string) => {
  const response = await fetch(
    `/api/trains/${tripId}/position?origin=${origin}&destination=${destination}`
  );
  const data = await response.json();
  
  // Update corridor view
  setTrainPosition(data.position);
};

// Refresh every 10 seconds
useEffect(() => {
  fetchTrainPosition(tripId);
  const interval = setInterval(() => fetchTrainPosition(tripId), 10000);
  return () => clearInterval(interval);
}, [tripId]);
```

---

#### 4. Timeline View

```typescript
// Show complete trip timeline
const TrainTimeline = ({ train }) => {
  return (
    <div>
      {train.stops.map(stop => (
        <StopCard
          key={stop.stopId}
          stop={stop}
          isOrigin={stop.isOrigin}
          isDestination={stop.isDestination}
          isPassed={stop.status === 'passed'}
          isNext={stop.status === 'next'}
        />
      ))}
    </div>
  );
};
```

---

#### 5. Active Journey Tracking (Past Trains)

```typescript
// Track train user is on
const trackActiveJourney = async () => {
  const response = await fetch(
    `/api/journeys/active?origin=${origin}&destination=${destination}&lookbackMinutes=30`
  );
  const data = await response.json();
  
  // Show "Your Train" if found
  if (data.activeJourneys.length > 0) {
    setOnboardTrain(data.activeJourneys[0]);
  }
};

// Refresh every 15 seconds
useEffect(() => {
  trackActiveJourney();
  const interval = setInterval(trackActiveJourney, 15000);
  return () => clearInterval(interval);
}, [origin, destination]);
```

---

## Data Flow Diagrams

### Flow 1: Journey Search

```
User selects origin + destination
    ↓
Frontend: GET /api/journeys?origin=Sunnyvale&destination=SF
    ↓
Backend:
  1. Fetch Trip Updates (system-wide)
  2. Filter trains stopping at both stations
  3. Calculate journey metrics
  4. Fetch Vehicle Positions
  5. Determine current position
  6. Sort by ETA
    ↓
Frontend: Display train list with ETAs
```

---

### Flow 2: Train Selection → Corridor View

```
User clicks train card
    ↓
Frontend: GET /api/trains/160?origin=Sunnyvale&destination=SF
    ↓
Backend:
  1. Fetch Trip Update for train 160
  2. Fetch Vehicle Position for train 160
  3. Merge with static GTFS
  4. Calculate current segment
    ↓
Frontend: Display corridor view
    ↓
Every 10s: GET /api/trains/160/position
    ↓
Backend:
  1. Get current GPS position
  2. Calculate progress between stations
  3. Determine next stops
    ↓
Frontend: Update train icon position
```

---

### Flow 3: Timeline View

```
User switches to timeline view
    ↓
Frontend: Uses data from /api/trains/160
    ↓
Display all stops with:
  - Passed stops (grayed out)
  - Next stop (highlighted)
  - Upcoming stops (with ETAs)
  - Origin/Destination markers
```

---

### Flow 4: Past Train Tracking

```
User boards train at origin
    ↓
Frontend: GET /api/journeys/active?origin=Sunnyvale&destination=SF
    ↓
Backend:
  1. Fetch Trip Updates
  2. Filter trains where:
     - Departed origin (within last 30 min)
     - Not yet reached destination
  3. Calculate current position
    ↓
Frontend: Show "Your Train" section
    ↓
Every 15s: Refresh active journey
    ↓
Display:
  - "Departed 5 minutes ago"
  - "Next stop: Mountain View (3 min)"
  - "Arriving at SF in 55 min"
```

---

## Implementation Strategy

### Phase 1: Core Journey API
**Goal:** Replace station predictions with journey-based API

**Tasks:**
1. Create `/api/journeys` endpoint
2. Implement Trip Updates fetching and caching
3. Build journey filtering logic
4. Update frontend to use new API
5. Test with existing UI

**Estimated Effort:** 2-3 days

---

### Phase 2: Train Details API
**Goal:** Enable complete trip visualization

**Tasks:**
1. Create `/api/trains/:tripId` endpoint
2. Implement stop timeline generation
3. Integrate Vehicle Positions
4. Add service alerts integration
5. Build timeline view component

**Estimated Effort:** 2-3 days

---

### Phase 3: Position Tracking
**Goal:** Improve corridor view with station-based positioning

**Tasks:**
1. Create `/api/trains/:tripId/position` endpoint
2. Implement segment progress calculation
3. Update corridor view to use new API
4. Add journey context indicators

**Estimated Effort:** 1-2 days

---

### Phase 4: Past Train Tracking
**Goal:** Enable tracking after departure

**Tasks:**
1. Create `/api/journeys/active` endpoint
2. Implement lookback logic
3. Build "Your Train" UI component
4. Add persistence (localStorage for selected train)

**Estimated Effort:** 1-2 days

---

### Phase 5: Polish & Optimization
**Goal:** Performance and UX improvements

**Tasks:**
1. Implement caching strategy
2. Add loading states
3. Error handling
4. Service alerts integration
5. Performance monitoring

**Estimated Effort:** 2-3 days

---

## Graceful Degradation & Fallback Strategy

### Data Source Hierarchy

```
Priority 1: Real-time Caltrain APIs
    ↓ (if unavailable)
Priority 2: Static GTFS Schedule Data
    ↓ (if unavailable)
Priority 3: Error state with cached data
```

---

### Fallback Logic

#### Scenario 1: Trip Updates API Down
```typescript
async function getTripUpdates() {
  try {
    const response = await fetch(
      'https://www.caltrain.com/files/rt/tripupdates/CT.json',
      { timeout: 5000 }
    );
    
    if (!response.ok) throw new Error('API returned error');
    
    return {
      data: await response.json(),
      source: 'realtime',
      timestamp: Date.now()
    };
  } catch (error) {
    console.warn('Trip Updates API unavailable, falling back to static schedule');
    
    // Fallback to static GTFS schedule
    return {
      data: generateStaticSchedule(), // From schedule-data.json
      source: 'static',
      fallbackReason: 'api-down',
      message: 'Showing scheduled times. Real-time data unavailable.',
      timestamp: Date.now()
    };
  }
}
```

---

#### Scenario 2: Vehicle Positions API Down
```typescript
async function getVehiclePositions() {
  try {
    const response = await fetch(
      'https://www.caltrain.com/files/rt/vehiclepositions/CT.json',
      { timeout: 5000 }
    );
    
    if (!response.ok) throw new Error('API returned error');
    
    return {
      data: await response.json(),
      source: 'realtime',
      timestamp: Date.now()
    };
  } catch (error) {
    console.warn('Vehicle Positions API unavailable');
    
    // Fallback: Estimate position from schedule
    return {
      data: estimatePositionFromSchedule(), // Calculate from static times
      source: 'static',
      fallbackReason: 'api-down',
      message: 'Train positions estimated from schedule.',
      timestamp: Date.now()
    };
  }
}
```

---

#### Scenario 3: Partial Data Available (Mixed Mode)
```typescript
async function getTrainDetails(tripId: string) {
  const [tripUpdates, vehiclePositions] = await Promise.all([
    getTripUpdates(),
    getVehiclePositions()
  ]);
  
  // Determine overall data source type
  let dataSourceType: 'realtime' | 'static' | 'mixed';
  let message: string | undefined;
  
  if (tripUpdates.source === 'realtime' && vehiclePositions.source === 'realtime') {
    dataSourceType = 'realtime';
  } else if (tripUpdates.source === 'static' && vehiclePositions.source === 'static') {
    dataSourceType = 'static';
    message = 'Showing scheduled data. Real-time updates unavailable.';
  } else {
    dataSourceType = 'mixed';
    message = 'Showing mix of real-time and scheduled data.';
  }
  
  return {
    trip: buildTripDetails(tripUpdates.data, vehiclePositions.data),
    metadata: {
      dataSource: {
        type: dataSourceType,
        realtimeAvailable: tripUpdates.source === 'realtime',
        message,
        sources: {
          tripUpdates: tripUpdates.source,
          vehiclePositions: vehiclePositions.source,
          serviceAlerts: 'realtime' // or check separately
        }
      }
    }
  };
}
```

---

### Static Schedule Generation

When real-time data is unavailable, generate predictions from static GTFS:

```typescript
function generateStaticSchedule() {
  const now = new Date();
  const scheduleData = require('@/lib/schedule-data.json');
  const tripStopsData = require('@/lib/trip-stops-data.json');
  
  // Find trips scheduled for current time
  const activeTrips = Object.entries(scheduleData)
    .filter(([tripId, stops]) => {
      // Check if any stop is scheduled within next 2 hours
      return Object.values(stops).some(time => {
        const scheduledTime = parseTime(time);
        const diffMinutes = differenceInMinutes(scheduledTime, now);
        return diffMinutes >= -5 && diffMinutes <= 120;
      });
    })
    .map(([tripId, stops]) => ({
      Id: tripId,
      TripUpdate: {
        Trip: {
          TripId: tripId,
          RouteId: inferRouteFromTripId(tripId),
          DirectionId: inferDirectionFromTripId(tripId)
        },
        StopTimeUpdate: Object.entries(stops).map(([stopId, time]) => ({
          StopId: stopId,
          Arrival: { Time: parseTime(time).getTime() / 1000 },
          Departure: { Time: (parseTime(time).getTime() / 1000) + 60 }
        }))
      }
    }));
  
  return { Entities: activeTrips };
}
```

---

### Position Estimation from Schedule

When Vehicle Positions API is down:

```typescript
function estimatePositionFromSchedule(tripId: string, stops: StopTimeUpdate[]) {
  const now = Date.now() / 1000; // Unix timestamp
  
  // Find the segment train should be in based on schedule
  for (let i = 0; i < stops.length - 1; i++) {
    const currentStop = stops[i];
    const nextStop = stops[i + 1];
    
    if (now >= currentStop.Departure.Time && now <= nextStop.Arrival.Time) {
      // Train is between these two stops
      const totalTime = nextStop.Arrival.Time - currentStop.Departure.Time;
      const elapsed = now - currentStop.Departure.Time;
      const progress = elapsed / totalTime;
      
      return {
        currentSegment: {
          from: currentStop,
          to: nextStop,
          progress: Math.min(Math.max(progress, 0), 1)
        },
        estimated: true
      };
    }
  }
  
  return null; // Train not currently active
}
```

---

### Frontend Data Source Indicators

#### Banner Notification
```typescript
// components/DataSourceBanner.tsx
export function DataSourceBanner({ metadata }) {
  if (metadata.dataSource.type === 'realtime') {
    return null; // No banner needed
  }
  
  const bannerConfig = {
    static: {
      color: 'yellow',
      icon: '⚠️',
      title: 'Scheduled Data Only',
      message: metadata.dataSource.message || 'Real-time updates unavailable. Showing scheduled times.'
    },
    mixed: {
      color: 'blue',
      icon: 'ℹ️',
      title: 'Limited Real-Time Data',
      message: metadata.dataSource.message || 'Some real-time data unavailable.'
    }
  };
  
  const config = bannerConfig[metadata.dataSource.type];
  
  return (
    <div className={`bg-${config.color}-900 border border-${config.color}-500 p-3 rounded mb-4`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{config.icon}</span>
        <div>
          <div className="font-bold text-sm">{config.title}</div>
          <div className="text-xs opacity-90">{config.message}</div>
        </div>
      </div>
    </div>
  );
}
```

#### Inline Indicators
```typescript
// Show indicator next to ETAs
<div className="flex items-center gap-2">
  <span className="text-lg">5 min</span>
  {metadata.dataSource.type !== 'realtime' && (
    <span className="text-xs opacity-60" title="Estimated from schedule">
      📅
    </span>
  )}
</div>
```

#### Status Badge
```typescript
// components/LiveStatusBadge.tsx
export function LiveStatusBadge({ isRealtime }) {
  if (isRealtime) {
    return (
      <span className="px-2 py-1 bg-green-900 text-green-300 text-xs rounded flex items-center gap-1">
        <span className="animate-pulse">●</span> LIVE
      </span>
    );
  }
  
  return (
    <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
      📅 SCHEDULED
    </span>
  );
}
```

---

### API Response Examples with Fallback

#### Example 1: Real-time Data Available
```json
{
  "journeys": [...],
  "metadata": {
    "dataSource": {
      "type": "realtime",
      "realtimeAvailable": true,
      "sources": {
        "tripUpdates": "realtime",
        "vehiclePositions": "realtime",
        "serviceAlerts": "realtime"
      }
    }
  }
}
```

#### Example 2: Complete Fallback to Static
```json
{
  "journeys": [...],
  "metadata": {
    "dataSource": {
      "type": "static",
      "realtimeAvailable": false,
      "fallbackReason": "api-down",
      "message": "Real-time data unavailable. Showing scheduled times only.",
      "lastRealtimeUpdate": 1764647000,
      "sources": {
        "tripUpdates": "static",
        "vehiclePositions": "static",
        "serviceAlerts": "unavailable"
      }
    }
  }
}
```

#### Example 3: Mixed Mode
```json
{
  "trip": {...},
  "metadata": {
    "dataSource": {
      "type": "mixed",
      "realtimeAvailable": true,
      "message": "Train positions estimated from schedule. Arrival times are real-time.",
      "sources": {
        "tripUpdates": "realtime",
        "vehiclePositions": "static",
        "serviceAlerts": "realtime"
      }
    }
  }
}
```

---

### Error Handling Strategy

#### Timeout Configuration
```typescript
const CALTRAIN_API_TIMEOUT = 5000; // 5 seconds

async function fetchWithTimeout(url: string, timeout: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}
```

#### Retry Logic
```typescript
async function fetchWithRetry(url: string, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchWithTimeout(url, CALTRAIN_API_TIMEOUT);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

#### Stale Data Handling
```typescript
const MAX_DATA_AGE = 60000; // 1 minute

function isDataStale(timestamp: number) {
  return Date.now() - timestamp > MAX_DATA_AGE;
}

// Use cached data if fresh, otherwise fetch
async function getDataWithCache(cacheKey: string, fetchFn: () => Promise<any>) {
  const cached = cache.get(cacheKey);
  
  if (cached && !isDataStale(cached.timestamp)) {
    return cached.data;
  }
  
  try {
    const data = await fetchFn();
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    // If fetch fails but we have stale cache, use it
    if (cached) {
      console.warn('Using stale cached data due to fetch failure');
      return cached.data;
    }
    throw error;
  }
}
```

---

### User Experience Guidelines

#### 1. Clear Communication
- ✅ Always show data source status prominently
- ✅ Use clear, non-technical language
- ✅ Explain what "scheduled" means (not live)

#### 2. Visual Differentiation
- ✅ Real-time: Green badge, pulsing indicator
- ✅ Static: Gray badge, calendar icon
- ✅ Mixed: Blue badge, info icon

#### 3. Graceful Degradation
- ✅ App remains functional with static data
- ✅ No broken UI or missing information
- ✅ Automatic recovery when APIs come back online

#### 4. Transparency
- ✅ Show last successful real-time update timestamp
- ✅ Indicate which specific data sources are affected
- ✅ Provide refresh button to retry

---

## Performance Considerations

### Caching Strategy

#### Trip Updates (System-Wide)
```typescript
// Cache for 10 seconds (data updates every 10s)
const TRIP_UPDATES_CACHE_TTL = 10000;

let tripUpdatesCache = {
  data: null,
  timestamp: 0
};

async function getTripUpdates() {
  const now = Date.now();
  if (tripUpdatesCache.data && (now - tripUpdatesCache.timestamp) < TRIP_UPDATES_CACHE_TTL) {
    return tripUpdatesCache.data;
  }
  
  const data = await fetch('https://www.caltrain.com/files/rt/tripupdates/CT.json');
  tripUpdatesCache = { data, timestamp: now };
  return data;
}
```

**Benefit:** Multiple frontend requests share same backend fetch

---

#### Vehicle Positions
```typescript
// Cache for 5 seconds (data updates every 10s)
const VEHICLE_POSITIONS_CACHE_TTL = 5000;
```

---

### API Response Sizes

| Endpoint | Typical Size | Refresh Rate |
|----------|-------------|--------------|
| `/api/journeys` | 5-10 KB | 30s |
| `/api/trains/:tripId` | 3-5 KB | 30s |
| `/api/trains/:tripId/position` | 1-2 KB | 10s |
| `/api/journeys/active` | 2-3 KB | 15s |

**Total bandwidth per user:** ~15-20 KB/30s = **0.5-0.7 KB/s**

---

### Backend Optimization

1. **Parallel Fetching:**
```typescript
// Fetch multiple Caltrain APIs in parallel
const [tripUpdates, vehiclePositions, alerts] = await Promise.all([
  getTripUpdates(),
  getVehiclePositions(),
  getServiceAlerts()
]);
```

2. **Incremental Filtering:**
```typescript
// Filter early to reduce processing
const relevantTrips = tripUpdates.Entities
  .filter(trip => stopsAtStation(trip, originStopId))
  .filter(trip => stopsAtStation(trip, destinationStopId));
```

3. **Lazy Loading:**
- Journey search: Load immediately
- Train details: Load on selection
- Position updates: Start polling after selection

---

## Migration Path

### Backward Compatibility

Keep existing `/api/predictions` endpoint during migration:
```typescript
// Old endpoint (deprecated)
GET /api/predictions?station=sunnyvale&stop1=70231&stop2=70232

// New endpoint
GET /api/journeys?origin=Sunnyvale&destination=San Francisco
```

### Gradual Rollout

1. **Week 1:** Deploy new APIs alongside old ones
2. **Week 2:** Update frontend to use new APIs
3. **Week 3:** Monitor performance and fix issues
4. **Week 4:** Deprecate old endpoints

---

## Health Monitoring & Alerting

### Backend Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: Date.now(),
    services: {
      tripUpdates: await checkService('https://www.caltrain.com/files/rt/tripupdates/CT.json'),
      vehiclePositions: await checkService('https://www.caltrain.com/files/rt/vehiclepositions/CT.json'),
      serviceAlerts: await checkService('https://www.caltrain.com/files/rt/servicealerts/CT.json'),
      staticData: checkStaticData()
    }
  };
  
  // Overall status
  const allHealthy = Object.values(health.services).every(s => s.status === 'up');
  health.status = allHealthy ? 'healthy' : 'degraded';
  
  return NextResponse.json(health);
}

async function checkService(url: string) {
  try {
    const start = Date.now();
    const response = await fetchWithTimeout(url, 3000);
    const latency = Date.now() - start;
    
    return {
      status: response.ok ? 'up' : 'down',
      latency,
      lastCheck: Date.now()
    };
  } catch (error) {
    return {
      status: 'down',
      error: error.message,
      lastCheck: Date.now()
    };
  }
}

function checkStaticData() {
  try {
    const scheduleData = require('@/lib/schedule-data.json');
    const tripStopsData = require('@/lib/trip-stops-data.json');
    
    return {
      status: 'up',
      scheduleEntries: Object.keys(scheduleData).length,
      tripEntries: Object.keys(tripStopsData).length
    };
  } catch (error) {
    return {
      status: 'down',
      error: 'Static data files missing'
    };
  }
}
```

---

### Frontend Health Monitoring

```typescript
// hooks/useSystemHealth.ts
export function useSystemHealth() {
  const [health, setHealth] = useState(null);
  
  useEffect(() => {
    const checkHealth = async () => {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);
  
  return health;
}

// components/SystemHealthIndicator.tsx
export function SystemHealthIndicator() {
  const health = useSystemHealth();
  
  if (!health || health.status === 'healthy') {
    return null; // Don't show anything when all is well
  }
  
  return (
    <div className="bg-yellow-900 border border-yellow-500 p-2 text-xs">
      <div className="flex items-center gap-2">
        <span>⚠️</span>
        <span>Some real-time services are unavailable. Using scheduled data.</span>
        <button 
          onClick={() => window.location.reload()}
          className="ml-auto underline"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
```

---

### Logging Strategy

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta);
  },
  
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta);
    // Send to monitoring service (e.g., Sentry, DataDog)
  },
  
  error: (message: string, error: Error, meta?: any) => {
    console.error(`[ERROR] ${message}`, error, meta);
    // Send to error tracking service
  },
  
  fallback: (service: string, reason: string) => {
    console.warn(`[FALLBACK] ${service} unavailable: ${reason}. Using static data.`);
    // Track fallback events for monitoring
  }
};

// Usage in API routes
try {
  const tripUpdates = await fetchTripUpdates();
  logger.info('Trip Updates fetched successfully');
} catch (error) {
  logger.fallback('Trip Updates API', error.message);
  return generateStaticSchedule();
}
```

---

## Success Metrics

### User Experience
- ✅ Users can filter trains by destination
- ✅ Users can see complete trip timeline
- ✅ Users can track trains after boarding
- ✅ Corridor view shows station-based position

### Performance
- ✅ API response time < 500ms (p95)
- ✅ Frontend data refresh every 10-30s
- ✅ Bandwidth usage < 1 KB/s per user

### Reliability
- ✅ Graceful degradation if Caltrain APIs fail
- ✅ Cached data served if fresh data unavailable
- ✅ Error messages shown to users

---

## Future Enhancements

### Phase 6: Advanced Features
1. **Push Notifications:** Alert when train is approaching
2. **Trip Planning:** Suggest best train based on preferences
3. **Historical Data:** Show typical delays for route
4. **Multi-Leg Journeys:** Support transfers
5. **Offline Mode:** Cache data for offline viewing

---

## Appendix

### API Response Examples

See separate file: `API_EXAMPLES.md`

### Error Handling

See separate file: `ERROR_HANDLING.md`

### Testing Strategy

See separate file: `TESTING_STRATEGY.md`

---

**End of Design Document**
