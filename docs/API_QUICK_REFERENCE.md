# RailTime API Quick Reference

## New API Endpoints Summary

### 1. Journey Search
```
GET /api/journeys?origin=Sunnyvale&destination=San Francisco
```
**Returns:** List of trains from origin to destination with ETAs  
**Use:** Initial train discovery  
**Refresh:** Every 30s

---

### 2. Train Details
```
GET /api/trains/160?origin=Sunnyvale&destination=San Francisco
```
**Returns:** Complete trip information with all stops and ETAs  
**Use:** Timeline view, detailed train info  
**Refresh:** Every 30s

---

### 3. Train Position
```
GET /api/trains/160/position?origin=Sunnyvale&destination=San Francisco
```
**Returns:** Current position between stations  
**Use:** Corridor view animation  
**Refresh:** Every 10s

---

### 4. Active Journeys (Past Trains)
```
GET /api/journeys/active?origin=Sunnyvale&destination=San Francisco&lookbackMinutes=30
```
**Returns:** Trains that already departed origin  
**Use:** Track train after boarding  
**Refresh:** Every 15s

---

### 5. System Status
```
GET /api/system/status
```
**Returns:** Service alerts and system health  
**Use:** Show disruptions  
**Refresh:** Every 60s

---

## Data Sources Mapping

| Frontend Need | API Endpoint | Caltrain Data Source |
|--------------|--------------|---------------------|
| Find trains | `/api/journeys` | Trip Updates + Static GTFS |
| Train timeline | `/api/trains/:id` | Trip Updates + Vehicle Positions |
| Train position | `/api/trains/:id/position` | Vehicle Positions + Trip Updates |
| Track boarded train | `/api/journeys/active` | Trip Updates + Vehicle Positions |
| Service alerts | `/api/system/status` | Service Alerts API |

---

## Frontend Component Flow

```
1. JourneySearch Component
   └─> Calls: /api/journeys
   └─> Shows: List of trains with ETAs
   
2. User selects train
   └─> Calls: /api/trains/:tripId
   └─> Shows: Train details
   
3. CorridorView Component
   └─> Calls: /api/trains/:tripId/position (every 10s)
   └─> Shows: Train moving between stations
   
4. TimelineView Component
   └─> Uses: Data from /api/trains/:tripId
   └─> Shows: All stops with ETAs
   
5. ActiveJourneyTracker Component
   └─> Calls: /api/journeys/active (every 15s)
   └─> Shows: "Your train" after boarding
```

---

## Key Improvements Over Current System

| Feature | Current | New Design |
|---------|---------|------------|
| **Destination filtering** | ❌ Manual filtering | ✅ Built-in API support |
| **Complete stop list** | ⚠️ Static GTFS only | ✅ Real-time from Trip Updates |
| **Past train tracking** | ❌ Not possible | ✅ Active journeys API |
| **Station-based position** | ⚠️ GPS interpolation | ✅ Segment progress calculation |
| **Journey context** | ❌ No context | ✅ Stops until origin/destination |
| **Timeline view** | ⚠️ Incomplete | ✅ Complete with real-time ETAs |
| **Fallback handling** | ❌ No fallback | ✅ Graceful degradation to static |
| **Data transparency** | ❌ No indication | ✅ Clear real-time vs scheduled badges |

---

## Fallback Strategy Quick Reference

### Data Source Types

| Type | Meaning | User Message |
|------|---------|--------------|
| `realtime` | All APIs working | 🟢 LIVE (no message needed) |
| `static` | Using GTFS schedule | ⚠️ "Showing scheduled times" |
| `mixed` | Some APIs down | ℹ️ "Limited real-time data" |
| `cached` | Using stale data | 🕐 "Using cached data from X min ago" |

### Frontend Indicators

**Banner (top of page):**
```typescript
{metadata.dataSource.type !== 'realtime' && (
  <DataSourceBanner metadata={metadata} />
)}
```

**Badge (next to title):**
```typescript
<LiveStatusBadge dataSource={metadata.dataSource} />
```

**Inline (next to ETAs):**
```typescript
{!isRealtime && <span title="Scheduled">📅</span>}
```

### API Response Metadata

Every API response includes:
```json
{
  "metadata": {
    "dataSource": {
      "type": "realtime" | "static" | "mixed",
      "realtimeAvailable": boolean,
      "fallbackReason": "api-down" | "no-data" | "timeout",
      "message": "User-friendly explanation",
      "sources": {
        "tripUpdates": "realtime" | "static" | "unavailable",
        "vehiclePositions": "realtime" | "static" | "unavailable",
        "serviceAlerts": "realtime" | "static" | "unavailable"
      }
    }
  }
}
```

---

## Implementation Checklist

- [ ] Phase 1: Journey Search API
  - [ ] Create `/api/journeys` endpoint
  - [ ] Implement Trip Updates caching
  - [ ] Build journey filtering logic
  - [ ] Update frontend JourneySearch component

- [ ] Phase 2: Train Details API
  - [ ] Create `/api/trains/:tripId` endpoint
  - [ ] Build stop timeline generation
  - [ ] Create TimelineView component

- [ ] Phase 3: Position Tracking
  - [ ] Create `/api/trains/:tripId/position` endpoint
  - [ ] Update CorridorView component
  - [ ] Add journey context indicators

- [ ] Phase 4: Past Train Tracking
  - [ ] Create `/api/journeys/active` endpoint
  - [ ] Build ActiveJourneyTracker component
  - [ ] Add localStorage persistence

- [ ] Phase 5: Polish
  - [ ] Add service alerts
  - [ ] Implement error handling
  - [ ] Performance optimization
  - [ ] Testing

---

## Quick Start for Development

1. **Start with Journey Search:**
   ```typescript
   // app/api/journeys/route.ts
   export async function GET(request: NextRequest) {
     const origin = request.nextUrl.searchParams.get('origin');
     const destination = request.nextUrl.searchParams.get('destination');
     
     // Fetch Trip Updates
     const tripUpdates = await fetch('https://www.caltrain.com/files/rt/tripupdates/CT.json');
     
     // Filter and return journeys
     // ...
   }
   ```

2. **Update Frontend:**
   ```typescript
   // components/JourneySearch.tsx
   const journeys = await fetch(`/api/journeys?origin=${origin}&destination=${destination}`);
   ```

3. **Test with existing UI** before building new components

---

## Performance Targets

- API response time: < 500ms (p95)
- Frontend refresh: 10-30s depending on view
- Bandwidth per user: < 1 KB/s
- Cache hit rate: > 80% for Trip Updates

---

## Questions?

See full design document: `API_REDESIGN.md`
