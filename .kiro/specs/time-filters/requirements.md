# Requirements Document

## Introduction

This document specifies the requirements for adding time-based journey filtering to RailTime. The feature enables users to search for trains based on arrival or departure time constraints (similar to Google Maps "arrive by" and "leave by" options), allowing commuters to find trains that fit their schedule by specifying when they need to arrive at their destination or when they want to leave from their origin.

## Glossary

- **Arrive By:** A time constraint specifying when the user wants to reach their destination station
- **Leave By:** A time constraint specifying when the user wants to depart from their origin station  
- **Journey Planner:** The system component that calculates train connections with time constraints
- **Time Filter Mode:** The type of time constraint applied ("arrive_by", "leave_by", or "none")
- **Time Constraint:** A user-specified time that filters which trains are shown in results

## Requirements

### Requirement 1: Arrive By Time Filtering

**User Story:** As a commuter, I want to specify when I need to arrive at my destination, so that I can find trains that get me there on time.

#### Acceptance Criteria

1. WHEN a user provides an "arrive_by" time constraint THEN the Journey Planner SHALL return only trains that arrive at the destination station at or before the specified time
2. WHEN filtering by arrive_by time THEN the Journey Planner SHALL sort results by arrival time at destination in descending order (latest arrival first, giving user maximum flexibility)
3. WHEN no trains arrive before the specified time THEN the Journey Planner SHALL return an empty result with a message indicating no trains meet the constraint
4. WHEN the arrive_by time is in the past THEN the Journey Planner SHALL return an error indicating the time must be in the future

### Requirement 2: Leave By Time Filtering

**User Story:** As a commuter, I want to specify when I want to leave from my origin station, so that I can find trains departing around my preferred time.

#### Acceptance Criteria

1. WHEN a user provides a "leave_by" time constraint THEN the Journey Planner SHALL return only trains that depart from the origin station at or before the specified time
2. WHEN filtering by leave_by time THEN the Journey Planner SHALL sort results by departure time from origin in descending order (latest departure first)
3. WHEN no trains depart before the specified time THEN the Journey Planner SHALL return an empty result with a message indicating no trains meet the constraint
4. WHEN the leave_by time is in the past THEN the Journey Planner SHALL return an error indicating the time must be in the future

### Requirement 3: Time Filter API Parameters

**User Story:** As a frontend developer, I want clear API parameters for time filtering, so that I can integrate time-based search into the UI.

#### Acceptance Criteria

1. WHEN the Journey API receives a timeFilter parameter THEN the API SHALL accept values "arrive_by" or "leave_by"
2. WHEN a timeFilter is provided THEN the API SHALL require a corresponding targetTime parameter in ISO 8601 format or Unix timestamp
3. WHEN no timeFilter parameter is provided THEN the Journey API SHALL default to showing upcoming trains sorted by departure time (existing behavior)
4. WHEN timeFilter is provided without targetTime THEN the API SHALL return a 400 error with a clear message
5. WHEN targetTime format is invalid THEN the API SHALL return a 400 error specifying the expected format

### Requirement 4: Time Filter UI Controls

**User Story:** As a commuter, I want an intuitive interface to set time constraints, so that I can easily specify my arrival or departure preferences.

#### Acceptance Criteria

1. WHEN the user accesses the journey search THEN the UI SHALL display an optional time filter dropdown with "Depart Now", "Leave By", and "Arrive By" options
2. WHEN the user selects "Leave By" or "Arrive By" THEN the UI SHALL display a time picker for selecting the target time
3. WHEN "Depart Now" is selected THEN the UI SHALL hide the time picker and show upcoming trains
4. WHEN the user changes the time filter settings THEN the UI SHALL automatically refresh the journey results
5. WHEN displaying the time picker THEN the UI SHALL default to the next hour rounded up from current time

### Requirement 5: Time Filter Result Display

**User Story:** As a commuter, I want to clearly see how trains relate to my time constraint, so that I can make informed decisions.

#### Acceptance Criteria

1. WHEN displaying filtered results THEN the UI SHALL highlight the relevant time (arrival for arrive_by, departure for leave_by)
2. WHEN a train arrives or departs close to the constraint time THEN the UI SHALL visually indicate this is a "best match"
3. WHEN showing arrive_by results THEN the UI SHALL display how many minutes before the target time each train arrives
4. WHEN showing leave_by results THEN the UI SHALL display how many minutes before the target time each train departs
5. WHEN no results match the filter THEN the UI SHALL suggest trying a later time or switching filter modes

### Requirement 6: Quick Time Selection

**User Story:** As a commuter, I want quick-select time options, so that I can rapidly set common time constraints without manual entry.

#### Acceptance Criteria

1. WHEN the time picker is displayed THEN the UI SHALL show quick-select buttons for common times (e.g., "9 AM", "12 PM", "5 PM", "6 PM")
2. WHEN a quick-select button is clicked THEN the UI SHALL set the target time and trigger a search
3. WHEN displaying quick-select options THEN the UI SHALL only show times that are in the future
4. WHEN the current time is past a quick-select option THEN the UI SHALL hide or disable that option

