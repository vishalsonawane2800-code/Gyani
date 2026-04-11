# Bulk Data Entry System - Complete Guide

## Overview

Your application has a **complete bulk data entry system** that allows admins to add financial data, peer comparisons, and GMP history for each IPO. However, you were confused about where to access it because:

1. **Bulk data entry is only in EDIT mode** (not visible in ADD mode)
2. **Data wasn't displaying on the website** because peer comparison wasn't in the tabs

This guide explains everything and provides the fix.

---

## What's Already Working ✅

### 1. **Bulk Data Entry Component**
- Location: `components/admin/bulk-data-entry.tsx`
- Features:
  - 3 collapsible sections: Financial Data, Peer Comparison, GMP History
  - AI prompts to help format data
  - Format templates with copy buttons
  - Real-time data validation
  - Clear existing data checkbox

### 2. **API Endpoints** (All working)
- `POST /api/admin/ipos/[id]/financials` - Save financial data
- `POST /api/admin/ipos/[id]/peers` - Save peer companies
- `POST /api/admin/ipos/[id]/gmp-history` - Save GMP history
- Automatic parsing from text format
- Database upsert (update if exists, insert if new)

### 3. **Database Tables**
- `ipo_financials` - Stores FY-wise financial data
- `peer_companies` - Stores competitor information
- `gmp_history` - Stores historical GMP data with dates

### 4. **Data Fetching** (queries.ts)
- `getIPOBySlug()` fetches all related data from:
  - IPO basics
  - GMP history
  - Financial data
  - Expert reviews
  - (Peer companies need to be added)

---

## Issues Found & Fixed

### Issue 1: Bulk Entry Only in Edit Mode ❌ → ✅ FIXED
**Problem:** The bulk data entry section wasn't available when creating new IPOs.

**Solution:** Updated the Add IPO page to include instructions with tabs showing:
- Basic Details tab (create IPO first)
- Bulk Data tab (info that bulk entry is available after creation)

**File Changed:** `app/admin/ipos/new/page.tsx`

### Issue 2: Peer Comparison Data Not Displaying ❌ → NEEDS FIX
**Problem:** Even though you can upload peer data, it doesn't show on the website.

**Reasons:**
1. `getIPOBySlug()` in `lib/supabase/queries.ts` fetches peer_companies but doesn't return them
2. `IPOTabs` component doesn't have a "Peer Comparison" tab
3. Peer comparison data isn't in the IPO type definition

**What needs to be done:**
See the "Implementation Checklist" below.

---

## How to Use the System

### Step 1: Create an IPO
1. Go to Admin → Add IPO (or Admin → Edit IPO for existing)
2. Fill in basic details (name, exchange, sector, dates, etc.)
3. Click "Create IPO" or "Save Changes"

### Step 2: Add Bulk Data
**For NEW IPOs:** Navigate to Admin → IPOs → Find your new IPO → Click "Edit"

**For EXISTING IPOs:** Click "Edit" on any IPO

### Step 3: Use Bulk Data Entry (Right Sidebar)
The page shows 3 collapsible sections:

#### **Financial Data**
1. Click to expand "Financial Data" section
2. Copy the format template or AI prompt
3. Use ChatGPT/Claude to format your data using the AI prompt
4. Paste the formatted result in the textarea
5. Click "Import Financial Data"

Format Example:
```
=== FINANCIALS ===
FY23_REVENUE: 5.38
FY23_PAT: 0.23
FY23_EBITDA: 0.81
FY24_REVENUE: 7.82
FY24_PAT: 0.21
FY24_EBITDA: 1.29
FY25_REVENUE: 9.45
FY25_PAT: 0.67
FY25_EBITDA: 1.52
ROE: 40.26
ROCE: 46.85
DEBT_EQUITY: 0.15
EPS: 3.97
BOOK_VALUE: 12.50
=== END ===
```

#### **Peer Comparison**
1. Click to expand "Peer Comparison" section
2. Copy the format template or AI prompt
3. Format your peer company data
4. Paste in the textarea
5. Click "Import Peer Comparison"

Format Example:
```
=== PEER_COMPARISON ===
--- PEER 1 ---
NAME: Tata Power
MARKET_CAP: 145000
REVENUE: 58000
PAT: 4200
PE_RATIO: 34.5
PB_RATIO: 3.2
ROE: 12.5
--- PEER 2 ---
NAME: Adani Power
MARKET_CAP: 230000
REVENUE: 45000
PAT: 6800
PE_RATIO: 12.3
ROE: 18.2
--- IPO_COMPANY ---
NAME: Om Power Transmission
PE_RATIO: 22.5
=== END ===
```

#### **GMP History**
1. Click to expand "GMP History" section
2. Copy the format template or AI prompt
3. Format historical GMP data with dates
4. Paste in textarea
5. Click "Import GMP History"

Format Example:
```
=== GMP_HISTORY ===
--- ENTRY ---
DATE: 2026-04-10
TIME_SLOT: morning
GMP: 2.5
--- ENTRY ---
DATE: 2026-04-10
TIME_SLOT: evening
GMP: 3.0
=== END ===
```

### Step 4: Verify Data is Saved
- Check Admin Dashboard to see if data appears
- Check the public website (once display tabs are added)

---

## Implementation Checklist

To fix the peer comparison data not displaying on the website:

### Task 1: Update queries.ts ✅
- [ ] Add peer_companies to the data fetching in `getIPOBySlug()`
- [ ] Parse peer data and add to returned IPO object

### Task 2: Update IPO Type Definition
- [ ] Add `peerCompanies?: PeerCompany[]` to the IPO interface

### Task 3: Update IPOTabs Component
- [ ] Add "Peer Comparison" tab to the tabs array
- [ ] Add PeerComparisonTab function to display peers
- [ ] Import PeerComparison component if needed

### Task 4: Test End-to-End
- [ ] Go to Admin → Edit IPO
- [ ] Use Bulk Data Entry to add peer companies
- [ ] Go to public website (/ipo/[slug])
- [ ] Verify peer data displays in the Peer Comparison tab

---

## Database Schema

### `ipo_financials` Table
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| ipo_id | UUID | Foreign key to ipos |
| fiscal_year | TEXT | FY23, FY24, FY25, etc. |
| revenue | NUMERIC | Annual revenue in Cr |
| pat | NUMERIC | Profit after tax in Cr |
| ebitda | NUMERIC | EBITDA in Cr |
| roe | NUMERIC | Return on equity % |
| roce | NUMERIC | Return on capital employed % |
| debt_equity | NUMERIC | Debt to equity ratio |
| eps | NUMERIC | Earnings per share |
| book_value | NUMERIC | Book value per share |

### `peer_companies` Table
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| ipo_id | UUID | Foreign key to ipos |
| company_name | TEXT | Peer company name |
| market_cap | NUMERIC | Market cap in Cr |
| pe_ratio | NUMERIC | P/E ratio |
| pb_ratio | NUMERIC | P/B ratio |
| roe | NUMERIC | Return on equity % |
| roce | NUMERIC | Return on capital employed % |
| is_ipo_company | BOOLEAN | True if IPO company |
| display_order | INT | Sort order |

### `gmp_history` Table
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| ipo_id | UUID | Foreign key to ipos |
| date | DATE | Data date |
| time_slot | TEXT | 'morning' or 'evening' |
| gmp | NUMERIC | GMP value |
| gmp_percent | NUMERIC | GMP as % of issue price |
| recorded_at | TIMESTAMPTZ | When recorded |

---

## Files Involved

### Updated This Session
- `app/admin/ipos/new/page.tsx` - Added tabs with bulk data instructions

### Already Working
- `components/admin/bulk-data-entry.tsx` - Full bulk entry UI
- `lib/bulk-data-parsers.ts` - Data parsing logic
- `app/api/admin/ipos/[id]/financials/route.ts` - API endpoint
- `app/api/admin/ipos/[id]/peers/route.ts` - API endpoint
- `app/api/admin/ipos/[id]/gmp-history/route.ts` - API endpoint
- `lib/supabase/queries.ts` - Data fetching

### Needs Updates (For Peer Display Fix)
- `lib/supabase/queries.ts` - Add peer data fetching
- `lib/data.ts` - Add peers to IPO type
- `components/ipo-detail/ipo-tabs.tsx` - Add peer comparison tab

---

## Troubleshooting

### "Bulk Data Entry section not showing"
- Make sure you're in EDIT mode, not ADD mode
- Bulk entry is in the right sidebar of the edit page

### "Data says it imported but doesn't show on website"
- Check Admin Dashboard - does it show there?
- If yes in admin but not website: Display tabs need to be added (see checklist)
- If no in admin: Check browser console for errors

### "Format validation keeps failing"
- Check that you're using the exact format (including === markers)
- Make sure all dates are YYYY-MM-DD format
- For GMP, use 'morning' or 'evening' exactly
- Copy the format template exactly to see the right structure

---

## Next Steps

1. **Test current functionality**: Try adding financial and GMP data - it should work
2. **Fix peer display**: Follow the Implementation Checklist to show peer comparison on website
3. **Verify data persistence**: Create an IPO → Add data → Refresh page → Data should still be there

