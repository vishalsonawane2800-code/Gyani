# IPOGyani Changelog

> This file tracks all significant changes made to the codebase.
> AI agents should update this file when making changes.

---

## [Unreleased]

### Added
- `AI_CODEBASE_GUIDE.md` - Comprehensive documentation for AI agents
- `CHANGELOG.md` - Change tracking file

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
