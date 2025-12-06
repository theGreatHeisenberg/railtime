# Requirements Document

## Introduction

This document specifies the requirements for redesigning RailTime's API architecture to support enhanced journey tracking features. The redesign transforms the current station-specific predictions API into a journey-focused system that enables source-to-destination train filtering, real-time train position tracking, complete trip timeline visualization, and past train tracking for users already on board. The system includes a robust fallback strategy to ensure functionality when Caltrain real-time APIs are unavailable.

## Glossary

- **Journey:** A train trip from a user's origin station to their destination station
- **Trip Updates API:** Caltrain's real-time API providing complete stop lists with ETAs for all active trains
- **Vehicle Positions API:** Caltrain's real-time API providing GPS coordinates for active trains
- **Service Alerts API:** Caltrain's real-time API providing service disruption information
- **Static GTFS Data:** Pre-processed schedule data from Caltrain's General Transit Feed Specification files
- **Fallback Mode:** Operating state when real-time APIs are unavailable, using static schedule data
- **Data Source Indicator:** UI element showing whether displayed data is real-time, scheduled, or cached
- **ETA:** Estimated Time of Arrival in minutes
- **Stop Sequence:** The ordered list of stations a train visits during its trip
- **Corridor View:** Visual representation showing train position between stations
- **Timeline View:** Chronological list of all stops on a train's route with arrival/departure times

## Requirements

### Requirement 1: Journey Search

**User Story:** As a commuter, I want to search for trains from my origin to my destination, so that I can see only relevant trains for my journey.

#### Acceptance Criteria

1. WHEN a user provides origin and destination station names THEN the Journey API SHALL return all trains that stop at both stations in the correct order
2. WHEN the Journey API returns results THEN each journey SHALL include origin ETA, destination ETA, train type, direction, and journey duration
3. WHEN trains are returned THEN the Journey API SHALL sort results by ETA at the origin station in ascending order
4. WHEN a train has already passed the origin station THEN the Journey API SHALL exclude that train from results unless includeInProgress parameter is true
5. WHEN the origin equals the destination THEN the Journey API SHALL return an error indicating invalid parameters

### Requirement 2: Train Details

**User Story:** As a commuter, I want to view complete details about a specific train, so that I can see all stops and current status.

#### Acceptance Criteria

1. WHEN a user requests train details by trip ID THEN the Train Details API SHALL return the complete stop timeline with scheduled and predicted times
2. WHEN origin and destination parameters are provided THEN the Train Details API SHALL mark stops as before-origin, journey, or after-destination segments
3. WHEN a train is currently active THEN the Train Details API SHALL include current position information with last passed stop and next stop
4. WHEN stops have already been passed THEN the Train Details API SHALL mark those stops with status "passed" and set etaMinutes to null
5. WHEN service alerts affect the train THEN the Train Details API SHALL include relevant alerts in the response

### Requirement 3: Train Position Tracking

**User Story:** As a commuter tracking my train, I want to see the train's position between stations, so that I can visualize where the train is on its route.

#### Acceptance Criteria

1. WHEN a user requests train position THEN the Position API SHALL return the current segment with from-station, to-station, and progress percentage
2. WHEN origin and destination are provided THEN the Position API SHALL include journey context with stations until origin, stations between, and stations after destination
3. WHEN real-time GPS data is available THEN the Position API SHALL calculate progress based on actual position
4. WHEN real-time GPS data is unavailable THEN the Position API SHALL estimate progress based on scheduled times and mark the position as estimated
5. WHEN the train is at a station THEN the Position API SHALL set progress to 0 or 1 depending on arrival or departure status

### Requirement 4: Past Train Tracking

**User Story:** As a commuter who has boarded a train, I want to continue tracking my train after it departs my origin station, so that I can monitor my journey progress.

#### Acceptance Criteria

1. WHEN a user requests active journeys THEN the Active Journeys API SHALL return trains that departed the origin within the lookback period and have not yet reached the destination
2. WHEN an active journey is returned THEN the response SHALL include minutes since departure from origin and ETA to destination
3. WHEN the lookbackMinutes parameter is provided THEN the Active Journeys API SHALL only include trains that departed within that time window
4. WHEN the lookbackMinutes parameter is omitted THEN the Active Journeys API SHALL use a default value of 30 minutes
5. WHEN no trains match the active journey criteria THEN the Active Journeys API SHALL return an empty array

### Requirement 5: System Status and Alerts

**User Story:** As a commuter, I want to see system-wide service alerts and status, so that I can be aware of disruptions affecting my journey.

#### Acceptance Criteria

1. WHEN a user requests system status THEN the System Status API SHALL return all active service alerts with severity, title, description, and affected stations
2. WHEN the system status is requested THEN the response SHALL include health metrics for active train count and data freshness
3. WHEN any Caltrain API is down THEN the System Status API SHALL report degraded status with details of affected services
4. WHEN all Caltrain APIs are operational THEN the System Status API SHALL report operational status

### Requirement 6: Graceful Degradation

**User Story:** As a commuter, I want the app to remain functional when real-time data is unavailable, so that I can still access train schedules.

#### Acceptance Criteria

1. WHEN the Trip Updates API is unavailable THEN the system SHALL fall back to static GTFS schedule data and indicate the data source as "static"
2. WHEN the Vehicle Positions API is unavailable THEN the system SHALL estimate train positions from schedule times and mark positions as "estimated"
3. WHEN falling back to static data THEN the system SHALL include a user-friendly message explaining that scheduled times are being shown
4. WHEN cached data exists and is less than 5 minutes old THEN the system SHALL use cached data as a fallback before static data
5. WHEN all data sources fail THEN the system SHALL return an error with helpful suggestions including retry and external links

### Requirement 7: Data Source Transparency

**User Story:** As a commuter, I want to know whether I'm seeing real-time or scheduled data, so that I can understand the reliability of the information.

#### Acceptance Criteria

1. WHEN any API returns data THEN the response metadata SHALL include dataSource type as "realtime", "static", "mixed", or "cached"
2. WHEN data source is not realtime THEN the response metadata SHALL include a fallbackReason and user-friendly message
3. WHEN mixed data sources are used THEN the response metadata SHALL specify which individual sources are realtime, static, or unavailable
4. WHEN cached data is used THEN the response metadata SHALL include the timestamp of the last successful real-time update

### Requirement 8: Frontend Data Source Indicators

**User Story:** As a commuter, I want visual indicators showing data freshness, so that I can quickly understand the reliability of displayed information.

#### Acceptance Criteria

1. WHEN data source is realtime THEN the UI SHALL display a green "LIVE" badge with a pulsing indicator
2. WHEN data source is static THEN the UI SHALL display a yellow warning banner explaining that scheduled times are shown
3. WHEN data source is mixed THEN the UI SHALL display a blue info banner explaining partial real-time availability
4. WHEN data source is cached THEN the UI SHALL display an orange banner showing how long ago the data was fetched
5. WHEN displaying ETAs from non-realtime sources THEN the UI SHALL show a calendar icon (📅) next to the time

### Requirement 9: API Response Format

**User Story:** As a frontend developer, I want consistent API response formats, so that I can reliably parse and display data.

#### Acceptance Criteria

1. WHEN any journey-related API returns successfully THEN the response SHALL include a metadata object with timestamp and dataSource information
2. WHEN an API encounters an error THEN the response SHALL include an error message, suggestions array, and metadata with dataSource showing unavailable status
3. WHEN times are returned THEN the API SHALL provide both human-readable format (e.g., "8:15 AM") and Unix timestamps
4. WHEN delays exist THEN the API SHALL include both delayMinutes and delayStatus fields

### Requirement 10: Caching and Performance

**User Story:** As a system operator, I want efficient caching to reduce API load, so that the system performs well under high traffic.

#### Acceptance Criteria

1. WHEN Trip Updates are fetched THEN the system SHALL cache results for 10 seconds before making another external API call
2. WHEN Vehicle Positions are fetched THEN the system SHALL cache results for 5 seconds before making another external API call
3. WHEN multiple frontend requests arrive within the cache TTL THEN the system SHALL serve cached data without additional external API calls
4. WHEN external API calls are made THEN the system SHALL use a 5-second timeout to prevent blocking on slow responses

### Requirement 11: Automatic Recovery

**User Story:** As a commuter, I want the app to automatically recover when real-time data becomes available again, so that I don't have to manually refresh.

#### Acceptance Criteria

1. WHEN the system is in fallback mode THEN the system SHALL attempt to reconnect to real-time APIs on each subsequent request
2. WHEN real-time APIs recover THEN the system SHALL automatically switch back to real-time data without user intervention
3. WHEN recovery occurs THEN the UI SHALL update the data source indicators to reflect the restored real-time status
4. WHEN the user clicks a refresh button THEN the system SHALL immediately attempt to fetch fresh data from real-time APIs
