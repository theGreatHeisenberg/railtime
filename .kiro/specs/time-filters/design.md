# Design Document: Time-Based Journey Filtering

## Overview

This design document outlines the architecture for adding time-based journey filtering to RailTime. The feature extends the existing Journey API to support "arrive by" and "leave by" time constraints, allowing users to find trains that fit their schedule. The implementation builds on the existing journey-focused API architecture, adding new query parameters and filtering logic while maintaining backward compatibility.

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              JourneySearch Component                         ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │ Station      │  │ Time Filter  │  │ Time Picker      │  ││
│  │  │ Selectors    │  │ Dropdown     │  │ (conditional)    │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Journey API (/api/journeys)                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Query Parameters:                                           ││
│  │  - origin, destination (existing)                            ││
│  │  - timeFilter: "arrive_by" | "leave_by" (new)               ││
│  │  - targetTime: ISO 8601 | Unix timestamp (new)              ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Time Filter Logic                               ││
│  │  1. Fetch all journeys (existing logic)                     ││
│  │  2. Apply time constraint filter                            ││
│  │  3. Sort by relevant time (arrival/departure)               ││
│  │  4. Return filtered results                                 ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Time Filter Decision Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Journey API Request                           │
│         ?origin=X&destination=Y&timeFilter=Z&targetTime=T       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │ Validate Parameters       │
              │ - timeFilter enum valid?  │
              │ - targetTime present?     │
              │ - targetTime in future?   │
              └───────────────┬───────────┘
                              │
              ┌───────────────┴───────────┐
              │                           │
         Valid                       Invalid
              │                           │
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │ Fetch journeys  │         │ Return 400      │
    │ (existing flow) │         │ with error msg  │
    └────────┬────────┘         └─────────────────┘
             │
             ▼
    ┌─────────────────────────────────────┐
    │ Apply Time Filter                    │
    │                                      │
    │ if timeFilter == "arrive_by":       │
    │   filter: arrival <= targetTime     │
    │   sort: arrival DESC                │
    │                                      │
    │ if timeFilter == "leave_by":        │
    │   filter: departure <= targetTime   │
    │   sort: departure DESC              │
    │                                      │
    │ if no timeFilter:                   │
    │   sort: departure ASC (default)     │
    └────────────────┬────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────┐
    │ Return Response                      │
    │ - journeys[] (filtered & sorted)    │
    │ - metadata (with filter info)       │
    │ - message (if empty results)        │
    └─────────────────────────────────────┘
```

## Components and Interfaces

### API Extensions

#### Extended Journey Search API (`/api/journeys`)

```typescript
// Extended request parameters
interface JourneySearchRequest {
  origin: string;                    // Station name (existing)
  destination: string;               // Station name (existing)
  includeInProgress?: boolean;       // Include departed trains (existing)
  timeFilter?: TimeFilterMode;       // NEW: "arrive_by" | "leave_by"
  targetTime?: string | number;      // NEW: ISO 8601 string or Unix timestamp
}

type TimeFilterMode = 'arrive_by' | 'leave_by';

// Extended response
interface JourneySearchResponse {
  journeys: Journey[];
  metadata: ResponseMetadata;
  timeFilterInfo?: TimeFilterInfo;   // NEW: Info about applied filter
}

interface TimeFilterInfo {
  mode: TimeFilterMode;
  targetTime: string;                // Human-readable format
  targetTimestamp: number;           // Unix timestamp
  message?: string;                  // e.g., "No trains arrive before 9:00 AM"
}
```

#### Extended Journey Type

```typescript
// Extended Journey with time filter context
interface Journey {
  // ... existing fields ...
  tripId: string;
  trainNumber: string;
  trainType: TrainType;
  direction: Direction;
  origin: StopInfo;
  destination: StopInfo;
  journeyDuration: number;
  
  // NEW: Time filter context fields
  minutesBeforeTarget?: number;      // Minutes before targetTime (arrival or departure)
  isBestMatch?: boolean;             // True for the journey closest to targetTime
}
```

### Frontend Components

#### TimeFilterSelector Component

```typescript
interface TimeFilterSelectorProps {
  value: TimeFilterMode | 'depart_now';
  onChange: (mode: TimeFilterMode | 'depart_now') => void;
}

// Dropdown options
const TIME_FILTER_OPTIONS = [
  { value: 'depart_now', label: 'Depart Now' },
  { value: 'leave_by', label: 'Leave By' },
  { value: 'arrive_by', label: 'Arrive By' },
];
```

#### TimePicker Component

```typescript
interface TimePickerProps {
  value: Date;
  onChange: (time: Date) => void;
  minTime?: Date;                    // Minimum selectable time (now)
}

// Quick select times
const QUICK_SELECT_TIMES = [
  { hour: 9, label: '9 AM' },
  { hour: 12, label: '12 PM' },
  { hour: 17, label: '5 PM' },
  { hour: 18, label: '6 PM' },
];
```

#### Extended JourneySearch Component

```typescript
interface JourneySearchState {
  origin: string;
  destination: string;
  timeFilterMode: TimeFilterMode | 'depart_now';
  targetTime: Date | null;
}
```

### Utility Functions

```typescript
// Time filter utilities
function filterJourneysByArriveBy(
  journeys: Journey[],
  targetTime: number
): Journey[];

function filterJourneysByLeaveBy(
  journeys: Journey[],
  targetTime: number
): Journey[];

function sortJourneysByTime(
  journeys: Journey[],
  mode: TimeFilterMode
): Journey[];

function calculateMinutesBeforeTarget(
  journeyTime: number,
  targetTime: number
): number;

function getNextHourRoundedUp(now: Date): Date;

function isTimeInFuture(time: number, now: number): boolean;

function getFutureQuickSelectTimes(now: Date): QuickSelectTime[];
```

## Data Models

### Request/Response Types

```typescript
// API Request validation
interface TimeFilterParams {
  timeFilter?: string;
  targetTime?: string;
}

interface ValidatedTimeFilter {
  mode: TimeFilterMode;
  targetTimestamp: number;
}

// Validation result
type TimeFilterValidation = 
  | { valid: true; filter: ValidatedTimeFilter }
  | { valid: false; error: string; code: number };
```

### UI State Types

```typescript
interface TimeFilterState {
  mode: 'depart_now' | 'arrive_by' | 'leave_by';
  targetTime: Date | null;
  isPickerOpen: boolean;
}

interface QuickSelectTime {
  hour: number;
  minute: number;
  label: string;
  disabled: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Arrive By Filter Correctness
*For any* set of journeys and arrive_by target time, all journeys returned by the filter SHALL have destination arrival times less than or equal to the target time.
**Validates: Requirements 1.1**

### Property 2: Arrive By Sort Order
*For any* list of journeys filtered by arrive_by with length > 1, each journey's destination arrival time SHALL be greater than or equal to the next journey's destination arrival time (descending order).
**Validates: Requirements 1.2**

### Property 3: Leave By Filter Correctness
*For any* set of journeys and leave_by target time, all journeys returned by the filter SHALL have origin departure times less than or equal to the target time.
**Validates: Requirements 2.1**

### Property 4: Leave By Sort Order
*For any* list of journeys filtered by leave_by with length > 1, each journey's origin departure time SHALL be greater than or equal to the next journey's origin departure time (descending order).
**Validates: Requirements 2.2**

### Property 5: Past Time Rejection
*For any* targetTime that is before the current time, the API SHALL return an error response regardless of timeFilter mode.
**Validates: Requirements 1.4, 2.4**

### Property 6: Default Sort Order Preservation
*For any* journey search without timeFilter parameter, the results SHALL be sorted by origin departure time in ascending order.
**Validates: Requirements 3.3**

### Property 7: Time Format Validation
*For any* invalid targetTime format (not ISO 8601 or Unix timestamp), the API SHALL return a 400 error.
**Validates: Requirements 3.5**

### Property 8: Minutes Before Target Calculation
*For any* journey with arrive_by filter, the minutesBeforeTarget field SHALL equal (targetTime - arrivalTime) / 60000, rounded to nearest integer.
**Validates: Requirements 5.3**

### Property 9: Minutes Before Target Calculation (Leave By)
*For any* journey with leave_by filter, the minutesBeforeTarget field SHALL equal (targetTime - departureTime) / 60000, rounded to nearest integer.
**Validates: Requirements 5.4**

### Property 10: Quick Select Future Times Only
*For any* current time, the quick select options returned SHALL only include times where the hour is greater than the current hour (or equal with greater minutes).
**Validates: Requirements 6.3**

### Property 11: Default Time Picker Value
*For any* current time, the default time picker value SHALL be the next hour with minutes set to 0 (e.g., 2:45 PM → 3:00 PM).
**Validates: Requirements 4.5**

## Error Handling

### Validation Errors

| Scenario | HTTP Status | Error Message |
|----------|-------------|---------------|
| timeFilter without targetTime | 400 | "targetTime is required when timeFilter is specified" |
| Invalid timeFilter value | 400 | "timeFilter must be 'arrive_by' or 'leave_by'" |
| Invalid targetTime format | 400 | "targetTime must be ISO 8601 format or Unix timestamp" |
| targetTime in past | 400 | "targetTime must be in the future" |

### Empty Results Handling

```typescript
interface EmptyResultsResponse {
  journeys: [];
  metadata: ResponseMetadata;
  timeFilterInfo: {
    mode: TimeFilterMode;
    targetTime: string;
    targetTimestamp: number;
    message: string;  // e.g., "No trains arrive at Palo Alto before 9:00 AM"
  };
  suggestions: string[];  // e.g., ["Try a later time", "Switch to 'Leave By' mode"]
}
```

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
│   ├── time-filter-api.test.ts
│   ├── time-filter-utils.test.ts
│   └── time-picker.test.ts
├── properties/
│   ├── time-filter.property.ts
│   └── time-calculations.property.ts
└── integration/
    └── time-filter-flow.test.ts
```

### Property Test Annotations

Each property-based test MUST include a comment referencing the correctness property:

```typescript
// **Feature: time-filters, Property 1: Arrive By Filter Correctness**
// **Validates: Requirements 1.1**
test.prop([journeysArb, targetTimeArb])('all filtered journeys arrive before target', ...);
```

### Test Generators

```typescript
// Arbitrary generators for property tests
const timeFilterModeArb = fc.constantFrom('arrive_by', 'leave_by');

const futureTimestampArb = fc.integer({ 
  min: Date.now(), 
  max: Date.now() + 24 * 60 * 60 * 1000 
});

const pastTimestampArb = fc.integer({ 
  min: Date.now() - 24 * 60 * 60 * 1000, 
  max: Date.now() - 1 
});

const journeyArb = fc.record({
  tripId: fc.string(),
  trainNumber: fc.string(),
  origin: fc.record({
    etaMinutes: fc.integer({ min: 0, max: 120 }),
    predictedTime: fc.string(),
  }),
  destination: fc.record({
    etaMinutes: fc.integer({ min: 0, max: 180 }),
    predictedTime: fc.string(),
  }),
});

const journeysArb = fc.array(journeyArb, { minLength: 0, maxLength: 20 });
```

### Unit Test Coverage

- Time filter parameter validation
- Arrive by filtering logic
- Leave by filtering logic
- Sort order verification
- Minutes before target calculation
- Quick select time generation
- Default time picker value calculation
- Error response formatting
- Empty results handling
