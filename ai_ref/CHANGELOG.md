# IPOGyani Changelog

> This file tracks all significant changes made to the codebase.
> AI agents should update this file when making changes.

---

## [Unreleased]

### Added
- `AI_CODEBASE_GUIDE.md` - Comprehensive documentation for AI agents
- `CHANGELOG.md` - Change tracking file

---

## [2026-04-10] - Database Schema Fix & Column Alignment

### Database
- Created `000_fresh_start.sql` - Complete fresh schema with consistent UUID types
- Fixed foreign key type mismatch (INTEGER vs UUID) that caused creation errors
- All tables now use UUID primary keys consistently

### Changed - IMPORTANT Column Name Updates
The following column names were updated to match the database schema:

| Old Name (Code) | New Name (Database) | Files Updated |
|-----------------|---------------------|---------------|
| `name` | `company_name` | queries.ts, API routes |
| `list_date` | `listing_date` | queries.ts, API routes |
| `lead_manager` | `brlm` | queries.ts, API routes |
| `about_company` | `description` | queries.ts, API routes |

### Removed Columns (not in database)
- `abbr` - Short abbreviation (removed from API)
- `gmp_percent` - Now calculated in code from GMP and price
- `issue_size_cr` - Use `issue_size` text field
- `fresh_issue` - Removed
- `ofs` - Removed

### Fixed
- `app/api/admin/ipos/route.ts` - Updated to use correct column names
- `app/api/admin/ipos/[id]/route.ts` - Fixed UUID handling and column names
- `app/api/admin/gmp/route.ts` - Fixed to use `company_name` instead of `name`
- `lib/supabase/queries.ts` - Updated all queries to use correct column names

### Admin Panel
- Added IPO Detail View page (`/admin/ipos/[id]`)
- Added "View" button (Eye icon) to dashboard IPO table
- Added `investorgain_gmp_url` and `investorgain_sub_url` fields to edit form

### Required User Action
After running `000_fresh_start.sql`, you MUST refresh Supabase schema cache:
1. Supabase Dashboard > Project Settings > API > "Reload schema"
2. OR run: `NOTIFY pgrst, 'reload schema';` in SQL Editor

---

## [Initial Setup] - 2026-04-10

### Project Structure
- Next.js 16.2.0 with App Router
- Tailwind CSS 4.2.0 design system
- Supabase integration for PostgreSQL database
- Cloudflare Pages deployment (via OpenNext)

### Database Schema
- `ipos` table - Main IPO data
- `gmp_history` table - GMP price history
- `ipo_financials` table - Financial data
- `ipo_issue_details` table - Issue structure
- `subscription_history` table - Subscription data
- `expert_reviews` table - Analyst reviews
- `peer_companies` table - Peer comparison
- `listed_ipos` table - Historical data

### Pages Implemented
- Homepage (`/`) - Live IPOs, GMP tracker, market sentiment
- IPO Detail (`/ipo/[slug]`) - Full IPO analysis
- GMP Tracker (`/gmp`) - Grey market premium tracking
- Listed IPOs (`/listed`) - Historical listings
- Upcoming IPOs (`/upcoming`) - Future IPOs
- SME IPOs (`/sme`) - SME segment IPOs
- Allotment Status (`/allotment-status`)
- Subscription Status (`/subscription-status`)
- Admin Dashboard (`/admin`) - IPO management
- Static pages (About, Contact, Privacy, Disclaimer)

### Components
- Header with market status indicator
- IPO cards with status badges
- AI prediction cards
- GMP history charts
- Subscription progress bars
- Expert reviews section
- Peer comparison tables

### API Endpoints
- CRUD operations for IPOs
- GMP history management
- Expert reviews management
- Logo upload functionality
- Auto status sync cron job

---

## How to Update This File

When making changes, add entries under `[Unreleased]` in the following format:

```markdown
### Added
- Description of new feature

### Changed
- Description of modification

### Fixed
- Description of bug fix

### Removed
- Description of removed feature

### Database
- Description of schema changes

### API
- Description of API changes
```

When releasing, move unreleased changes under a new version heading with date.
