
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
