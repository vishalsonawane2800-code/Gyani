# Subscription CSV Format Guide

## Quick Reference

Use this format to bulk add subscription data via admin dashboard:

```csv
DATE,TIME,DAY,RETAIL,NII,SNII,BNII,QIB,TOTAL,EMPLOYEE,IS_FINAL
2026-04-08,17:00,1,2.45,1.80,0.50,1.20,0.95,1.52,0.0,false
2026-04-09,17:00,2,2.75,2.10,0.60,1.50,1.10,1.85,0.0,false
2026-04-10,15:30,3,3.20,2.55,0.75,1.80,1.35,2.15,0.0,true
```

## Field Descriptions

| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| **DATE** | Date | YYYY-MM-DD | 2026-04-08 | IPO subscription date |
| **TIME** | Time | HH:MM or h:MM PM | 17:00 or 5:00 PM | Time of subscription update |
| **DAY** | Integer | 1-7 | 1 | Day number of subscription period |
| **RETAIL** | Decimal | 0.00+ | 2.45 | Retail subscription multiple |
| **NII** | Decimal | 0.00+ | 1.80 | Total NII subscription multiple |
| **SNII** | Decimal | 0.00+ | 0.50 | Small NII (10L-1L) subscription multiple |
| **BNII** | Decimal | 0.00+ | 1.20 | Big NII (>1L) subscription multiple |
| **QIB** | Decimal | 0.00+ | 0.95 | Qualified Institutional Buyer subscription multiple |
| **TOTAL** | Decimal | 0.00+ | 1.52 | Overall subscription multiple |
| **EMPLOYEE** | Decimal | 0.00+ | 0.0 | Employee subscription multiple (if applicable) |
| **IS_FINAL** | Boolean | true/false | false | Whether this is final subscription data |

## Examples

### Example 1: Standard 3-Day IPO

```csv
DATE,TIME,DAY,RETAIL,NII,SNII,BNII,QIB,TOTAL,EMPLOYEE,IS_FINAL
2026-04-08,17:00,1,2.45,1.80,0.50,1.20,0.95,1.52,0.0,false
2026-04-09,17:00,2,2.75,2.10,0.60,1.50,1.10,1.85,0.0,false
2026-04-10,15:30,3,3.20,2.55,0.75,1.80,1.35,2.15,0.0,true
```

### Example 2: 5-Day IPO with Multiple Updates

```csv
DATE,TIME,DAY,RETAIL,NII,SNII,BNII,QIB,TOTAL,EMPLOYEE,IS_FINAL
2026-04-08,10:00,1,1.50,0.80,0.20,0.60,0.50,0.95,0.0,false
2026-04-08,17:00,1,2.15,1.25,0.35,0.90,0.75,1.35,0.0,false
2026-04-09,10:00,2,2.45,1.50,0.45,1.05,0.90,1.55,0.0,false
2026-04-09,17:00,2,2.85,1.80,0.55,1.25,1.10,1.85,0.0,false
2026-04-10,10:00,3,3.20,2.10,0.65,1.45,1.30,2.15,0.0,false
2026-04-10,17:00,3,3.55,2.40,0.75,1.65,1.45,2.45,0.0,false
2026-04-11,10:00,4,3.85,2.60,0.80,1.80,1.60,2.70,0.0,false
2026-04-11,17:00,4,4.15,2.80,0.85,1.95,1.70,2.90,0.0,false
2026-04-12,15:30,5,4.50,3.00,0.95,2.05,1.85,3.15,0.0,true
```

### Example 3: SME IPO (Simpler Structure)

```csv
DATE,TIME,DAY,RETAIL,NII,SNII,BNII,QIB,TOTAL,EMPLOYEE,IS_FINAL
2026-04-15,17:00,1,1.20,0.50,0.15,0.35,0.30,0.70,0.0,false
2026-04-16,17:00,2,1.60,0.75,0.25,0.50,0.50,0.95,0.0,false
2026-04-17,15:30,3,2.00,0.95,0.30,0.65,0.65,1.20,0.0,true
```

## How to Add Data

### Step 1: Prepare Your CSV
Create a file or copy the data in the format above.

### Step 2: Navigate to Admin Dashboard
Go to `/admin/dashboard`

### Step 3: Find Subscriptions Section
Scroll to "Subscriptions" and click to expand.

### Step 4: Paste Data
Paste your CSV data into the textarea.

### Step 5: Review Preview
Click "Generate Preview" or just proceed to upload.

### Step 6: Upload
Click "Upload Subscriptions" button.

### Step 7: Verify
Navigate to the IPO detail page and refresh to see the data.

## Tips & Best Practices

1. **Time Format**:
   - Use 24-hour format (17:00) for consistency
   - System will auto-convert different formats

2. **Subscription Multiples**:
   - These represent "times oversubscribed"
   - 2.5x = 2.5 times more applications than shares offered
   - Decimals are fine (0.45x, 1.2x, etc.)

3. **NII Split**:
   - SNII = Small NII (applications between Rs 10L-1L)
   - BNII = Big NII (applications > Rs 1L)
   - NII = SNII + BNII (total NII)
   - Leave both as 0 if not available

4. **Final Flag**:
   - Set `IS_FINAL` to `true` for the last subscription update
   - This marks the subscription as closed
   - Only set one entry per IPO to `true`

5. **Employee Column**:
   - Leave as 0.0 unless IPO includes employee quota
   - Very few IPOs have employee subscriptions

6. **Validation**:
   - All time values must be valid (00:00 to 23:59)
   - Dates must be in YYYY-MM-DD format
   - Numbers must be numeric (no text like "2.5x")
   - IS_FINAL must be true or false (lowercase)

## Common Mistakes

❌ **WRONG**: `DATE,TIME,DAY,RETAIL,NII,QIB,TOTAL` (missing SNII, BNII, etc.)
✅ **RIGHT**: Use full column list as shown in examples

❌ **WRONG**: `2.5x, 1.2x, 0.8x` (includes 'x' symbol)
✅ **RIGHT**: `2.5, 1.2, 0.8` (numbers only)

❌ **WRONG**: `5:00 PM` when pasted into spreadsheet becomes date
✅ **RIGHT**: Use `17:00` format or ensure column is formatted as text

❌ **WRONG**: `2026/04/08` (wrong date format)
✅ **RIGHT**: `2026-04-08` (YYYY-MM-DD)

## Data Sources

Subscription data typically comes from:
- **BSE Website**: bseindia.com (Official Stock Exchange)
- **NSE Website**: nseindia.com (Official Stock Exchange)
- **IPO Websites**: moneycontrol.com, ipowatch.in
- **IPO Company Website**: DRHP documents

## Troubleshooting

### Data Not Showing?
1. Verify CSV format is correct
2. Check that date is within IPO period
3. Refresh browser cache

### Upload Error?
1. Check for special characters in TIME field
2. Ensure all numeric fields are numbers (not text)
3. Verify IS_FINAL is lowercase (true/false)

### Wrong Numbers Displayed?
1. Verify decimal separator (use . not ,)
2. Check that TOTAL = actual total subscription
3. Ensure NII = SNII + BNII

## Support

For issues:
1. Check the preview before uploading
2. Review this guide for format requirements
3. Contact admin for database issues
