
export interface Station {
    stop1: string;
    stop2: string;
    stopname: string;
    urlname: string;
    lat: number;
    lon: number;
}

export interface TrainPrediction {
    TrainNumber: string;
    TrainType: string;
    ETA: string; // "10 min" or "12:30 PM"
    Departure: string;
    RouteID: string;
    StopID: string;
    Direction: "NB" | "SB";
    LineType?: string;
    timestamp: number;
    stopIds: string[];
    ScheduledTime?: string; // e.g. "8:00 AM"
    delayMinutes?: number; // positive = late, negative = early, 0 = on-time
    delayStatus?: "on-time" | "early" | "delayed"; // For easy color coding
}

export interface CaltrainResponse {
    data: {
        stop: {
            field_location: {
                latlon: [string, string];
            }[];
        };
        predictions: {
            TripUpdate: {
                Trip: {
                    TripId: string;
                    RouteId: string;
                    DirectionId: number;
                };
                StopTimeUpdate: {
                    StopId: string;
                    Arrival?: { Time: number };
                    Departure?: { Time: number };
                }[];
            };
        }[];
    }[];
    meta: {
        routes: Record<string, { title: { value: string }[] }>;
    };
}

export interface VehiclePosition {
    Id: string;
    Vehicle: {
        Trip: {
            TripId: string;
            RouteId: string;
            DirectionId: number; // 0 for NB, 1 for SB (usually)
        };
        Position: {
            Latitude: number;
            Longitude: number;
            Bearing: number;
            Speed?: number;
        };
        Timestamp: number;
    };
}

export interface VehiclePositionsResponse {
    Header: {
        Timestamp: number;
    };
    Entities: VehiclePosition[];
}


// ============================================
// New API Types for Journey-Focused Architecture
// ============================================

// Time Filter Types
export type TimeFilterMode = 'arrive_by' | 'leave_by';

export interface TimeFilterInfo {
  mode: TimeFilterMode;
  targetTime: string;                // Human-readable format
  targetTimestamp: number;           // Unix timestamp
  message?: string;                  // e.g., "No trains arrive before 9:00 AM"
}

export interface ValidatedTimeFilter {
  mode: TimeFilterMode;
  targetTimestamp: number;
}

export type TimeFilterValidation = 
  | { valid: true; filter: ValidatedTimeFilter }
  | { valid: false; error: string; code: number };

// Data Source Types
export type DataSourceType = 'realtime' | 'static' | 'mixed' | 'cached' | 'unavailable';
export type FallbackReason = 'api-down' | 'timeout' | 'error';
export type ServiceStatusType = 'realtime' | 'static' | 'unavailable';

export interface DataSource {
  type: DataSourceType;
  realtimeAvailable: boolean;
  fallbackReason?: FallbackReason;
  message?: string;
  lastRealtimeUpdate?: number;
  sources?: {
    tripUpdates: ServiceStatusType;
    vehiclePositions: ServiceStatusType;
    serviceAlerts: ServiceStatusType;
  };
}

export interface ResponseMetadata {
  timestamp: number;
  dataSource: DataSource;
}

// Stop Information Types
export interface StopInfo {
  stopId: string;
  stopName: string;
  scheduledTime: string;
  predictedTime: string;
  etaMinutes: number | null;
  status: 'approaching' | 'boarding' | 'departed' | 'scheduled' | 'passed';
  delayMinutes: number;
  delayStatus: 'on-time' | 'delayed' | 'early';
}

export interface DepartedStopInfo extends StopInfo {
  minutesAgo: number;
  actualDeparture: string;
}

export interface UpcomingStopInfo extends StopInfo {
  etaMinutes: number;
}

// Position Types
export interface SegmentStop {
  stopId: string;
  stopName: string;
  lat?: number;
  lon?: number;
}

export interface Segment {
  from: SegmentStop;
  to: SegmentStop;
  progress: number; // 0-1
  estimated?: boolean;
}

export interface CurrentPosition {
  lat: number;
  lon: number;
  bearing?: number;
  speed?: number;
  timestamp: number;
}

export interface JourneyContext {
  stationsUntilOrigin: number;
  stationsBetweenOriginAndDestination: number;
  stationsAfterDestination: number;
}

export interface DetailedPosition extends CurrentPosition {
  lastPassedStop: SegmentStop;
  nextStop: SegmentStop;
  progressToNextStop: number;
}

// Journey Types
export type TrainType = 'Local' | 'Limited' | 'Bullet';
export type Direction = 'NB' | 'SB';

export interface Journey {
  tripId: string;
  vehicleId?: string;
  trainNumber: string;
  trainType: TrainType;
  direction: Direction;
  origin: StopInfo;
  destination: StopInfo;
  totalStops: number;
  stopsToOrigin: number;
  stopsBetween: number;
  stopsAfterDestination: number;
  journeyDuration: number;
  currentPosition?: CurrentPosition;
  // Time filter context fields
  minutesBeforeTarget?: number;      // Minutes before targetTime (arrival or departure)
  isBestMatch?: boolean;             // True for the journey closest to targetTime
  // Data source indicator
  isRealtime?: boolean;              // True if from realtime API, false if from static schedule
  isPartialRealtime?: boolean;       // True if origin is realtime but destination is from schedule
}

export interface ActiveJourney {
  tripId: string;
  trainNumber: string;
  trainType: TrainType;
  direction: Direction;
  origin: DepartedStopInfo;
  destination: UpcomingStopInfo;
  currentPosition?: CurrentPosition;
}

// Train Details Types
export type StopSegment = 'before-origin' | 'journey' | 'after-destination';
export type TripStatus = 'scheduled' | 'active' | 'completed';

export interface StopTimeline extends StopInfo {
  segment?: StopSegment;
  scheduledArrival: string;
  predictedArrival: string;
  scheduledDeparture?: string;
  predictedDeparture?: string;
  isFromStaticSchedule?: boolean;  // True if this stop data is from static schedule (not realtime)
}

export interface TripDetails {
  tripId: string;
  vehicleId?: string;
  trainNumber: string;
  trainType: TrainType;
  direction: Direction;
  routeId: string;
  status: TripStatus;
  currentPosition?: DetailedPosition;
  stops: StopTimeline[];
  alerts: ServiceAlert[];
}

// Train Position Types
export interface TrainPosition {
  tripId: string;
  trainNumber: string;
  currentSegment: Segment;
  journeyContext?: JourneyContext;
}

// System Status Types
export type ApiStatusType = 'operational' | 'degraded' | 'down';
export type ServiceStatus = 'up' | 'down' | 'degraded';

export interface SystemHealth {
  activeTrains: number;
  dataFreshness: number;
  apiStatus: ApiStatusType;
  services: {
    tripUpdates: ServiceStatus;
    vehiclePositions: ServiceStatus;
    serviceAlerts: ServiceStatus;
  };
}

export interface ServiceAlert {
  id: string;
  severity: 'info' | 'warning' | 'severe';
  title: string;
  description: string;
  affectedStations?: string[];
  startTime?: number;
  endTime?: number;
}

// API Response Types
export interface JourneySearchResponse {
  journeys: Journey[];
  metadata: ResponseMetadata;
  timeFilterInfo?: TimeFilterInfo;   // Info about applied filter
  suggestions?: string[];            // Suggestions when no results match
}

export interface TrainDetailsResponse {
  trip: TripDetails;
  metadata: ResponseMetadata;
}

export interface PositionResponse {
  position: TrainPosition;
  metadata: ResponseMetadata;
}

export interface ActiveJourneysResponse {
  activeJourneys: ActiveJourney[];
  metadata: ResponseMetadata;
}

export interface SystemStatusResponse {
  alerts: ServiceAlert[];
  systemHealth: SystemHealth;
  metadata: ResponseMetadata;
}

export interface ErrorResponse {
  error: string;
  message: string;
  suggestions: string[];
  metadata: {
    timestamp: number;
    dataSource: {
      type: 'unavailable';
      realtimeAvailable: false;
      fallbackReason: FallbackReason;
      sources: {
        tripUpdates: 'unavailable';
        vehiclePositions: 'unavailable';
        serviceAlerts: 'unavailable';
      };
    };
  };
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Caltrain API Types (for internal use)
export interface CaltrainTripUpdate {
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
}

export interface CaltrainTripUpdatesResponse {
  Header: {
    Timestamp: number;
  };
  Entities: CaltrainTripUpdate[];
}
