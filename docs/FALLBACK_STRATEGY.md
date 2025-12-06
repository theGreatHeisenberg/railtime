# RailTime Fallback Strategy

**Purpose:** Ensure RailTime remains functional when Caltrain real-time APIs are unavailable

---

## Overview

RailTime uses a **3-tier fallback strategy**:

1. **Tier 1 (Preferred):** Real-time Caltrain APIs
2. **Tier 2 (Fallback):** Static GTFS schedule data
3. **Tier 3 (Last Resort):** Cached stale data + error message

---

## Fallback Scenarios

### Scenario 1: Trip Updates API Down

**Impact:** Cannot get real-time ETAs

**Fallback:**
```typescript
✅ Use static schedule-data.json
✅ Calculate ETAs from scheduled times
✅ Show "SCHEDULED" badge
⚠️ No delay information available
⚠️ No real-time updates
```

**User sees:**
```
⚠️ Showing scheduled times. Real-time data unavailable.

Train #160 - Local
Departure: 8:15 AM 📅 (scheduled)
ETA: 5 min (estimated)
```

---

### Scenario 2: Vehicle Positions API Down

**Impact:** Cannot show live train location

**Fallback:**
```typescript
✅ Estimate position from schedule
✅ Calculate progress based on time
✅ Show corridor view with estimated position
⚠️ Position is interpolated, not GPS-based
⚠️ May be inaccurate if train is delayed
```

**User sees:**
```
ℹ️ Train position estimated from schedule.

[Corridor View]
  Station A ----●---- Station B
         (estimated position)
```

---

### Scenario 3: Service Alerts API Down

**Impact:** Cannot show service disruptions

**Fallback:**
```typescript
✅ Continue showing train data
⚠️ No alert notifications
⚠️ Users won't know about disruptions
```

**User sees:**
```
(No alerts shown, but app functions normally)
```

---

### Scenario 4: All Real-Time APIs Down

**Impact:** Complete loss of real-time data

**Fallback:**
```typescript
✅ Full static schedule mode
✅ All trains shown from GTFS
✅ Scheduled times only
⚠️ No live updates
⚠️ No current positions
⚠️ No delay information
```

**User sees:**
```
⚠️ SCHEDULED DATA ONLY
Real-time services unavailable. Showing today's schedule.

All times are scheduled and may not reflect actual arrivals.
Last real-time update: 10:45 AM (15 minutes ago)

[Refresh] button to retry
```

---

### Scenario 5: Static Data Missing

**Impact:** Cannot generate fallback schedules

**Fallback:**
```typescript
❌ Show error message
❌ Suggest running npm run build-schedule
❌ Provide link to Caltrain website
```

**User sees:**
```
❌ ERROR: Schedule data not found

Please run: npm run build-schedule

Or visit: caltrain.com for live schedules
```

---

## Implementation Details

### Fallback Decision Tree

```
Try fetch Trip Updates API
    ↓
  Success? ──YES──> Use real-time data
    ↓ NO
    ↓
Check static schedule-data.json exists?
    ↓
  YES ──> Generate schedule from static data
    ↓       Mark as "static" source
    ↓       Show warning banner
    ↓
  NO ──> Check stale cache?
    ↓
  YES ──> Use cached data (with warning)
    ↓       "Data may be outdated"
    ↓
  NO ──> Show error state
          "Unable to load train data"
```

---

### Code Implementation

#### Unified Data Fetcher with Fallback

```typescript
// lib/dataFetcher.ts

interface DataResult<T> {
  data: T;
  source: 'realtime' | 'static' | 'cached';
  fallbackReason?: string;
  message?: string;
  timestamp: number;
}

export async function fetchTripUpdatesWithFallback(): Promise<DataResult<TripUpdate[]>> {
  // Try real-time API
  try {
    const response = await fetchWithTimeout(
      'https://www.caltrain.com/files/rt/tripupdates/CT.json',
      5000
    );
    
    if (response.ok) {
      const data = await response.json();
      
      // Cache successful response
      cache.set('tripUpdates', {
        data,
        timestamp: Date.now()
      });
      
      return {
        data: data.Entities,
        source: 'realtime',
        timestamp: Date.now()
      };
    }
  } catch (error) {
    console.warn('Trip Updates API failed:', error.message);
  }
  
  // Fallback to static schedule
  try {
    const scheduleData = require('@/lib/schedule-data.json');
    const tripStopsData = require('@/lib/trip-stops-data.json');
    
    const staticTrips = generateTripsFromStaticSchedule(scheduleData, tripStopsData);
    
    return {
      data: staticTrips,
      source: 'static',
      fallbackReason: 'api-down',
      message: 'Real-time data unavailable. Showing scheduled times.',
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Static schedule unavailable:', error);
  }
  
  // Last resort: Use stale cache
  const cached = cache.get('tripUpdates');
  if (cached) {
    const ageMinutes = Math.floor((Date.now() - cached.timestamp) / 60000);
    
    return {
      data: cached.data,
      source: 'cached',
      fallbackReason: 'api-down',
      message: `Using cached data from ${ageMinutes} minutes ago. Real-time updates unavailable.`,
      timestamp: cached.timestamp
    };
  }
  
  // Complete failure
  throw new Error('No data available: Real-time API down, static data missing, no cache');
}
```

---

### Static Schedule Generator

```typescript
// lib/staticScheduleGenerator.ts

export function generateTripsFromStaticSchedule(
  scheduleData: Record<string, Record<string, string>>,
  tripStopsData: Record<string, string[]>
) {
  const now = new Date();
  const trips: TripUpdate[] = [];
  
  // Get current time in Pacific timezone
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Iterate through all trips in schedule
  for (const [tripId, stops] of Object.entries(scheduleData)) {
    const stopUpdates: StopTimeUpdate[] = [];
    
    // Get stop IDs in sequence
    const stopIds = tripStopsData[tripId] || Object.keys(stops);
    
    for (const stopId of stopIds) {
      const scheduledTime = stops[stopId];
      if (!scheduledTime) continue;
      
      // Parse time (e.g., "8:15 AM")
      const [time, period] = scheduledTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let adjustedHours = hours;
      if (period === 'PM' && hours !== 12) adjustedHours += 12;
      if (period === 'AM' && hours === 12) adjustedHours = 0;
      
      // Create Date object for today
      const stopTime = new Date();
      stopTime.setHours(adjustedHours, minutes, 0, 0);
      
      // Only include if stop is in the future (or recent past)
      const diffMinutes = differenceInMinutes(stopTime, now);
      if (diffMinutes < -5) continue; // Skip past stops
      
      stopUpdates.push({
        StopId: stopId,
        Arrival: { Time: Math.floor(stopTime.getTime() / 1000) },
        Departure: { Time: Math.floor(stopTime.getTime() / 1000) + 60 }
      });
    }
    
    // Only include trip if it has upcoming stops
    if (stopUpdates.length > 0) {
      trips.push({
        Id: tripId,
        TripUpdate: {
          Trip: {
            TripId: tripId,
            RouteId: inferRouteType(tripId),
            DirectionId: inferDirection(stopUpdates[0].StopId)
          },
          StopTimeUpdate: stopUpdates,
          Timestamp: Math.floor(now.getTime() / 1000)
        }
      });
    }
  }
  
  return trips;
}

function inferRouteType(tripId: string): string {
  if (tripId.startsWith('1') || tripId.startsWith('2')) return 'Local Weekday';
  if (tripId.startsWith('3') || tripId.startsWith('4')) return 'Limited';
  return 'Bullet';
}

function inferDirection(stopId: string): number {
  // Odd stop IDs = Northbound (0), Even = Southbound (1)
  return parseInt(stopId) % 2 === 0 ? 1 : 0;
}
```

---

### Position Estimation from Schedule

```typescript
// lib/positionEstimator.ts

export function estimateTrainPosition(
  tripId: string,
  stops: StopTimeUpdate[]
): EstimatedPosition | null {
  const now = Date.now() / 1000; // Unix timestamp
  
  // Find current segment
  for (let i = 0; i < stops.length - 1; i++) {
    const currentStop = stops[i];
    const nextStop = stops[i + 1];
    
    const departureTime = currentStop.Departure?.Time || currentStop.Arrival?.Time;
    const arrivalTime = nextStop.Arrival?.Time || nextStop.Departure?.Time;
    
    if (!departureTime || !arrivalTime) continue;
    
    // Check if train is in this segment
    if (now >= departureTime && now <= arrivalTime) {
      const totalTime = arrivalTime - departureTime;
      const elapsed = now - departureTime;
      const progress = elapsed / totalTime;
      
      return {
        currentSegment: {
          fromStopId: currentStop.StopId,
          toStopId: nextStop.StopId,
          progress: Math.min(Math.max(progress, 0), 1),
          etaToNextStop: Math.ceil((arrivalTime - now) / 60)
        },
        estimated: true,
        lastPassedStopId: currentStop.StopId,
        nextStopId: nextStop.StopId
      };
    }
  }
  
  // Train not currently active
  return null;
}
```

---

## Frontend Components

### 1. Data Source Banner

```typescript
// components/DataSourceBanner.tsx
export function DataSourceBanner({ metadata }: { metadata: APIMetadata }) {
  const { dataSource } = metadata;
  
  if (dataSource.type === 'realtime') {
    return null; // No banner when everything is live
  }
  
  const config = {
    static: {
      bgColor: 'bg-yellow-900/50',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-200',
      icon: '⚠️',
      title: 'Scheduled Data Only'
    },
    mixed: {
      bgColor: 'bg-blue-900/50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-200',
      icon: 'ℹ️',
      title: 'Limited Real-Time Data'
    },
    cached: {
      bgColor: 'bg-orange-900/50',
      borderColor: 'border-orange-500',
      textColor: 'text-orange-200',
      icon: '🕐',
      title: 'Using Cached Data'
    }
  }[dataSource.type];
  
  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-3 mb-4`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <div className={`font-bold text-sm ${config.textColor}`}>
            {config.title}
          </div>
          <div className={`text-xs ${config.textColor} opacity-90 mt-1`}>
            {dataSource.message}
          </div>
          {dataSource.lastRealtimeUpdate && (
            <div className="text-xs opacity-70 mt-1">
              Last live update: {formatDistanceToNow(dataSource.lastRealtimeUpdate)} ago
            </div>
          )}
        </div>
        <button
          onClick={() => window.location.reload()}
          className={`text-xs ${config.textColor} underline hover:opacity-80`}
        >
          Retry
        </button>
      </div>
      
      {/* Detailed source breakdown */}
      {dataSource.sources && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="text-xs opacity-75 space-y-1">
            <div>Trip Updates: {getSourceBadge(dataSource.sources.tripUpdates)}</div>
            <div>Vehicle Positions: {getSourceBadge(dataSource.sources.vehiclePositions)}</div>
            <div>Service Alerts: {getSourceBadge(dataSource.sources.serviceAlerts)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function getSourceBadge(source: string) {
  const badges = {
    realtime: '🟢 Live',
    static: '📅 Scheduled',
    unavailable: '🔴 Unavailable'
  };
  return badges[source] || '❓ Unknown';
}
```

---

### 2. Inline Data Source Indicators

```typescript
// components/ETADisplay.tsx
export function ETADisplay({ 
  eta, 
  isRealtime 
}: { 
  eta: string; 
  isRealtime: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold">{eta}</span>
      {!isRealtime && (
        <span 
          className="text-xs opacity-60 cursor-help" 
          title="Estimated from schedule (not live)"
        >
          📅
        </span>
      )}
    </div>
  );
}

// Usage
<ETADisplay 
  eta="5 min" 
  isRealtime={metadata.dataSource.type === 'realtime'} 
/>
```

---

### 3. Live Status Badge

```typescript
// components/LiveStatusBadge.tsx
export function LiveStatusBadge({ dataSource }: { dataSource: DataSource }) {
  const badges = {
    realtime: {
      color: 'bg-green-900 text-green-300 border-green-500',
      icon: '●',
      text: 'LIVE',
      animate: true
    },
    static: {
      color: 'bg-gray-700 text-gray-300 border-gray-500',
      icon: '📅',
      text: 'SCHEDULED',
      animate: false
    },
    mixed: {
      color: 'bg-blue-900 text-blue-300 border-blue-500',
      icon: 'ℹ️',
      text: 'PARTIAL',
      animate: false
    }
  };
  
  const badge = badges[dataSource.type];
  
  return (
    <div className={`px-2 py-1 ${badge.color} border text-xs rounded flex items-center gap-1`}>
      <span className={badge.animate ? 'animate-pulse' : ''}>
        {badge.icon}
      </span>
      <span className="font-mono">{badge.text}</span>
    </div>
  );
}
```

---

### 4. System Health Indicator

```typescript
// components/SystemHealthIndicator.tsx
export function SystemHealthIndicator() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    const checkHealth = async () => {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);
  
  if (!health || health.status === 'healthy' || dismissed) {
    return null;
  }
  
  const downServices = Object.entries(health.services)
    .filter(([_, service]) => service.status === 'down')
    .map(([name, _]) => name);
  
  return (
    <div className="fixed top-4 right-4 max-w-sm bg-yellow-900 border border-yellow-500 rounded-lg p-3 shadow-lg z-50">
      <div className="flex items-start gap-2">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          <div className="font-bold text-sm text-yellow-200">
            Limited Service
          </div>
          <div className="text-xs text-yellow-100 mt-1">
            {downServices.length} service(s) unavailable. Using scheduled data.
          </div>
          <div className="text-xs opacity-75 mt-2">
            Affected: {downServices.join(', ')}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-200 hover:text-yellow-100"
        >
          ✕
        </button>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 w-full text-xs bg-yellow-800 hover:bg-yellow-700 text-yellow-100 py-1 rounded"
      >
        Retry Connection
      </button>
    </div>
  );
}
```

---

## Testing Fallback Scenarios

### Manual Testing

#### Test 1: Simulate API Failure
```typescript
// app/api/journeys/route.ts (for testing)
const SIMULATE_API_FAILURE = process.env.SIMULATE_API_FAILURE === 'true';

if (SIMULATE_API_FAILURE) {
  throw new Error('Simulated API failure');
}
```

Run with:
```bash
SIMULATE_API_FAILURE=true npm run dev
```

---

#### Test 2: Simulate Slow API
```typescript
const SIMULATE_SLOW_API = process.env.SIMULATE_SLOW_API === 'true';

if (SIMULATE_SLOW_API) {
  await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay
}
```

---

#### Test 3: Remove Static Data
```bash
# Temporarily rename static files
mv lib/schedule-data.json lib/schedule-data.json.bak
mv lib/trip-stops-data.json lib/trip-stops-data.json.bak

# Test app behavior
npm run dev

# Restore files
mv lib/schedule-data.json.bak lib/schedule-data.json
mv lib/trip-stops-data.json.bak lib/trip-stops-data.json
```

---

### Automated Testing

```typescript
// __tests__/fallback.test.ts

describe('Fallback Strategy', () => {
  it('should use static data when Trip Updates API is down', async () => {
    // Mock API failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const result = await fetchTripUpdatesWithFallback();
    
    expect(result.source).toBe('static');
    expect(result.fallbackReason).toBe('api-down');
    expect(result.message).toContain('scheduled');
  });
  
  it('should use cached data when both API and static fail', async () => {
    // Mock API failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    // Mock static data missing
    jest.mock('@/lib/schedule-data.json', () => {
      throw new Error('File not found');
    });
    
    // Set cache
    cache.set('tripUpdates', {
      data: mockTripData,
      timestamp: Date.now() - 30000 // 30 seconds old
    });
    
    const result = await fetchTripUpdatesWithFallback();
    
    expect(result.source).toBe('cached');
    expect(result.message).toContain('cached data');
  });
  
  it('should throw error when all sources fail', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    jest.mock('@/lib/schedule-data.json', () => {
      throw new Error('File not found');
    });
    cache.clear();
    
    await expect(fetchTripUpdatesWithFallback()).rejects.toThrow('No data available');
  });
});
```

---

## User Communication Guidelines

### Message Tone

✅ **Good:**
- "Showing scheduled times. Real-time data unavailable."
- "Train position estimated from schedule."
- "Using cached data from 5 minutes ago."

❌ **Avoid:**
- "ERROR: API FAILURE"
- "System malfunction"
- "Data corrupted"

### Visual Hierarchy

1. **Critical (Red):** Complete data loss
2. **Warning (Yellow):** Using static/cached data
3. **Info (Blue):** Partial real-time data
4. **Success (Green):** All systems operational

### Actionable Feedback

Always provide:
- ✅ What's happening ("Real-time data unavailable")
- ✅ What we're doing ("Showing scheduled times")
- ✅ What user can do ("Refresh to retry")

---

## Monitoring & Alerts

### Metrics to Track

```typescript
// Track fallback events
metrics.increment('fallback.tripUpdates', {
  reason: 'api-down',
  timestamp: Date.now()
});

// Track API latency
metrics.timing('api.tripUpdates.latency', latencyMs);

// Track success rate
metrics.gauge('api.tripUpdates.successRate', successRate);
```

### Alert Thresholds

- **Warning:** > 10% requests using fallback
- **Critical:** > 50% requests using fallback
- **Emergency:** Static data also unavailable

---

## Recovery Behavior

### Automatic Recovery

```typescript
// Once API comes back online, automatically switch back
useEffect(() => {
  const checkAndRecover = async () => {
    if (metadata.dataSource.type !== 'realtime') {
      // Try fetching again
      const newData = await fetchJourneys(origin, destination);
      
      if (newData.metadata.dataSource.type === 'realtime') {
        // API recovered!
        showToast('✅ Real-time data restored', 'success');
        setJourneys(newData.journeys);
      }
    }
  };
  
  const interval = setInterval(checkAndRecover, 30000);
  return () => clearInterval(interval);
}, [metadata.dataSource.type]);
```

### User-Initiated Recovery

```typescript
// Refresh button
<button onClick={async () => {
  setIsRefreshing(true);
  try {
    const newData = await fetchJourneys(origin, destination);
    setJourneys(newData.journeys);
    
    if (newData.metadata.dataSource.type === 'realtime') {
      showToast('✅ Connected to real-time data', 'success');
    }
  } catch (error) {
    showToast('❌ Still unable to connect', 'error');
  } finally {
    setIsRefreshing(false);
  }
}}>
  {isRefreshing ? 'Retrying...' : 'Refresh'}
</button>
```

---

## Summary

### Fallback Priority

```
1. Real-time Caltrain APIs (preferred)
   ↓ (if down)
2. Static GTFS schedule data
   ↓ (if missing)
3. Stale cached data (< 5 min old)
   ↓ (if unavailable)
4. Error state with helpful message
```

### User Experience

- ✅ App always functional (never completely broken)
- ✅ Clear communication about data source
- ✅ Visual indicators (badges, banners)
- ✅ Automatic recovery when APIs return
- ✅ Manual retry option

### Developer Experience

- ✅ Centralized fallback logic
- ✅ Easy to test (environment variables)
- ✅ Comprehensive logging
- ✅ Monitoring integration ready

---

**End of Fallback Strategy Document**
