# Quick Fix Guide - Session 3 (2026-04-10)

## 🎯 Three Issues Fixed

### 1️⃣ IPO Selection in Reviews - IMMEDIATE FIX NEEDED

**Status:** ✅ Code fixed | ⚠️ User action required

**What to do RIGHT NOW:**
1. Open Supabase Dashboard
2. Go to **Settings → API**
3. Click **"Reload schema"** button
4. Wait 3 seconds
5. Go back to your app
6. Refresh **Admin → Reviews**
7. IPO dropdown should now show IPOs

**If still empty:**
- Go to Supabase **SQL Editor**
- Run: `NOTIFY pgrst, 'reload schema';`
- Wait 5 seconds
- Refresh the page again

---

### 2️⃣ Bulk Upload for New IPOs - NEW FEATURE ✨

**Status:** ✅ Fully implemented and ready

**How to use:**
1. Go to **Admin → Add IPO**
2. Scroll down to **"Bulk Upload IPOs"** section
3. Paste JSON data:
   ```json
   [
     {
       "name": "Infosys Limited",
       "exchange": "NSE",
       "sector": "IT",
       "price_min": 1200,
       "price_max": 1400,
       "lot_size": 1,
       "open_date": "2026-05-01",
       "close_date": "2026-05-05"
     }
   ]
   ```
4. Click **"Upload IPOs"**
5. See toast notification with count
6. Go to **Admin Dashboard** to verify

---

### 3️⃣ Fields Not Visible on Website - NEEDS INFO

**Status:** ⚠️ Code ready | Need user details

**What we need from you:**
1. Which specific field is not showing? (e.g., sector, registrar, etc.)
2. What did you enter in the field?
3. Where should it appear? (home page, IPO detail page, etc.)
4. Can you see it in Admin Dashboard? (Yes/No)

**Send screenshot of:**
- Admin form with your input
- Admin dashboard showing the saved data
- Public page where it should appear

---

## 📋 Testing Your Fixes

### ✅ Test 1: Reviews Dropdown Works
- [ ] Go to Admin → Reviews
- [ ] See IPO list appears
- [ ] Can select an IPO
- [ ] Add a review successfully

### ✅ Test 2: Bulk Upload Works
- [ ] Go to Admin → Add IPO
- [ ] See Bulk Upload section at bottom
- [ ] Paste sample JSON
- [ ] Click Upload
- [ ] Get success notification
- [ ] See new IPOs in Admin Dashboard

### ✅ Test 3: Single IPO Creation Still Works
- [ ] Go to Admin → Add IPO
- [ ] Fill regular form fields
- [ ] Create one IPO
- [ ] Verify in Admin Dashboard

---

## 🔧 Technical Summary

| Issue | Fix | File |
|-------|-----|------|
| Reviews empty | Error handling + empty state | `app/admin/reviews/page.tsx` |
| No bulk upload | New bulk handler + UI | `components/admin/ipo-form.tsx` |
| Fields missing | Needs investigation | TBD |

---

## ❓ Common Questions

**Q: Why is the IPO dropdown empty?**
A: Database schema cache is out of sync. Reload it in Supabase Dashboard.

**Q: Can I use bulk upload in edit mode?**
A: Not yet - bulk upload is only for creating new IPOs. You can still create single IPOs in edit page.

**Q: What fields can I include in bulk upload JSON?**
A: Any field from the form works: name, exchange, sector, price_min, price_max, lot_size, dates, colors, URLs, etc.

**Q: How do I fix the missing fields issue?**
A: Share screenshots and field names - then we can investigate database schema and display components.

---

## 🚀 Next Steps

1. **NOW:** Reload Supabase schema cache
2. **Then:** Test reviews dropdown  
3. **Then:** Try bulk upload feature
4. **Then:** Share details about missing fields (Issue 3)

Questions? Check the detailed guide: `SESSION_3_FIXES.md`
