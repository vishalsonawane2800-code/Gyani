# Subscription Layout Refactor - Summary

## Changes Made

### 1. **New Subscription Tab Layout** (`components/ipo-detail/ipo-tabs.tsx`)

The subscription tab has been completely redesigned to match your requirements:

#### **Section 1: Live Subscription Table**
- Clean table format showing current subscription status
- Columns: Category | Applied | Times
- Shows Retail, NII (HNI), QIB, and Total subscription data
- Color-coded rows for easy identification:
  - Retail: Cobalt blue
  - NII: Primary purple
  - QIB: Emerald green
  - Total: Highlighted with background

#### **Section 2: Day-wise Subscription Cards**
- **Layout**: 2/2/1 responsive grid (2 cards per row on large screens, 1 on mobile)
- **Per Card Display**:
  - Date header in blue background
  - Large subscription multiple (e.g., "2.5x")
  - Grid with Retail & NII subscription times
  - QIB subscription time
  - Last updated time at bottom

#### **Section 3: Empty State with Admin Link**
- When subscription data is unavailable:
  - Professional blue alert box
  - Clear message explaining data will be available when IPO opens
  - Direct link to admin dashboard: `/admin/dashboard`
  - Users can manually add subscription data via bulk data entry

---

## How Data Flows

### Fetching Subscription Data
```
IPO Detail Page (app/ipo/[slug]/page.tsx)
  ↓
Loads IPO with subscriptionHistory array
  ↓
SubscriptionTab component receives ipo prop
  ↓
Automatically displays if data available
```

### Adding Subscription Data Manually

**Admin Dashboard Flow**:
1. Navigate to `/admin/dashboard`
2. Open "Bulk Data Entry" section
3. Find "Subscriptions" collapsible section
4. Paste subscription data in format:

```
DATE,TIME,DAY,RETAIL,NII,SNII,BNII,QIB,TOTAL,EMPLOYEE,IS_FINAL
2026-04-08,17:00,1,2.5,1.8,0.5,1.2,0.9,1.5,0.0,false
2026-04-09,17:00,2,2.8,2.1,0.6,1.5,1.1,1.8,0.0,false
2026-04-10,15:30,3,3.2,2.5,0.7,1.8,1.3,2.1,0.0,true
```

5. Click "Upload" to save to database

---

## Database Schema

Subscription data is stored in `subscription_history` table:

```sql
subscription_history {
  id: UUID
  ipo_id: UUID (foreign key)
  date: DATE
  time: TIME
  day_number: INTEGER
  retail: NUMERIC
  nii: NUMERIC
  snii: NUMERIC (small NII)
  bnii: NUMERIC (big NII)
  qib: NUMERIC
  total: NUMERIC
  employee: NUMERIC
  is_final: BOOLEAN
  source: TEXT (default: 'manual')
  created_at: TIMESTAMP
}
```

---

## Styling Updates

### Tailwind Cleanup
All arbitrary values removed in `ipo-tabs.tsx`:
- `text-[14px]` → `text-base`
- `text-[13px]` → `text-sm`
- `text-[11px]` → `text-xs`
- `rounded-xl` → `rounded-lg`
- `h-[200px]` → `h-56`

### Color Coding
- **Retail**: `text-cobalt-mid`
- **NII**: `text-primary-mid`
- **QIB**: `text-emerald-mid`
- **Total**: Bold with `text-foreground`

---

## Files Modified

1. **components/ipo-detail/ipo-tabs.tsx**
   - Complete rewrite of `SubscriptionTab()` function
   - Tailwind styling cleanup
   - Day-wise data organization logic

---

## Features

✅ Day-wise subscription display in card format (2/2/1 grid)
✅ Live subscription data in clean table format
✅ Color-coded subscription categories
✅ Empty state with admin dashboard link
✅ Manual data entry via bulk data entry
✅ Responsive design (mobile to desktop)
✅ Clean typography (Inter font, standard text sizes)

---

## Testing

To test the subscription layout:

1. **With Data**: 
   - Navigate to an IPO that has `subscriptionHistory` in the database
   - Verify cards and table render correctly

2. **Without Data**:
   - Navigate to an IPO without subscription data
   - Verify empty state and admin link appear

3. **Manual Entry**:
   - Go to `/admin/dashboard`
   - Add subscription data via bulk entry
   - Refresh IPO page to see updated data

---

## API Reference

### Fetching Subscriptions
```typescript
GET /api/admin/ipos/[id]/subscription-history
// Returns array of SubscriptionHistoryEntry
```

### Updating Subscriptions
```typescript
POST /api/admin/ipos/[id]/subscriptions
// Bulk insert/update subscription data
```

---

## Notes

- Subscription data is typically scraped from BSE/NSE websites
- Manual entry is available for cases where scraping fails
- All fields are optional except `date` and `time`
- `is_final` flag indicates if subscription period has closed
- `source` field tracks data origin (manual, scraped, etc.)
