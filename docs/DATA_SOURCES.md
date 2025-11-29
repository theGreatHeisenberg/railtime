# TrackTrain Data Sources & Usage

## 📊 Current Architecture Summary

TrackTrain combines **3 data sources** to provide accurate, real-time train tracking:

### 1. 🗂️ **GTFS Static Data** (Pre-processed at Build Time)
**Location**: `/gtfs_data/*.txt` → processed into `/lib/*.json`

#### Files Used:
- **`stop_times.txt`** → Complete schedule for every trip
- **`trips.txt`** → Trip metadata (route, direction, headsign)
- **`stops.txt`** → Station info (name, lat/lon, stop IDs)

#### Build Process:
```bash
npm run build-schedule
# Runs: scripts/build-schedule.ts
# Outputs:
#   - lib/schedule-data.json (trip_id → stop_id → formatted_time)
#   - lib/trip-stops-data.json (trip_id → [stop_ids in sequence])
```

#### What We Use It For:
✅ **Complete list of scheduled stops** for each train (e.g., train 160 has 22 stops)
✅ **Static scheduled times** (e.g., "8:15 AM" departure)
✅ **Stop sequence** (order of stations on route)
✅ **Station metadata** (names, coordinates for map visualization)

**Refresh Rate**: Only when GTFS data is updated (typically weekly/monthly)

---

### 2. 🔴 **GTFS Realtime - Predictions API** (Live Data)
**Endpoint**: `https://www.caltrain.com/gtfs/stops/{station}/predictions`
**Our Proxy**: `/api/predictions?station={name}&stop1={id}&stop2={id}`

#### What Caltrain Returns:
```json
{
  "data": [{
    "predictions": [{
      "TripUpdate": {
        "Trip": { "TripId": "160", "RouteId": "...", "DirectionId": 1 },
        "StopTimeUpdate": [
          {
            "StopId": "70172",  // Only the stop we queried!
            "Arrival": { "Time": 1732849800 },
            "Departure": { "Time": 1732849800 }
          }
        ]
      }
    }]
  }]
}
```

#### ⚠️ **API Limitation**:
The predictions API only returns `StopTimeUpdate` for the **queried station**, not the entire trip.

#### What We Use It For:
✅ **Real-time arrival/departure predictions** (ETA in minutes)
✅ **Detecting active trains** at each station
✅ **Updated timestamps** for delay calculations
✅ **Direction and route information**

**How We Work Around the Limitation**:
We use **GTFS static data** (`trip-stops-data.json`) to get the complete list of stops, then merge it with the real-time predictions.

**Refresh Rate**:
- API cached for 30 seconds per station
- Frontend polls every 30 seconds

---

### 3. 🚂 **GTFS Realtime - Vehicle Positions API** (Live Data)
**Endpoint**: `https://api.511.org/transit/VehiclePositions?api_key=...&agency=CT`
**Our Proxy**: `/api/vehicle-positions`

#### What It Returns:
```json
{
  "Entities": [
    {
      "Id": "...",
      "Vehicle": {
        "Trip": {
          "TripId": "160",
          "RouteId": "...",
          "DirectionId": 1
        },
        "Position": {
          "Latitude": 37.4484,
          "Longitude": -122.1648,
          "Bearing": 154.0,
          "Speed": 15.6
        },
        "Timestamp": 1732849750
      }
    }
  ]
}
```

#### What We Use It For:
✅ **Live train location** (lat/lon on map)
✅ **Train position interpolation** between stations
✅ **Movement bearing** (train direction)
✅ **Speed** (optional, for animations)
✅ **"Arriving in X mins" arrow** on TrainApproachView

**Refresh Rate**:
- Polled every 10 seconds
- Powers the animated train icon movement

---

## 🔄 Complete Data Flow

### **User Opens Dashboard**

```
1. Frontend fetches predictions for selected station
   ↓
2. /api/predictions called
   ├─→ Fetches Caltrain Predictions API (real-time ETAs)
   ├─→ Loads GTFS static data:
   │   ├─ schedule-data.json (scheduled times)
   │   └─ trip-stops-data.json (complete stop lists)
   ├─→ Merges real-time + static data
   └─→ Returns TrainPrediction[] with:
       - ETA (from real-time)
       - Departure time (from real-time)
       - ScheduledTime (from static)
       - stopIds (from static) ← THIS WAS THE BUG!
       - Direction, TrainType, etc.
   ↓
3. User clicks train to see "Approaching" view
   ↓
4. TrainApproachView loads
   ├─→ Uses train.stopIds to show all scheduled stops
   ├─→ Fetches vehicle positions every 10s
   ├─→ Matches vehicle by TripId
   ├─→ Interpolates train position between stations
   └─→ Shows animated train movement + arrival arrow
```

---

## 📈 What Each Component Shows

### **Main Dashboard (CaltrainDisplay)**
| Data Point | Source |
|------------|--------|
| Train Number | Predictions API (TripId) |
| ETA | Predictions API (real-time) |
| Departure Time | Predictions API (real-time) |
| Scheduled Time | GTFS Static (schedule-data.json) |
| Direction | Predictions API |
| Train Type | Derived from train number |

### **Train Approach View (TrainApproachView)**
| Data Point | Source |
|------------|--------|
| Train Icon Position | Vehicle Positions API (lat/lon) |
| All Scheduled Stops | **GTFS Static** (trip-stops-data.json) ✅ FIXED |
| Station Coordinates | GTFS Static (stations.json) |
| "Arriving in X mins" | Predictions API (ETA) |
| Next Stop | Calculated from position + stopIds |
| Distance to Station | Vehicle Position + Station coords |

---

## ✅ Current State (After Fix)

### What's Working:
✅ **All scheduled stops display correctly** (using GTFS static data)
✅ **Real-time train positions** (from Vehicle Positions API)
✅ **Accurate ETAs** (from Predictions API)
✅ **Smooth animations** (interpolated positions)
✅ **Station tooltips** (scheduled vs express stops)

### What Could Be Better:
⚠️ **No delay indicators** (don't compare real-time vs scheduled)
⚠️ **No handling of service alerts** (cancellations, delays)
⚠️ **Static schedule might be stale** (if GTFS data updates)
⚠️ **No offline fallback** (if APIs fail)

---

## 🎯 Recommended Improvements

### Priority 1: User Experience
1. **Delay Indicators**
   - Compare `Departure` (real-time) vs `ScheduledTime` (static)
   - Show color-coded badges: Green (on time), Yellow (< 5 min late), Red (> 5 min late)

2. **Loading States**
   - Show skeletons while fetching data
   - Handle API errors gracefully

3. **Real-time Updates**
   - Add visual pulse when data refreshes
   - Show "Last updated X seconds ago"

### Priority 2: Data Accuracy
4. **GTFS Data Auto-Update**
   - Check for new GTFS data weekly
   - Rebuild schedule files automatically

5. **Service Alerts Integration**
   - Use GTFS-RT Service Alerts API
   - Show delays, cancellations, route changes

6. **Better Train Matching**
   - Sometimes TripId from predictions doesn't match vehicle positions
   - Add fuzzy matching or time-based correlation

### Priority 3: Performance
7. **Smarter Caching**
   - Cache predictions per station on client
   - Only refetch changed data

8. **Reduce API Calls**
   - Batch vehicle position updates
   - Use WebSocket if available

---

## 🔍 Key Insight: Hybrid Approach

TrackTrain uses a **hybrid static + real-time approach**:

**Static GTFS Data** provides:
- ✅ Complete, accurate route information
- ✅ All scheduled stops in correct sequence
- ✅ Baseline schedule for comparison

**Real-time APIs** provide:
- ✅ Live train locations
- ✅ Updated arrival predictions
- ✅ Current operating status

This combination gives us the **best of both worlds**: comprehensive route data + real-time accuracy!

---

## 📝 Summary Table

| Purpose | Primary Source | Fallback | Refresh Rate |
|---------|---------------|----------|--------------|
| **Schedule/Stop List** | GTFS Static | N/A | Build time |
| **ETAs** | Predictions API | Static schedule | 30s |
| **Train Position** | Vehicle Positions API | Interpolate from schedule | 10s |
| **Station Info** | GTFS Static | N/A | Build time |
| **Delays** | Predictions vs Static | Not implemented | 30s |

---

## 🚀 Next Steps

1. ✅ Remove debug logging
2. ⏳ Add delay calculation and visual indicators
3. ⏳ Implement loading/error states
4. ⏳ Add service alerts
5. ⏳ Document API rate limits and fallbacks
