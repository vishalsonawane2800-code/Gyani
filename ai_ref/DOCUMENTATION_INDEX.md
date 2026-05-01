# AI Agent Documentation Index

> **Updated:** May 1, 2026
> **Purpose:** Quick reference for AI agents to locate technical documentation
> **Format:** Topic-based index with cross-references

---

## Core Architecture Docs

### 1. **AI_CODEBASE_GUIDE.md** — The Canonical Codebase Reference
**What it covers:**
- Overall project structure and tech stack
- Directory layout (`/app`, `/components`, `/lib`, `/scripts`)
- Data sources and rendering strategy (Live IPOs, Listed IPOs, etc.)
- Authentication system (custom JWT, not Supabase Auth)
- IPO status lifecycle and automation
- Scraper architecture (GMP, subscription, auto-migration)
- TypeScript types and column mappings
- Environment variables
- API endpoints summary
- Key code patterns (NEW §10 — Recently Listed, Listed Archive, Detail pages)

**When to use:** First read when starting any task. References specific files and code patterns.

**Recent additions (May 1, 2026):**
- §10.1 Recently Listed IPOs — component breakdown, data flow, tab removal
- §10.2 Listed IPO Archive Page — `/listed` structure
- §10.3 Listed IPO Detail Pages — ISR + merged data loading

---

### 2. **DATABASE_SCHEMA.md** — Table Structure & Relationships
**What it covers:**
- Migration execution order (001–015)
- Full table schema for 14+ tables
- Column types, constraints, and foreign keys
- Specific notes on:
  - `ipos` (main table)
  - `listed_ipos` (archive table)
  - `ipo_financials`, `ipo_kpi`, `peer_companies`
  - `subscription_live`, `gmp_history`, `subscription_history`
  - `admin`, `expert_reviews`, automation tables
  - Scraper health and ML model registry
- CSV-first merging strategy (NEW — added May 1, 2026)

**When to use:** When you need to:
- Understand a specific table's structure
- Add a new column or table
- Write database queries
- Debug data consistency issues
- Understand the merge strategy for listed IPOs

**Recent additions:**
- Clarified `listed_ipos` table is "DB half" of archive
- CSV merging logic documented in `listed_ipos` section comment

---

### 3. **LISTED_IPOS_HANDOVER.md** — Complete Feature Handover (NEW)
**What it covers:**
- Overview of "Recently Listed IPOs" homepage section + `/listed` archive
- Component breakdown:
  - `components/home/listed-ipos.tsx` (homepage)
  - `app/listed/page.tsx` (archive index)
  - Year and detail pages
- Complete data flow diagram (CSV → merge → render)
- CSV-first + DB-second strategy explained
- All routes and ISR configuration
- Key files by category (loaders, components, pages, DB schema)
- Issue resolution — documents the "messy tabs" fix
- Common tasks (add IPO, update gain %, filter by exchange)
- Troubleshooting guide (no data, old data, SME mixing, 404s)

**When to use:** 
- Before working on any listed IPO feature
- To understand why tabs were removed
- To add/update listed IPO functionality
- To debug "Recently Listed" section issues
- To know where files are located

**Key insight:** Resolves the original issue of confusing SME/Mainboard mixing by:
1. Removing tabs from homepage
2. Creating dedicated `/sme` and `/mainboard` pages
3. Keeping `/listed` for year-based archive

---

## Quick Navigation by Task

### "I need to fix a bug in [Feature]"

| Feature | Start Here | Then Read |
|---------|-----------|-----------|
| Recently Listed IPOs section | LISTED_IPOS_HANDOVER.md §2 | Components section in AI_CODEBASE_GUIDE.md §10.1 |
| Listed IPO Archive page (`/listed`) | LISTED_IPOS_HANDOVER.md §2.2 | AI_CODEBASE_GUIDE.md §10.2 |
| Mainboard/SME pages | LISTED_IPOS_HANDOVER.md §7 | — |
| GMP tracker | AI_CODEBASE_GUIDE.md §7.3 | SCRAPER_HANDOVER.md (if it exists) |
| Admin dashboard | AI_CODEBASE_GUIDE.md §5 | Directory structure §3 |
| Subscription tracking | AI_CODEBASE_GUIDE.md §7.3 | DATABASE_SCHEMA.md §2.6 |

### "I need to add/modify a [Data Type]"

| Data Type | Start Here |
|-----------|-----------|
| IPO (Live/Upcoming) | AI_CODEBASE_GUIDE.md §8 (Types), DATABASE_SCHEMA.md §2.1 |
| Listed IPO (Archive) | DATABASE_SCHEMA.md §2.9 + LISTED_IPOS_HANDOVER.md |
| GMP History | DATABASE_SCHEMA.md §2.5, AI_CODEBASE_GUIDE.md §7.3 |
| Subscription | DATABASE_SCHEMA.md §2.6–2.7, AI_CODEBASE_GUIDE.md §7.3 |
| IPO Financials | DATABASE_SCHEMA.md §2.2, AI_CODEBASE_GUIDE.md §8 |
| Expert Review | DATABASE_SCHEMA.md §2.10 |
| Peer Company | DATABASE_SCHEMA.md §2.8 |

### "I need to understand [Concept]"

| Concept | Location |
|---------|----------|
| Status lifecycle (upcoming → listed) | AI_CODEBASE_GUIDE.md §6 |
| CSV-first + DB-merge strategy | LISTED_IPOS_HANDOVER.md §3 + DATABASE_SCHEMA.md §2.9 |
| Scraper architecture | AI_CODEBASE_GUIDE.md §7 + SCRAPER_HANDOVER.md |
| ISR (Incremental Static Regeneration) | LISTED_IPOS_HANDOVER.md §4 |
| Admin authentication | AI_CODEBASE_GUIDE.md §5 |
| Environment variables | AI_CODEBASE_GUIDE.md §9 |
| Type system | AI_CODEBASE_GUIDE.md §8 |

---

## File Organization

### Primary Documentation (in `/ai_ref/`)
- `AI_CODEBASE_GUIDE.md` — Start here (project overview + architecture)
- `DATABASE_SCHEMA.md` — Database structure reference
- `LISTED_IPOS_HANDOVER.md` — Feature-specific handover (NEW)

### Secondary References (in `/ai_ref/`)
- `SCRAPER_HANDOVER.md` — GMP/subscription scraper details
- `SME_MAINBOARD_INTEGRATION.md` — SME vs Mainboard classification
- `QUICK_REFERENCE.md` — One-page cheat sheet
- Changelogs: `CHANGELOG.md`, `SESSION_3_COMPLETE_SUMMARY.md`, etc.

### Related Config Files (in repo root)
- `vercel.json` — Cron definitions
- `next.config.mjs` — Next.js config
- `tsconfig.json` — TypeScript config
- `package.json` — Dependencies

---

## Recently Resolved Issues

### Issue #1: "Recently Listed IPOs section is messy with confusing tabs"

**Resolution:** 
- Removed SME/Mainboard/All tabs from homepage component
- Created dedicated `/sme` and `/mainboard` pages
- Homepage now shows unified "Recently Listed" (last 6 across all types)
- Details: LISTED_IPOS_HANDOVER.md §5 (Issue Resolution)

**Files Changed:**
- `components/home/listed-ipos.tsx` — Removed useState + tabs
- `components/header.tsx` — Added Mainboard/SME nav links
- `components/footer.tsx` — Updated footer links
- Created `app/mainboard/page.tsx` (parallel to existing `/sme`)

### Issue #2: Data not updating after migration

**Resolution:**
- Added `revalidatePath()` calls in migration route handler
- Documented ISR cache behavior (3600s TTL)
- Force-dynamic on homepage for always-fresh data
- Details: LISTED_IPOS_HANDOVER.md §4 (Revalidation Strategy)

---

## For Next AI Agent

When starting work:
1. **Read in order:**
   1. This index (you're reading it now)
   2. `AI_CODEBASE_GUIDE.md` (full project overview)
   3. `DATABASE_SCHEMA.md` (if modifying DB)
   4. `LISTED_IPOS_HANDOVER.md` (if working on listed IPOs)

2. **Then find the specific section** using the Quick Navigation table above

3. **Use console.log("[v0] ...")** for debugging (remove when done)

4. **Always check:** 
   - Are you editing a Client Component (`'use client'`) or Server Component (RSC)?
   - Are you reading or writing data? Where does the data come from?
   - Do you need to call `revalidatePath()`?

5. **Before pushing:**
   - Verify data flow (from DB/CSV to component)
   - Check for hardcoded values
   - Test edge cases (missing data, empty states, etc.)
   - Update this index if you add new concepts or resolve issues

---

## Document Maintenance

Last updated: **May 1, 2026**
Last modified by: **v0 AI Agent**

### How to Update This Index
- Add new docs to `/ai_ref/` directory
- Update the "Primary Documentation" section
- Add to "Quick Navigation" if it's a common task
- Update "Recently Resolved Issues" as bugs are fixed
- Keep the task-based table current

### When to Create New Docs
- If a feature has >100 lines of documentation
- If multiple related files need explanation (>3 files)
- If there's a handoff needed for next agent
- If the feature has known issues to document

---

**Questions?** Check the relevant doc or add a comment to the code with `[v0]` prefix for next agent.
