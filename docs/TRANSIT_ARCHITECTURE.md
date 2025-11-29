# TrackTrain Transit Architecture Analysis & Refactoring Plan

## Current Architecture Overview

### Data Sources
1. **GTFS Static Data** (`/gtfs_data/`)
   - `stops.txt`: Station metadata (lat/lon, names, stop_ids)
   - `stop_times.txt`: Complete schedule (trip_id → stop_id → times)
   - `trips.txt`: Trip metadata (trip_id, route_id, direction, headsign)
   - `routes.txt`: Route information
   - Pre-processed into `schedule-data.json` via `build-schedule.ts`

2. **GTFS Realtime API** (Caltrain)
   - **Vehicle Positions**: Real-time train locations (lat/lon, bearing, speed)
   - **Trip Updates/Predictions**: Arrival/departure predictions for each stop

3. **Frontend State**
   - `stations.json`: Simplified station list with NB/SB stop pairs
   - Local state for vehicle positions and predictions

### Current Data Flow

```
GTFS Static Files
    ↓
build-schedule.ts → schedule-data.json (trip_id → stop_id → time)
    ↓
/api/predictions
    ├─→ Fetches Caltrain GTFS-RT Predictions API
    ├─→ Merges with schedule-data.json
    └─→ Returns TrainPrediction[] with stopIds array
         ↓
CaltrainDisplay (Frontend)
    ├─→ Fetches predictions per station
    ├─→ TrainApproachView consumes train.stopIds
    └─→ Matches stopIds against stations for visualization
```

## Identified Issues

### 1. **stopIds Matching Problem** ✅ FIXED
**Symptom**: Train 160 shows all stations as "Express (No Stop)" when it's actually Local

**Root Cause** (CONFIRMED):
- The `/api/predictions` route was extracting `tripStopIds` from GTFS-RT TripUpdate.StopTimeUpdate array
- **BUG**: `tripStopIds` was being extracted INSIDE the loop that filters by station
- This meant each prediction only got the stop IDs for THAT specific station (array of 1 element)
- Example: Train 160 at Menlo Park had `stopIds: ['70162']` instead of all 22 stops
- Result: Only the current station matched as "scheduled", all others showed as "Express"

**Fix Applied**:
- Moved `tripStopIds` extraction to LINE 40 (before the filtering loop)
- Now `tripStopIds` contains ALL stop IDs for the entire trip
- Added comment: "IMPORTANT: Extract ALL stop IDs for the entire trip (not filtered by station)"

**Verification**:
- Browser console showed: `stopIds: Array(1)` with only `['70162']`
- After fix: Should show `stopIds: Array(22)` with all stops from San Francisco to San Jose

### 2. **Schedule Data Dependency**
- `schedule-data.json` created at build time from GTFS
- May become stale if GTFS data changes
- No runtime fallback if schedule lookup fails

### 3. **Train Type Classification**
- Hard-coded logic based on train number prefixes
- Should use GTFS `routes.txt` and `route_id` for accuracy

### 4. **Next Stop Logic**
- Currently uses geometric position proximity
- Should use GTFS `stop_sequence` for deterministic ordering
- Doesn't account for trains that may skip future stops

### 5. **Delay Calculation**
- Not implemented
- Need to compare GTFS-RT predicted time vs GTFS static scheduled time

## Proposed Refactoring Plan

### Phase 1: Fix Immediate Issues (Priority: HIGH)
**Goal**: Get stopIds matching working correctly

#### Task 1.1: Verify stopIds Population
- [ ] Check browser console logs for train 160
- [ ] Verify `/api/predictions` is returning complete stopIds array
- [ ] Confirm stopIds match GTFS stop_times.txt data

#### Task 1.2: Fix Any Data Mismatches
- [ ] If stopIds is empty/undefined: Fix API extraction logic
- [ ] If stopIds has wrong format: Fix array population
- [ ] Add error handling for missing stopIds

### Phase 2: Enhanced GTFS Service Layer (Priority: MEDIUM)
**Goal**: Create robust, type-safe GTFS data access

#### Task 2.1: Create GTFS Parser Service
```typescript
// lib/gtfs/parser.ts
class GTFSParser {
  async parseStops(): Promise<Map<string, GTFSStop>>
  async parseStopTimes(): Promise<Map<string, GTFSStopTime[]>>
  async parseTrips(): Promise<Map<string, GTFSTrip>>
  async parseRoutes(): Promise<Map<string, GTFSRoute>>
}
```

#### Task 2.2: Build Trip Lookup Service
```typescript
// lib/gtfs/trip-service.ts
class TripService {
  getTripStops(tripId: string): GTFSStopTime[]
  getScheduledTime(tripId: string, stopId: string): Date
  getNextStop(tripId: string, currentStopSequence: number): GTFSStopTime
  isStopScheduled(tripId: string, stopId: string): boolean
}
```

### Phase 3: Unified Data Model (Priority: MEDIUM)
**Goal**: Merge static GTFS, real-time positions, and predictions

#### Task 3.1: Enhanced TrainPrediction Type
```typescript
interface EnhancedTrainPrediction {
  // Existing fields
  TrainNumber: string;
  Direction: "NB" | "SB";
  ETA: string;

  // Enhanced fields
  tripId: string;
  routeId: string;
  stopSequence: number; // Current stop sequence

  // Schedule data
  scheduledStops: ScheduledStop[]; // All stops for this trip
  nextScheduledStop: ScheduledStop | null;

  // Delay info
  delayMinutes: number; // positive = late, negative = early
  isOnTime: boolean;

  // Position
  vehiclePosition: VehiclePosition | null;
}

interface ScheduledStop {
  stopId: string;
  stopName: string;
  sequence: number;
  scheduledArrival: Date;
  predictedArrival: Date | null;
  isPassed: boolean;
  isSkipped: boolean; // Express train skip
}
```

### Phase 4: Robust Next Stop Logic (Priority: HIGH)
**Goal**: Use GTFS stop_sequence for deterministic next stop

#### Task 4.1: Stop Sequence Based Logic
```typescript
function getNextStop(train: EnhancedTrainPrediction): ScheduledStop | null {
  const currentSeq = train.stopSequence;
  return train.scheduledStops
    .filter(stop => stop.sequence > currentSeq && !stop.isSkipped)
    .sort((a, b) => a.sequence - b.sequence)[0] || null;
}
```

### Phase 5: Delay Indicators & Visualization (Priority: LOW)
**Goal**: Show on-time performance

#### Task 5.1: Calculate Delays
```typescript
function calculateDelay(
  predictedTime: Date,
  scheduledTime: Date
): number {
  return differenceInMinutes(predictedTime, scheduledTime);
}
```

#### Task 5.2: Visual Indicators
- Green badge: On time (< 2 min delay)
- Yellow badge: Slightly delayed (2-5 min)
- Red badge: Significantly delayed (> 5 min)

### Phase 6: Testing & Documentation (Priority: MEDIUM)

#### Task 6.1: Unit Tests
- [ ] Test stopIds matching for all train types
- [ ] Test next stop calculation
- [ ] Test delay calculation
- [ ] Test edge cases (terminus, express trains)

#### Task 6.2: Documentation
- [ ] Document GTFS data model
- [ ] API documentation
- [ ] Component usage guide
- [ ] Data flow diagrams

## Implementation Timeline

### Week 1: Critical Fixes
- Debug and fix stopIds matching issue
- Add comprehensive logging
- Fix train 160 display

### Week 2: GTFS Service Layer
- Build GTFS parser service
- Create trip lookup utilities
- Add caching layer

### Week 3: Enhanced Data Model
- Implement EnhancedTrainPrediction
- Migrate components to new model
- Add delay calculations

### Week 4: Polish & Testing
- Visual improvements
- Comprehensive testing
- Documentation
- Performance optimization

## Success Metrics

1. **Accuracy**: 100% of scheduled stops correctly identified
2. **Performance**: < 500ms API response time
3. **Reliability**: Graceful degradation when data is missing
4. **UX**: Clear visual distinction between scheduled and express stops
5. **Maintainability**: Well-documented, type-safe codebase

## Open Questions

1. How often should we refresh GTFS static data?
2. Should we pre-compute trip-to-stops mappings at build time?
3. What's the fallback strategy if GTFS-RT API is down?
4. Should we cache vehicle positions client-side?
5. How to handle schedule changes (service alerts)?

## Notes for Development

- Use TypeScript strict mode for all new code
- Add JSDoc comments for complex logic
- Consider React Query for data fetching/caching
- Use Zod for runtime validation of GTFS data
- Add Sentry for error tracking in production
