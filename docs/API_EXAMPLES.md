# RailTime API Response Examples

This document shows concrete examples of API responses in different scenarios.

---

## 1. Journey Search API

### Example 1: Real-Time Data (Normal Operation)

**Request:**
```
GET /api/journeys?origin=Sunnyvale&destination=San Francisco
```

**Response:**
```json
{
  "journeys": [
    {
      "tripId": "160",
      "vehicleId": "160",
      "trainNumber": "160",
      "trainType": "Local",
      "direction": "NB",
      "origin": {
        "stopId": "70231",
        "stopName": "Sunnyvale",
        "scheduledTime": "8:15 AM",
        "predictedTime": "8:17 AM",
        "etaMinutes": 5,
        "status": "approaching",
        "delayMinutes": 2,
        "delayStatus": "on-time"
      },
      "destination": {
        "stopId": "70012",
        "stopName": "San Francisco",
        "scheduledTime": "9:15 AM",
        "predictedTime": "9:17 AM",
        "etaMinutes": 65,
        "delayMinutes": 2
      },
      "totalStops": 22,
      "stopsToOrigin": 5,
      "stopsBetween": 10,
      "stopsAfterDestination": 7,
      "journeyDuration": 60,
      "currentPosition": {
        "lastPassedStop": "Mountain View",
        "nextStop": "Sunnyvale",
        "stopsUntilOrigin": 1
      }
    },
    {
      "tripId": "162",
      "trainNumber": "162",
      "trainType": "Local",
      "direction": "NB",
      "origin": {
        "stopId": "70231",
        "stopName": "Sunnyvale",
        "scheduledTime": "8:45 AM",
        "predictedTime": "8:45 AM",
        "etaMinutes": 35,
        "status": "scheduled",
        "delayMinutes": 0,
        "delayStatus": "on-time"
      },
      "destination": {
        "stopId": "70012",
        "stopName": "San Francisco",
        "scheduledTime": "9:45 AM",
        "predictedTime": "9:45 AM",
        "etaMinutes": 95,
        "delayMinutes": 0
      },
      "totalStops": 22,
      "stopsToOrigin": 0,
      "stopsBetween": 10,
      "stopsAfterDestination": 12,
      "journeyDuration": 60
    }
  ],
  "metadata": {
    "origin": {
      "stopId": "70231",
      "stopName": "Sunnyvale"
    },
    "destination": {
      "stopId": "70012",
      "stopName": "San Francisco"
    },
    "timestamp": 1764647671,
    "direction": "NB",
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

---

### Example 2: Fallback to Static Schedule

**Request:**
```
GET /api/journeys?origin=Sunnyvale&destination=San Francisco
```

**Response:**
```json
{
  "journeys": [
    {
      "tripId": "160",
      "vehicleId": "160",
      "trainNumber": "160",
      "trainType": "Local",
      "direction": "NB",
      "origin": {
        "stopId": "70231",
        "stopName": "Sunnyvale",
        "scheduledTime": "8:15 AM",
        "predictedTime": "8:15 AM",
        "etaMinutes": 5,
        "status": "scheduled",
        "delayMinutes": 0,
        "delayStatus": "on-time"
      },
      "destination": {
        "stopId": "70012",
        "stopName": "San Francisco",
        "scheduledTime": "9:15 AM",
        "predictedTime": "9:15 AM",
        "etaMinutes": 65,
        "delayMinutes": 0
      },
      "totalStops": 22,
      "stopsToOrigin": 0,
      "stopsBetween": 10,
      "stopsAfterDestination": 12,
      "journeyDuration": 60
    }
  ],
  "metadata": {
    "origin": {
      "stopId": "70231",
      "stopName": "Sunnyvale"
    },
    "destination": {
      "stopId": "70012",
      "stopName": "San Francisco"
    },
    "timestamp": 1764647671,
    "direction": "NB",
    "dataSource": {
      "type": "static",
      "realtimeAvailable": false,
      "fallbackReason": "api-down",
      "message": "Real-time data unavailable. Showing scheduled times only.",
      "lastRealtimeUpdate": 1764646000,
      "sources": {
        "tripUpdates": "static",
        "vehiclePositions": "static",
        "serviceAlerts": "unavailable"
      }
    }
  }
}
```

**Frontend Display:**
```
⚠️ SCHEDULED DATA ONLY
Real-time data unavailable. Showing scheduled times only.
Last live update: 28 minutes ago

Train #160 - Local 📅
Departure: 8:15 AM (scheduled)
ETA: 5 min (estimated)
```

---

### Example 3: Mixed Mode (Partial Real-Time)

**Request:**
```
GET /api/journeys?origin=Sunnyvale&destination=San Francisco
```

**Response:**
```json
{
  "journeys": [...],
  "metadata": {
    "origin": {...},
    "destination": {...},
    "timestamp": 1764647671,
    "direction": "NB",
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

**Frontend Display:**
```
ℹ️ LIMITED REAL-TIME DATA
Train positions estimated from schedule. Arrival times are real-time.

Train #160 - Local
Departure: 8:17 AM ✓ (live)
Position: Between Mountain View and Sunnyvale 📅 (estimated)
```

---

## 2. Train Details API

### Example 1: Real-Time Data

**Request:**
```
GET /api/trains/160?origin=Sunnyvale&destination=San Francisco
```

**Response:**
```json
{
  "trip": {
    "tripId": "160",
    "vehicleId": "160",
    "trainNumber": "160",
    "trainType": "Local",
    "direction": "NB",
    "routeId": "Local Weekday",
    "status": "active",
    "currentPosition": {
      "latitude": 37.3944,
      "longitude": -122.07579,
      "bearing": -63.01,
      "lastPassedStopId": "70211",
      "lastPassedStopName": "Mountain View",
      "nextStopId": "70231",
      "nextStopName": "Sunnyvale",
      "etaToNextStop": 3
    },
    "stops": [
      {
        "stopId": "70012",
        "stopName": "San Francisco",
        "stopSequence": 1,
        "scheduledArrival": "7:15 AM",
        "predictedArrival": "7:15 AM",
        "scheduledDeparture": "7:15 AM",
        "predictedDeparture": "7:15 AM",
        "etaMinutes": null,
        "delayMinutes": 0,
        "status": "passed",
        "segment": "before-origin"
      },
      {
        "stopId": "70211",
        "stopName": "Mountain View",
        "stopSequence": 10,
        "scheduledArrival": "8:05 AM",
        "predictedArrival": "8:07 AM",
        "scheduledDeparture": "8:06 AM",
        "predictedDeparture": "8:08 AM",
        "etaMinutes": null,
        "delayMinutes": 2,
        "status": "passed",
        "segment": "before-origin"
      },
      {
        "stopId": "70231",
        "stopName": "Sunnyvale",
        "stopSequence": 11,
        "scheduledArrival": "8:15 AM",
        "predictedArrival": "8:17 AM",
        "scheduledDeparture": "8:15 AM",
        "predictedDeparture": "8:17 AM",
        "etaMinutes": 5,
        "delayMinutes": 2,
        "status": "next",
        "isOrigin": true,
        "segment": "journey"
      },
      {
        "stopId": "70241",
        "stopName": "Santa Clara",
        "stopSequence": 12,
        "scheduledArrival": "8:25 AM",
        "predictedArrival": "8:27 AM",
        "scheduledDeparture": "8:25 AM",
        "predictedDeparture": "8:27 AM",
        "etaMinutes": 15,
        "delayMinutes": 2,
        "status": "upcoming",
        "segment": "journey"
      }
    ],
    "alerts": []
  },
  "metadata": {
    "timestamp": 1764647671,
    "dataAge": 2,
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

---

### Example 2: Static Fallback

**Request:**
```
GET /api/trains/160?origin=Sunnyvale&destination=San Francisco
```

**Response:**
```json
{
  "trip": {
    "tripId": "160",
    "vehicleId": "160",
    "trainNumber": "160",
    "trainType": "Local",
    "direction": "NB",
    "routeId": "Local Weekday",
    "status": "scheduled",
    "currentPosition": null,
    "stops": [
      {
        "stopId": "70231",
        "stopName": "Sunnyvale",
        "stopSequence": 11,
        "scheduledArrival": "8:15 AM",
        "predictedArrival": "8:15 AM",
        "scheduledDeparture": "8:15 AM",
        "predictedDeparture": "8:15 AM",
        "etaMinutes": 5,
        "delayMinutes": 0,
        "status": "upcoming",
        "isOrigin": true,
        "segment": "journey"
      }
    ],
    "alerts": []
  },
  "metadata": {
    "timestamp": 1764647671,
    "dataAge": 0,
    "dataSource": {
      "type": "static",
      "realtimeAvailable": false,
      "fallbackReason": "api-down",
      "message": "Real-time data unavailable. Showing scheduled times and estimated positions.",
      "lastRealtimeUpdate": 1764646000,
      "sources": {
        "tripUpdates": "static",
        "vehiclePositions": "static",
        "serviceAlerts": "unavailable"
      }
    }
  }
}
```

**Frontend Display:**
```
⚠️ SCHEDULED DATA ONLY
Real-time data unavailable. Showing scheduled times and estimated positions.
Last live update: 28 minutes ago

Train #160 - Local 📅

Timeline View:
✓ San Francisco - 7:15 AM (passed)
✓ Mountain View - 8:05 AM (passed)
→ Sunnyvale - 8:15 AM (next) ← YOUR ORIGIN
  Santa Clara - 8:25 AM
  ...

Note: Times are scheduled. Actual arrivals may vary.
```

---

## 3. Train Position API

### Example 1: Real-Time Position

**Request:**
```
GET /api/trains/160/position?origin=Sunnyvale&destination=San Francisco
```

**Response:**
```json
{
  "position": {
    "tripId": "160",
    "trainNumber": "160",
    "currentSegment": {
      "from": {
        "stopId": "70211",
        "stopName": "Mountain View",
        "stopSequence": 10,
        "departureTime": "8:08 AM"
      },
      "to": {
        "stopId": "70231",
        "stopName": "Sunnyvale",
        "stopSequence": 11,
        "arrivalTime": "8:17 AM",
        "etaMinutes": 3
      },
      "progress": 0.67
    },
    "journeyContext": {
      "stationsUntilOrigin": 1,
      "stationsBetweenOriginAndDestination": 10,
      "stationsAfterDestination": 12,
      "currentSegment": "to-origin",
      "nextStations": [
        {
          "stopName": "Sunnyvale",
          "etaMinutes": 3,
          "isOrigin": true,
          "isDestination": false
        },
        {
          "stopName": "Santa Clara",
          "etaMinutes": 13,
          "isOrigin": false,
          "isDestination": false
        }
      ]
    }
  },
  "metadata": {
    "timestamp": 1764647671,
    "dataSource": {
      "type": "realtime",
      "realtimeAvailable": true,
      "sources": {
        "tripUpdates": "realtime",
        "vehiclePositions": "realtime"
      }
    }
  }
}
```

**Frontend Display (Corridor View):**
```
🟢 LIVE

Mountain View ----●------------ Sunnyvale
              (67% progress)
              
Next: Sunnyvale (3 min)
Then: Santa Clara (13 min)

Journey: 1 station until origin
```

---

### Example 2: Estimated Position (Fallback)

**Request:**
```
GET /api/trains/160/position?origin=Sunnyvale&destination=San Francisco
```

**Response:**
```json
{
  "position": {
    "tripId": "160",
    "trainNumber": "160",
    "currentSegment": {
      "from": {
        "stopId": "70211",
        "stopName": "Mountain View",
        "stopSequence": 10,
        "departureTime": "8:06 AM"
      },
      "to": {
        "stopId": "70231",
        "stopName": "Sunnyvale",
        "stopSequence": 11,
        "arrivalTime": "8:15 AM",
        "etaMinutes": 5
      },
      "progress": 0.5,
      "estimated": true
    },
    "journeyContext": {
      "stationsUntilOrigin": 1,
      "stationsBetweenOriginAndDestination": 10,
      "stationsAfterDestination": 12,
      "currentSegment": "to-origin",
      "nextStations": [
        {
          "stopName": "Sunnyvale",
          "etaMinutes": 5,
          "isOrigin": true,
          "isDestination": false
        }
      ]
    }
  },
  "metadata": {
    "timestamp": 1764647671,
    "dataSource": {
      "type": "static",
      "realtimeAvailable": false,
      "fallbackReason": "api-down",
      "message": "Train position estimated from schedule.",
      "sources": {
        "tripUpdates": "static",
        "vehiclePositions": "static"
      }
    }
  }
}
```

**Frontend Display (Corridor View):**
```
📅 SCHEDULED

Mountain View ----●------------ Sunnyvale
              (estimated)
              
Next: Sunnyvale (5 min) 📅

⚠️ Position estimated from schedule. May not reflect actual location.
```

---

## 4. Active Journeys API (Past Trains)

### Example 1: Real-Time Tracking

**Request:**
```
GET /api/journeys/active?origin=Sunnyvale&destination=San Francisco&lookbackMinutes=30
```

**Response:**
```json
{
  "activeJourneys": [
    {
      "tripId": "158",
      "trainNumber": "158",
      "trainType": "Local",
      "direction": "NB",
      "origin": {
        "stopName": "Sunnyvale",
        "departedAt": "8:05 AM",
        "minutesAgo": 7
      },
      "destination": {
        "stopName": "San Francisco",
        "etaMinutes": 53,
        "predictedTime": "9:05 AM"
      },
      "currentPosition": {
        "lastPassedStop": "Santa Clara",
        "nextStop": "San Jose Diridon",
        "stopsUntilDestination": 8
      }
    }
  ],
  "metadata": {
    "timestamp": 1764647671,
    "dataSource": {
      "type": "realtime",
      "realtimeAvailable": true,
      "sources": {
        "tripUpdates": "realtime",
        "vehiclePositions": "realtime"
      }
    }
  }
}
```

**Frontend Display:**
```
🟢 YOUR TRAIN (LIVE)

Train #158 - Local
Departed Sunnyvale 7 minutes ago

Current: Between Santa Clara and San Jose Diridon
Next Stop: San Jose Diridon (2 min)
Arriving at San Francisco in 53 min
```

---

### Example 2: Static Tracking (Fallback)

**Response:**
```json
{
  "activeJourneys": [
    {
      "tripId": "158",
      "trainNumber": "158",
      "trainType": "Local",
      "direction": "NB",
      "origin": {
        "stopName": "Sunnyvale",
        "departedAt": "8:05 AM",
        "minutesAgo": 7
      },
      "destination": {
        "stopName": "San Francisco",
        "etaMinutes": 53,
        "predictedTime": "9:05 AM"
      },
      "currentPosition": {
        "lastPassedStop": "Santa Clara",
        "nextStop": "San Jose Diridon",
        "stopsUntilDestination": 8,
        "estimated": true
      }
    }
  ],
  "metadata": {
    "timestamp": 1764647671,
    "dataSource": {
      "type": "static",
      "realtimeAvailable": false,
      "fallbackReason": "api-down",
      "message": "Tracking based on schedule. Actual position may vary.",
      "sources": {
        "tripUpdates": "static",
        "vehiclePositions": "static"
      }
    }
  }
}
```

**Frontend Display:**
```
📅 YOUR TRAIN (SCHEDULED)

⚠️ Tracking based on schedule. Actual position may vary.

Train #158 - Local
Departed Sunnyvale 7 minutes ago (scheduled)

Estimated: Between Santa Clara and San Jose Diridon
Next Stop: San Jose Diridon (~2 min)
Estimated arrival at San Francisco: 9:05 AM
```

---

## 5. System Status API

### Example 1: All Systems Operational

**Request:**
```
GET /api/system/status
```

**Response:**
```json
{
  "alerts": [],
  "systemHealth": {
    "activeTrains": 12,
    "dataFreshness": 5,
    "apiStatus": "operational",
    "services": {
      "tripUpdates": {
        "status": "up",
        "latency": 234,
        "lastCheck": 1764647671
      },
      "vehiclePositions": {
        "status": "up",
        "latency": 189,
        "lastCheck": 1764647671
      },
      "serviceAlerts": {
        "status": "up",
        "latency": 156,
        "lastCheck": 1764647671
      }
    }
  },
  "metadata": {
    "timestamp": 1764647671,
    "dataSource": {
      "type": "realtime",
      "realtimeAvailable": true
    }
  }
}
```

---

### Example 2: Degraded Service

**Request:**
```
GET /api/system/status
```

**Response:**
```json
{
  "alerts": [
    {
      "id": "9449",
      "severity": "critical",
      "title": "Service Disruption",
      "description": "Bus service replaces electric train service between Tamien and San Jose Diridon.",
      "affectedStations": ["Tamien", "San Jose Diridon"],
      "affectedRoutes": ["Local Weekday"],
      "startTime": "2025-06-15T00:00:00Z"
    }
  ],
  "systemHealth": {
    "activeTrains": 0,
    "dataFreshness": 120,
    "apiStatus": "degraded",
    "services": {
      "tripUpdates": {
        "status": "down",
        "error": "Request timeout",
        "lastCheck": 1764647671
      },
      "vehiclePositions": {
        "status": "down",
        "error": "Request timeout",
        "lastCheck": 1764647671
      },
      "serviceAlerts": {
        "status": "up",
        "latency": 456,
        "lastCheck": 1764647671
      }
    }
  },
  "metadata": {
    "timestamp": 1764647671,
    "dataSource": {
      "type": "static",
      "realtimeAvailable": false,
      "fallbackReason": "api-down",
      "message": "Real-time services unavailable. Using scheduled data.",
      "sources": {
        "tripUpdates": "static",
        "vehiclePositions": "static",
        "serviceAlerts": "realtime"
      }
    }
  }
}
```

**Frontend Display:**
```
⚠️ SYSTEM STATUS: DEGRADED

Real-time services unavailable. Using scheduled data.

🔴 Trip Updates: Down
🔴 Vehicle Positions: Down
🟢 Service Alerts: Operational

[Refresh] to retry connection

---

🚨 SERVICE ALERT
Bus service replaces electric train service between 
Tamien and San Jose Diridon.
```

---

## Frontend Integration Examples

### 1. Journey List with Data Source Indicator

```typescript
// components/JourneyList.tsx
export function JourneyList({ journeys, metadata }) {
  return (
    <div>
      {/* Data source banner */}
      <DataSourceBanner metadata={metadata} />
      
      {/* Live status badge */}
      <div className="flex items-center justify-between mb-4">
        <h2>Available Trains</h2>
        <LiveStatusBadge dataSource={metadata.dataSource} />
      </div>
      
      {/* Train cards */}
      {journeys.map(journey => (
        <TrainCard 
          key={journey.tripId} 
          journey={journey}
          isRealtime={metadata.dataSource.type === 'realtime'}
        />
      ))}
    </div>
  );
}
```

---

### 2. Train Card with Inline Indicators

```typescript
// components/TrainCard.tsx
export function TrainCard({ journey, isRealtime }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold">Train #{journey.trainNumber}</span>
          <span className="text-sm ml-2">({journey.trainType})</span>
        </div>
        {!isRealtime && (
          <span className="text-xs bg-gray-700 px-2 py-1 rounded">
            📅 SCHEDULED
          </span>
        )}
      </div>
      
      <div className="mt-2 flex items-center gap-2">
        <span>Departure: {journey.origin.predictedTime}</span>
        {!isRealtime && (
          <span className="text-xs opacity-60" title="Scheduled time">
            📅
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <span>ETA: {journey.origin.etaMinutes} min</span>
        {!isRealtime && (
          <span className="text-xs opacity-60" title="Estimated from schedule">
            📅
          </span>
        )}
      </div>
    </div>
  );
}
```

---

### 3. Corridor View with Fallback Indicator

```typescript
// components/CorridorView.tsx
export function CorridorView({ position, metadata }) {
  const isEstimated = metadata.dataSource.type !== 'realtime';
  
  return (
    <div>
      {isEstimated && (
        <div className="bg-blue-900/30 border border-blue-500 p-2 mb-4 text-xs">
          ℹ️ Position estimated from schedule. May not reflect actual location.
        </div>
      )}
      
      <div className="relative">
        {/* Station markers */}
        <StationMarker name={position.currentSegment.from.stopName} />
        
        {/* Train icon */}
        <TrainIcon 
          progress={position.currentSegment.progress}
          estimated={isEstimated}
        />
        
        <StationMarker name={position.currentSegment.to.stopName} />
      </div>
      
      <div className="mt-2 text-sm">
        Next: {position.currentSegment.to.stopName} 
        ({position.currentSegment.etaMinutes} min)
        {isEstimated && <span className="ml-1">📅</span>}
      </div>
    </div>
  );
}
```

---

## Error States

### Complete Failure (No Data Available)

**Response:**
```json
{
  "error": "No data available",
  "message": "Unable to load train data. Real-time APIs are down and static schedule is missing.",
  "suggestions": [
    "Check your internet connection",
    "Try refreshing the page",
    "Visit caltrain.com for official schedules"
  ],
  "metadata": {
    "timestamp": 1764647671,
    "dataSource": {
      "type": "unavailable",
      "realtimeAvailable": false,
      "fallbackReason": "error",
      "sources": {
        "tripUpdates": "unavailable",
        "vehiclePositions": "unavailable",
        "serviceAlerts": "unavailable"
      }
    }
  }
}
```

**Frontend Display:**
```
❌ UNABLE TO LOAD TRAIN DATA

Real-time services are unavailable and schedule data is missing.

Suggestions:
• Check your internet connection
• Try refreshing the page
• Visit caltrain.com for official schedules

[Refresh Page] [Visit Caltrain.com]
```

---

## Testing Checklist

### Manual Testing

- [ ] Test with all APIs working (normal operation)
- [ ] Test with Trip Updates API down
- [ ] Test with Vehicle Positions API down
- [ ] Test with Service Alerts API down
- [ ] Test with all APIs down
- [ ] Test with static data missing
- [ ] Test with stale cached data
- [ ] Test automatic recovery when APIs return
- [ ] Test manual refresh button
- [ ] Verify all user messages are clear and helpful

### Visual Testing

- [ ] Banner appears when using static data
- [ ] Inline indicators show on ETAs
- [ ] Live status badge updates correctly
- [ ] Corridor view shows "estimated" label
- [ ] Timeline view indicates scheduled times
- [ ] Error states are user-friendly

---

**End of API Examples Document**
