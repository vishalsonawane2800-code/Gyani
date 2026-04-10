# URGENT FIX - abbr Column Error

## Problem
```
Failed to create IPO: Could not find the 'abbr' column of 'ipos' in the schema cache
```

Logo upload also fails because the IPO form can't submit.

---

## Solution (DO THIS NOW!)

### Step 1: Reload Supabase Schema Cache

Choose ONE method:

#### Method A: Dashboard (Easiest - Recommended)
1. Open Supabase Dashboard
2. Go to: **Project Settings → API**
3. Click **"Reload schema"** button
4. Wait 10-15 seconds
5. ✅ Done!

#### Method B: SQL Editor
1. Open Supabase SQL Editor
2. Copy & paste:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
3. Click Execute
4. Wait 10-15 seconds
5. ✅ Done!

#### Method C: Restart Project
1. Go to **Project Settings → General**
2. Click **Restart** button
3. Wait for restart to complete
4. ✅ Done!

---

### Step 2: Test the Fix

1. Go to admin dashboard
2. Create a new IPO:
   - Name: "Test Company Ltd"
   - Exchange: "BSE SME"
   - Sector: "Technology"
   - Price Min: 100
   - Price Max: 120
   - Lot Size: 100
   - Open Date: 2026-04-15
   - Close Date: 2026-04-17
3. Click **Submit**
4. ✅ Should succeed now!

---

### Step 3: Test Logo Upload

1. Create another IPO or edit the one you just created
2. Click **Upload Logo**
3. Select a PNG/JPG file
4. ✅ Should upload successfully!

---

## Why This Happened

- Old database migration defined `abbr` (abbreviation) column
- New v2 schema removed `abbr` - it's generated on-the-fly instead
- Supabase's PostgREST schema cache wasn't updated
- Admin form was trying to send `abbr` field that doesn't exist

## What Was Fixed

✅ Admin form updated to remove `abbr` field
✅ Abbreviation now generated on-the-fly from company name
✅ Database documentation updated with fix instructions

---

## If It Still Doesn't Work

Run this SQL command in Supabase SQL Editor:

```sql
-- Check if abbr column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name='ipos' AND column_name='abbr';

-- If above returned a row, drop the column:
ALTER TABLE ipos DROP COLUMN IF EXISTS abbr;

-- Refresh cache
NOTIFY pgrst, 'reload schema';
```

Then try creating an IPO again.

---

**That's it! The schema cache reload should fix everything.** 🎉
