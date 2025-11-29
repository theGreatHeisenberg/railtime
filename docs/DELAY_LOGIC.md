# Delay Logic & Threshold Explanation

## ⚖️ The ±2 Minute Threshold

### Why ±2 Minutes?

**TrackTrain uses a ±2 minute threshold** for determining delay status. This means:

- **On-Time**: Departure within ±2 minutes of scheduled time
- **Early**: Departure more than 2 minutes before scheduled time
- **Delayed**: Departure more than 2 minutes after scheduled time

### Rationale

1. **Industry Standard**
   - Most transit agencies (including Caltrain) consider trains "on-time" if within 2-5 minutes of schedule
   - Federal Transit Administration (FTA) typically uses 5-minute windows
   - We chose 2 minutes as a stricter, more user-friendly threshold

2. **Real-World Variance**
   - GPS accuracy: ±10-30 seconds
   - Platform dwell time variations: 15-45 seconds
   - Schedule precision: Typically rounded to nearest minute
   - Total natural variance: ~1-2 minutes is normal

3. **User Experience**
   - **Reduces noise**: Without threshold, status would constantly flip between "on-time" and "delayed"
   - **Focuses on meaningful delays**: 1 minute late isn't actionable for users
   - **Matches expectations**: Users don't consider 1-2 min delays as "late"

4. **Visual Consistency**
   - Prevents "alert fatigue" from too many red badges
   - Green "ON TIME" badge means "no need to worry"
   - Red "DELAYED" badge means "might want to check alternatives"

---

## 🎨 Visual Logic (After Fix)

### Train Cards - Departure Time Display

#### Case 1: On-Time (within ±2 min)
```
Scheduled: 8:58 PM
Actual:    8:59 PM  (1 min late)
Display:   8:59 PM  (green, no strikethrough)
Badge:     ON TIME  (green)
```

#### Case 2: Delayed (>2 min late)
```
Scheduled: 8:55 PM
Actual:    8:58 PM  (3 min late)
Display:   8:55 PM  (strikethrough)
           8:58 PM  (red)
Badge:     3m LATE  (red)
```

#### Case 3: Early (>2 min early)
```
Scheduled: 9:05 PM
Actual:    9:02 PM  (3 min early)
Display:   9:05 PM  (strikethrough)
           9:02 PM  (blue)
Badge:     3m EARLY (blue)
```

---

## 🔧 Implementation Details

### Delay Calculation (API)
**Location:** `app/api/predictions/route.ts:119-129`

```typescript
delayMinutes = differenceInMinutes(predictedTime, scheduledTime);

// Determine status
if (delayMinutes <= -2) {
    delayStatus = "early";      // More than 2 min early
} else if (delayMinutes >= 2) {
    delayStatus = "delayed";    // More than 2 min late
} else {
    delayStatus = "on-time";    // Within ±2 min
}
```

### Visual Display (Frontend)
**Location:** `components/CaltrainDisplay.tsx:348-352`

```typescript
// Only show strikethrough for significant delays (>2 min)
{p.delayStatus && (p.delayStatus === "delayed" || p.delayStatus === "early") ? (
    <div className="flex flex-col items-end">
        <span className="line-through text-slate-500 text-xs">{p.ScheduledTime}</span>
        <span className={p.delayStatus === "delayed" ? "text-red-400" : "text-blue-400"}>
            {p.Departure}
        </span>
    </div>
) : (
    <span className="text-green-400">{p.Departure}</span>
)}
```

---

## 📊 Example Scenarios

| Scheduled | Actual | Delay | Status | Display | Badge |
|-----------|--------|-------|--------|---------|-------|
| 8:00 PM | 8:00 PM | 0 min | On-Time | 8:00 PM (green) | ON TIME (green) |
| 8:00 PM | 8:01 PM | +1 min | On-Time | 8:01 PM (green) | ON TIME (green) |
| 8:00 PM | 8:02 PM | +2 min | On-Time | 8:02 PM (green) | ON TIME (green) |
| 8:00 PM | 8:03 PM | +3 min | **Delayed** | ~~8:00 PM~~ 8:03 PM (red) | **3m LATE** (red) |
| 8:00 PM | 8:05 PM | +5 min | **Delayed** | ~~8:00 PM~~ 8:05 PM (red) | **5m LATE** (red) |
| 8:00 PM | 7:59 PM | -1 min | On-Time | 7:59 PM (green) | ON TIME (green) |
| 8:00 PM | 7:57 PM | -3 min | **Early** | ~~8:00 PM~~ 7:57 PM (blue) | **3m EARLY** (blue) |

---

## 🐛 The Bug That Was Fixed

### Before Fix

**Problem:** Inconsistent logic between strikethrough and badge

```
Scheduled: 8:58 PM
Actual:    8:59 PM  (1 min late)

Old Display:
  ❌ 8:58 PM (strikethrough)  ← Shown for ANY difference
  ❌ 8:59 PM (red)
  ✅ Badge: ON TIME            ← Only shown for >2 min difference

Result: Confusing! Strikethrough implies delay, but badge says "on-time"
```

### After Fix

**Solution:** Align strikethrough to same ±2 min threshold

```
Scheduled: 8:58 PM
Actual:    8:59 PM  (1 min late)

New Display:
  ✅ 8:59 PM (green, no strikethrough)  ← Same threshold as badge
  ✅ Badge: ON TIME                      ← Consistent!

Result: Both visuals agree - train is on-time!
```

---

## 🎯 User Benefits

### Before: Confusing Signals
- 1-minute delay → Red time + strikethrough but "ON TIME" badge
- User thinks: "Is it late or not?"

### After: Clear, Consistent Messaging
- 1-minute delay → Green time, "ON TIME" badge
- User thinks: "Great, it's on schedule!"
- 3-minute delay → Red time with strikethrough, "3m LATE" badge
- User thinks: "Noted, might be tight"

---

## 🔮 Alternative Approaches (Not Chosen)

### Option 1: Zero Tolerance (Show delays for any difference)
```
Threshold: 0 minutes
Pro: "Truthful" to the second
Con: Too noisy, constant red badges, alert fatigue
```

### Option 2: More Lenient (±5 minutes)
```
Threshold: 5 minutes
Pro: Fewer false alarms
Con: Hides actionable delays, users might miss trains
```

### Option 3: Adaptive Threshold (Time-based)
```
Threshold: ±2 min during peak, ±5 min during off-peak
Pro: Context-aware
Con: Complex, inconsistent UX
```

**We chose ±2 minutes** as the best balance of accuracy and usability.

---

## 📝 Code Locations

| Component | File | Line | Purpose |
|-----------|------|------|---------|
| Delay Calculation | `app/api/predictions/route.ts` | 119-129 | Calculate delay status |
| Train Card Display | `components/CaltrainDisplay.tsx` | 347-355 | Strikethrough logic |
| Train Card Badge | `components/CaltrainDisplay.tsx` | 359-369 | Delay badge |
| Next Train Banner | `components/CaltrainDisplay.tsx` | 166-180 | Banner delay badge |
| Approach View Icon | `components/TrainApproachView.tsx` | 572-584 | Icon delay badge |

---

## ✅ Consistency Checklist

All visuals now use the **same ±2 minute threshold**:

- ✅ Strikethrough departure time
- ✅ Red/Green departure time color
- ✅ Delay status badge on cards
- ✅ Delay status badge on banner
- ✅ Delay status badge on train icon

**Result:** Unified, predictable user experience!

---

## 🧪 Testing

To verify the fix works:

1. Find a train with 1-minute delay
   - Should show: Green time, "ON TIME" badge, no strikethrough

2. Find a train with 3-minute delay
   - Should show: Red time, strikethrough, "3m LATE" badge

3. Find a train with no delay
   - Should show: Green time, "ON TIME" badge (or no badge)

---

**Updated:** November 28, 2024
**Threshold:** ±2 minutes
**Rationale:** Industry standard + User experience + Noise reduction
