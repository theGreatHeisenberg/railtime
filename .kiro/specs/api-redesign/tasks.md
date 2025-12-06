# Implementation Plan

## Existing Implementation Status

The following components already exist and will be refactored/enhanced:
- `app/api/predictions/route.ts` - Station-specific predictions (to be replaced by journey-focused APIs)
- `app/api/vehicle-positions/route.ts` - Vehicle positions proxy (to be enhanced with fallback)
- `lib/caltrain.ts` - Data fetching utilities (to be enhanced with fallback logic)
- `lib/types.ts` - TypeScript interfaces (to be extended)
- Static GTFS data files in `lib/` (schedule-data.json, trip-stops-data.json, stations.json)

---

- [x] 1. Create shared data fetching infrastructure with fallback support
  - [x] 1.1 Create `lib/dataFetcher.ts` with unified data fetching and 3-tier fallback logic
    - Implement `fetchWithTimeout()` utility with 5-second timeout
    - Implement `getTripUpdatesWithFallback()` that tries real-time → cache → static
    - Implement `getVehiclePositionsWithFallback()` with position estimation fallback
    - Implement in-memory cache with TTL (10s for trip updates, 5s for positions)
    - _Requirements: 6.1, 6.2, 6.4, 10.1, 10.2, 10.3, 10.4_

  - [ ]* 1.2 Write property test for fallback behavior
    - **Property 15: Trip Updates Fallback Behavior**
    - **Property 17: Cache Priority in Fallback**
    - **Validates: Requirements 6.1, 6.4**

  - [x] 1.3 Create `lib/staticScheduleGenerator.ts` for generating trips from GTFS data
    - Implement `generateTripsFromStaticSchedule()` function
    - Implement `estimatePositionFromSchedule()` for position fallback
    - _Requirements: 6.1, 6.2_

  - [x] 1.4 Extend `lib/types.ts` with new API interfaces
    - Add `DataSource`, `ResponseMetadata`, `Journey`, `TripDetails`, `TrainPosition` interfaces
    - Add `ActiveJourney`, `SystemHealth`, `ServiceAlert` interfaces
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement Journey Search API (`/api/journeys`)
  - [x] 3.1 Create `app/api/journeys/route.ts` endpoint
    - Implement origin/destination filtering using Trip Updates API
    - Calculate journey metrics (stops between, duration, ETAs)
    - Sort results by origin ETA ascending
    - Include metadata with dataSource information
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 9.1_

  - [ ]* 3.2 Write property tests for Journey API
    - **Property 1: Journey Filtering Correctness**
    - **Property 2: Journey Response Completeness**
    - **Property 3: Journey Sorting Order**
    - **Property 4: Past Train Exclusion**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 4. Implement Train Details API (`/api/trains/[tripId]`)
  - [x] 4.1 Create `app/api/trains/[tripId]/route.ts` endpoint
    - Fetch complete stop timeline from Trip Updates API
    - Mark stops with segment labels (before-origin, journey, after-destination)
    - Include current position from Vehicle Positions API
    - Mark passed stops with status "passed" and null ETA
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 4.2 Write property tests for Train Details API
    - **Property 5: Stop Timeline Completeness**
    - **Property 6: Segment Labeling Correctness**
    - **Property 7: Passed Stop Marking**
    - **Validates: Requirements 2.1, 2.2, 2.4**

- [x] 5. Implement Train Position API (`/api/trains/[tripId]/position`)
  - [x] 5.1 Create `app/api/trains/[tripId]/position/route.ts` endpoint
    - Calculate current segment with from/to stations and progress
    - Include journey context when origin/destination provided
    - Mark position as estimated when GPS unavailable
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ]* 5.2 Write property tests for Position API
    - **Property 8: Position Response Structure**
    - **Property 9: Journey Context Calculation**
    - **Property 10: Position Estimation Marking**
    - **Validates: Requirements 3.1, 3.2, 3.4**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Active Journeys API (`/api/journeys/active`)
  - [x] 7.1 Create `app/api/journeys/active/route.ts` endpoint
    - Filter trains that departed origin within lookback period
    - Calculate minutes since departure and ETA to destination
    - Default lookbackMinutes to 30 when not provided
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 7.2 Write property tests for Active Journeys API
    - **Property 11: Active Journey Filtering**
    - **Property 12: Active Journey Response Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 8. Implement System Status API (`/api/system/status`)
  - [x] 8.1 Create `app/api/system/status/route.ts` endpoint
    - Fetch and aggregate service alerts from Caltrain API
    - Calculate system health metrics (active trains, data freshness)
    - Report degraded status when any API is down
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 8.2 Write property tests for System Status API
    - **Property 13: System Status Response Completeness**
    - **Property 14: Degraded Status Reporting**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Data Source UI Components
  - [x] 10.1 Create `components/DataSourceBanner.tsx`
    - Display yellow warning banner for static data
    - Display blue info banner for mixed data
    - Display orange banner for cached data with timestamp
    - Include retry button
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 10.2 Create `components/LiveStatusBadge.tsx`
    - Display green pulsing "LIVE" badge for realtime
    - Display gray "SCHEDULED" badge for static
    - Display blue "PARTIAL" badge for mixed
    - _Requirements: 8.1_

  - [x] 10.3 Create `components/ETADisplay.tsx`
    - Display ETA with calendar icon for non-realtime sources
    - _Requirements: 8.5_

  - [ ]* 10.4 Write property tests for UI indicator correctness
    - **Property 21: UI Indicator Correctness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 11. Implement metadata and error handling consistency
  - [x] 11.1 Create `lib/responseHelpers.ts` for consistent response formatting
    - Implement `createSuccessResponse()` with metadata
    - Implement `createErrorResponse()` with suggestions
    - Ensure all responses include timestamp and dataSource
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.1, 9.2_

  - [ ]* 11.2 Write property tests for response structure
    - **Property 18: Metadata Presence**
    - **Property 19: Non-Realtime Metadata Fields**
    - **Property 20: Mixed Source Breakdown**
    - **Property 22: Error Response Structure**
    - **Validates: Requirements 7.1, 7.2, 7.3, 9.1, 9.2**

- [x] 12. Implement automatic recovery behavior
  - [x] 12.1 Update data fetcher to always attempt real-time first
    - Ensure each request tries real-time APIs before fallback
    - Automatically switch back to realtime when APIs recover
    - _Requirements: 11.1, 11.2_

  - [ ]* 12.2 Write property tests for recovery behavior
    - **Property 23: Recovery Attempt on Request**
    - **Property 24: Automatic Recovery**
    - **Validates: Requirements 11.1, 11.2**

- [x] 13. Integrate new APIs with existing frontend components
  - [x] 13.1 Create `components/JourneySearch.tsx` using new Journey API
    - Implement origin/destination selection
    - Display journey list with DataSourceBanner and LiveStatusBadge
    - Auto-refresh every 30 seconds
    - _Requirements: 1.1, 1.2, 8.1, 8.2_

  - [x] 13.2 Update `components/TerminalTimelineView.tsx` to use Train Details API
    - Fetch complete stop timeline from new API
    - Display segment labels and passed stop indicators
    - Show data source indicators
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 13.3 Update `components/TerminalCorridorView.tsx` to use Position API
    - Fetch position from new API
    - Display estimated indicator when position is estimated
    - Show journey context information
    - _Requirements: 3.1, 3.2, 3.4_

- [ ] 14. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Deprecate old API endpoints
  - [ ] 15.1 Add deprecation notices to old endpoints
    - Add console warnings to `/api/predictions` route
    - Document migration path in code comments
    - Keep old endpoints functional during transition
    - _Requirements: N/A (migration task)_
