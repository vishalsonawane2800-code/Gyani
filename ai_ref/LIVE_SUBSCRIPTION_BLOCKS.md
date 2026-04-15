# Live Subscription Tracker Implementation

## Overview

The Live Subscription Tracker displays real-time subscription multiples (0.71x, 0.59x, etc.) for different categories during IPO period on the IPO detail page.

## Features

### 1. **Live Subscription Display Blocks**
- Shows 4 blocks: Retail, NII (HNI), QIB, Total
- Displays subscription multiple (times oversubscribed)
- Color-coded for easy identification
- Real-time updates every 30 seconds

### 2. **Display Format**
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Retail    │  │  NII (HNI)  │  │     QIB     │  │    Total    │
│  0.59x      │  │  0.71x      │  │  1.18x      │  │  0.85x      │
│             │  │             │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

### 3. **Live Updates**
- Automatically refreshes every 30 seconds
- Shows last updated timestamp
- Day number indicator (Day 1, Day 2, etc.)
- Only displays during IPO subscription period

## Database Tables

### subscription_live
Stores current/latest subscription data by category:

```sql
CREATE TABLE subscription_live (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipos(id),
  category TEXT NOT NULL ('retail', 'nii', 'qib', 'total'),
  applied NUMERIC(15,2),  -- Total applied amount
  times NUMERIC(6,2) NOT NULL,  -- Subscription multiple
  updated_at TIMESTAMPTZ DEFAULT now(),
  display_order INT,  -- Order to display blocks
  UNIQUE(ipo_id, category)
);
```

### subscription_history
Stores day-wise and time-wise historical data:

```sql
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipos(id),
  date DATE NOT NULL,
  time TIME NOT NULL,
  day_number INT,
  retail NUMERIC(6,2),
  nii NUMERIC(6,2),
  snii NUMERIC(6,2),
  bnii NUMERIC(6,2),
  qib NUMERIC(6,2),
  total NUMERIC(6,2),
  employee NUMERIC(6,2),
  is_final BOOLEAN,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## How to Add Data

### Step 1: Go to Admin Dashboard
Navigate to `/admin/dashboard`

### Step 2: Open Edit IPO
Click on an IPO to edit it

### Step 3: Find Subscriptions Section
Scroll to "Bulk Data Entry" on the right sidebar
Expand "Subscriptions" section

### Step 4: Paste Subscription Data
Use this format:

```csv
DATE,TIME,DAY,RETAIL,NII,SNII,BNII,QIB,TOTAL,EMPLOYEE,IS_FINAL
2026-04-10,17:00,1,0.59,0.71,0.35,0.36,1.18,0.85,0.0,false
2026-04-11,10:00,2,1.25,1.50,0.60,0.90,1.80,1.45,0.0,false
2026-04-11,17:00,2,1.80,2.10,0.85,1.25,2.25,1.95,0.0,false
```

### Step 5: Upload
Click "Upload Subscriptions" button

### Step 6: Verify Display
1. Go to the IPO detail page
2. The Live Subscription Tracker appears below AI Prediction
3. Shows latest multipliers in colored blocks
4. Subscription tab shows detailed day-wise history

## Field Descriptions

| Field | Format | Example | Notes |
|-------|--------|---------|-------|
| DATE | YYYY-MM-DD | 2026-04-10 | Subscription date |
| TIME | HH:MM | 17:00 | Update time (24-hour format) |
| DAY | Integer | 1 | Day number of IPO |
| RETAIL | Decimal | 0.59 | Retail subscription multiple |
| NII | Decimal | 0.71 | Total NII subscription |
| SNII | Decimal | 0.35 | Small NII (Rs 10L-1L) |
| BNII | Decimal | 0.36 | Big NII (> Rs 1L) |
| QIB | Decimal | 1.18 | Qualified Institutional Buyers |
| TOTAL | Decimal | 0.85 | Overall subscription |
| EMPLOYEE | Decimal | 0.0 | Employee quota (if applicable) |
| IS_FINAL | Boolean | false | true if final subscription |

## API Endpoints

### GET /api/admin/ipos/[id]/subscription-live
Fetches current subscription data for display

**Response:**
```json
[
  {
    "ipo_id": "uuid",
    "category": "retail",
    "applied": 50000000,
    "times": 0.59,
    "updated_at": "2026-04-10T17:00:00Z",
    "display_order": 0
  },
  ...
]
```

### POST /api/admin/ipos/[id]/subscription-live
Upserts subscription live data (used by bulk entry)

**Request:**
```json
[
  { "category": "retail", "applied": 50000000, "times": 0.59 },
  { "category": "nii", "applied": 35000000, "times": 0.71 },
  { "category": "qib", "applied": 45000000, "times": 1.18 },
  { "category": "total", "applied": 130000000, "times": 0.85 }
]
```

## Components

### LiveSubscriptionTracker
- Location: `components/ipo-detail/live-subscription-tracker.tsx`
- Props: `ipo: IPO`
- Displays 4 colored blocks with subscription multiples
- Auto-refreshes every 30 seconds
- Shows last updated time

### SubscriptionTab
- Location: `components/ipo-detail/ipo-tabs.tsx`
- Shows detailed day-wise subscription history
- Displays cards with morning/evening breakdowns
- Shows table with historical data

## Design

### Color Coding
- **Retail**: Blue (`text-blue-400`)
- **NII**: Purple (`text-purple-400`)
- **QIB**: Green (`text-emerald-400`)
- **Total**: Primary color (`text-primary-mid`)

### Layout
- 2x2 grid on desktop (4 blocks)
- 2 columns on tablet
- 1 column on mobile
- Hover effects for interactivity

## Testing Checklist

- [ ] Add subscription data via bulk entry
- [ ] Verify Live Subscription Tracker displays
- [ ] Check multipliers show with decimal places
- [ ] Verify color coding matches design
- [ ] Check auto-refresh every 30 seconds
- [ ] Verify displays only during subscription period
- [ ] Check subscription tab shows history
- [ ] Test mobile responsiveness

## Troubleshooting

### Blocks not showing?
1. Verify IPO status is 'open' or 'closing'
2. Check subscription data was saved (admin dashboard)
3. Check browser console for errors
4. Try refreshing the page

### Wrong values displayed?
1. Verify CSV format and decimal values
2. Check `times` field has 2 decimal places
3. Ensure category names are lowercase

### Auto-refresh not working?
1. Check browser DevTools Network tab
2. Verify API endpoint `/api/admin/ipos/[id]/subscription-live` is accessible
3. Check for CORS errors
4. Verify IPO ID is correct

## Future Enhancements

- [ ] WebSocket for real-time updates (instead of polling)
- [ ] Historical sparkline chart in blocks
- [ ] Animated value transitions
- [ ] Sound/push notification on major changes
- [ ] Subscription phase indicators (Morning/Evening)
- [ ] GMP correlation view
