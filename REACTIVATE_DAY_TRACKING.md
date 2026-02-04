# Day Tracking Feature Reactivation Guide

This document contains instructions to re-enable the Day Tracking features that were temporarily hidden from the UI.

## Features to Reactivate:

1. **GO!/STOP! Day Tracking Button** - Floating button for starting/ending the workday
2. **Zusatz Zeiterfassung Button** - Button for additional time tracking entries
3. **Zeiterfassung Verlauf Button** - Button for viewing time tracking history
4. **Enhanced Market Visit Flow** - Integration with day tracking system

---

## Step 1: Show DayTrackingButton in Dashboard

**File:** `src/components/gl/Dashboard.tsx`

**Action:** Uncomment the DayTrackingButton component

**Find this section (search for "TEMPORARILY HIDDEN"):**
```tsx
{/* TEMPORARILY HIDDEN - Day Tracking Button */}
{/* <DayTrackingButton 
  dayStatus={dayStatus}
  onStart={() => setIsDayTrackingOpen(true)}
  onEnd={() => setIsDayTrackingOpen(true)}
/> */}
```

**Change to:**
```tsx
<DayTrackingButton 
  dayStatus={dayStatus}
  onStart={() => setIsDayTrackingOpen(true)}
  onEnd={() => setIsDayTrackingOpen(true)}
/>
```

---

## Step 2: Show Zusatz Zeiterfassung Button in Dashboard

**File:** `src/components/gl/Dashboard.tsx`

**Action:** Uncomment the Zusatz Zeiterfassung button in QuickActionsBar

**Find this section:**
```tsx
{/* TEMPORARILY HIDDEN - Zusatz Zeiterfassung */}
{/* <button 
  className={styles.quickActionButton}
  onClick={() => setIsZusatzModalOpen(true)}
  style={{
    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
  }}
>
  <Clock size={20} weight="fill" />
  <span>Zusatz Zeiterfassung</span>
</button> */}
```

**Change to:**
```tsx
<button 
  className={styles.quickActionButton}
  onClick={() => setIsZusatzModalOpen(true)}
  style={{
    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
  }}
>
  <Clock size={20} weight="fill" />
  <span>Zusatz Zeiterfassung</span>
</button>
```

---

## Step 3: Show Zeiterfassung Verlauf Button in ProfilePage

**File:** `src/components/gl/ProfilePage.tsx`

**Action:** Uncomment the Zeiterfassung Verlauf button

**Find this section:**
```tsx
{/* TEMPORARILY HIDDEN - Zeiterfassung Verlauf */}
{/* <button 
  className={styles.zeiterfassungButton}
  onClick={() => setIsZeiterfassungModalOpen(true)}
>
  <ClockCounterClockwise size={20} weight="fill" />
  <span>Zeiterfassung Verlauf</span>
</button> */}
```

**Change to:**
```tsx
<button 
  className={styles.zeiterfassungButton}
  onClick={() => setIsZeiterfassungModalOpen(true)}
>
  <ClockCounterClockwise size={20} weight="fill" />
  <span>Zeiterfassung Verlauf</span>
</button>
```

---

## Step 4: Restore Enhanced Market Visit Flow

**File:** `src/components/gl/MarketVisitPage.tsx`

**Action:** Replace the temporary auto-start logic with the enhanced button-based flow

### 4a. Remove Temporary Auto-Start useEffect

**Find and REMOVE this section (around line 197):**
```tsx
// TEMPORARY: Simple auto-start behavior (old system)
useEffect(() => {
  if (!zeiterfassung.besuchszeitVon) {
    const now = new Date();
    const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setZeiterfassung(prev => ({
      ...prev,
      besuchszeitVon: startTime,
      marketStartTime: startTime
    }));
    setVisitStarted(true);
  }
}, []); // Auto-set on component mount (old behavior)
```

### 4b. Uncomment Enhanced startMarketVisit Function

**Find and UNCOMMENT this section (around line 183):**
```tsx
// TEMPORARILY DISABLED - Enhanced day tracking integration
// Will be reactivated in 2 days after GL training
// Function to start the market visit (records timestamp)
// const startMarketVisit = () => {
//   const now = new Date();
//   const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
//   setZeiterfassung(prev => ({
//     ...prev,
//     marketStartTime: startTime,
//     besuchszeitVon: startTime
//   }));
//   setVisitStarted(true);
// };
```

**Change to:**
```tsx
// Enhanced day tracking integration
// Function to start the market visit (records timestamp)
const startMarketVisit = () => {
  const now = new Date();
  const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  setZeiterfassung(prev => ({
    ...prev,
    marketStartTime: startTime,
    besuchszeitVon: startTime
  }));
  setVisitStarted(true);
};
```

### 4c. Replace Temporary toggleBesuchszeitTimer

**Find and REPLACE the temporary version (around line 280):**
```tsx
// TEMPORARY: Simple timer toggle (old behavior)
const toggleBesuchszeitTimer = () => {
  const currentTime = getCurrentTime();
  if (!besuchszeitRunning) {
    setBesuchszeitRunning(true);
  } else {
    setZeiterfassung(prev => ({ ...prev, besuchszeitBis: currentTime, marketEndTime: currentTime }));
    setBesuchszeitRunning(false);
  }
};
```

**Change to the COMMENTED version above it:**
```tsx
const toggleBesuchszeitTimer = () => {
  const currentTime = getCurrentTime();
  if (!besuchszeitRunning) {
    // Start the visit - this creates the timestamp
    if (!visitStarted) {
      startMarketVisit();
    } else {
      // Resume - just update the start time for this session
      setZeiterfassung(prev => ({ ...prev, besuchszeitVon: prev.besuchszeitVon || currentTime }));
    }
    setBesuchszeitRunning(true);
  } else {
    // Stop the timer and record end time
    setZeiterfassung(prev => ({ ...prev, besuchszeitBis: currentTime, marketEndTime: currentTime }));
    setBesuchszeitRunning(false);
  }
};
```

---

## Step 5: Verify All Components Are Imported

**File:** `src/components/gl/Dashboard.tsx`

Ensure these imports are present (they should be commented but still there):
```tsx
import { DayTrackingButton } from './DayTrackingButton';
import { DayTrackingModal } from './DayTrackingModal';
import { ZusatzZeiterfassungModal } from './ZusatzZeiterfassungModal';
import { ZeiterfassungVerlaufModal } from './ZeiterfassungVerlaufModal';
import { dayTrackingService } from '../../services/dayTrackingService';
```

---

## Step 6: Test After Reactivation

1. **Test Day Tracking:**
   - Click GO! button → Should open start day modal
   - Start day → Should record timestamp
   - Click STOP! button → Should open end day modal with confirmation

2. **Test Zusatz Zeiterfassung:**
   - Click button → Should open modal
   - Add Unterbrechung → Should require comment
   - Should validate time overlaps with market visits

3. **Test Zeiterfassung Verlauf:**
   - Click button → Should show history with real data
   - Should display Anfahrt, Fahrzeit, Heimfahrt correctly

4. **Test Market Visit Integration:**
   - Start market visit → Should record market_start_time
   - End visit → Should record market_end_time
   - Fahrzeit should be auto-calculated on admin side

---

## Database Tables (Already Exist):

These tables are already in the database and contain data:
- `fb_day_tracking` - Day start/end times
- `fb_zeiterfassung_submissions` - Market visit timestamps
- `fb_zusatz_zeiterfassung` - Additional time entries

**No database changes needed - just UI reactivation!**

---

## Estimated Time to Reactivate:

**5-10 minutes** - Just uncommenting the marked sections and testing.

---

## Notes:

- All backend endpoints are live and working
- All data is being saved correctly
- Only the frontend UI is hidden
- No breaking changes - can be reactivated safely anytime
