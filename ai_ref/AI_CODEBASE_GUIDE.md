# IPOGyani - AI Agent Codebase Documentation

> **Last Updated:** 2026-04-10
> **Purpose:** This document provides AI agents with a complete understanding of the IPOGyani codebase structure, data flow, and architecture patterns.

---

## Project Overview

**IPOGyani** is India's smartest IPO research platform providing:
- Live GMP (Grey Market Premium) tracking
- AI-predicted listing gains
- Real-time subscription data
- Market sentiment analysis
- Expert reviews for all mainboard and SME IPOs

### Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.2.0 | React framework with App Router |
| React | 19 | UI library |
| TypeScript | 5.7.3 | Type safety |
| Tailwind CSS | 4.2.0 | Styling |
| Supabase | 2.102.1 | PostgreSQL database + Auth |
| Recharts | 2.15.0 | Data visualization |
| Zustand | 5.0.12 | State management |
| Lucide React | 0.564.0 | Icons |

### Hosting & Deployment

- **Production Host:** Cloudflare Pages (via OpenNext adapter)
- **Database:** Supabase (PostgreSQL)
- **Build Command:** `opennextjs-cloudflare build`
- **Deploy Command:** `opennextjs-cloudflare deploy`

---

## Directory Structure

```
/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout with fonts & metadata
│   ├── page.tsx                  # Homepage - fetches IPOs from Supabase
│   ├── globals.css               # Design system tokens & Tailwind config
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin API endpoints
│   │   │   ├── ipos/             # IPO CRUD operations
│   │   │   ├── gmp/              # GMP management
│   │   │   ├── reviews/          # Expert reviews management
│   │   │   └── auto-status/      # Auto status sync
│   │   └── cron/                 # Scheduled tasks
│   ├── admin/                    # Admin dashboard pages
│   │   ├── page.tsx              # Admin overview
│   │   ├── gmp/                  # GMP management page
│   │   ├── ipos/                 # IPO management (new/edit)
│   │   └── reviews/              # Reviews management
│   ├── ipo/[slug]/               # Dynamic IPO detail pages
│   ├── gmp/                      # GMP tracker page
│   ├── listed/                   # Listed IPOs page
│   ├── upcoming/                 # Upcoming IPOs page
│   ├── sme/                      # SME IPOs page
│   ├── allotment-status/         # Allotment checker
│   ├── subscription-status/      # Subscription tracker
│   ├── about/                    # About page
│   ├── contact/                  # Contact page
│   ├── privacy/                  # Privacy policy
│   └── disclaimer/               # Disclaimer page
│
├── components/                   # React components
│   ├── header.tsx                # Main navigation header
│   ├── footer.tsx                # Site footer
│   ├── ticker.tsx                # Stock ticker component
│   ├── ipo-card.tsx              # IPO card component
│   ├── status-bar.tsx            # IPO status indicator
│   ├── home/                     # Homepage components
│   │   ├── hero-section.tsx      # Hero with ticker
│   │   ├── current-ipos.tsx      # Current IPO listings
│   │   ├── listed-ipos.tsx       # Recent listed IPOs
│   │   ├── gmp-tracker.tsx       # GMP overview
│   │   ├── market-sentiment.tsx  # Market sentiment widget
│   │   ├── news-section.tsx      # IPO news
│   │   └── sidebar.tsx           # Homepage sidebar
│   ├── ipo-detail/               # IPO detail page components
│   │   ├── ipo-hero.tsx          # IPO header with key info
│   │   ├── ai-prediction.tsx     # AI prediction card
│   │   ├── issue-details.tsx     # Issue structure
│   │   ├── company-financials.tsx# Financial data
│   │   ├── expert-reviews.tsx    # Reviews section
│   │   ├── peer-comparison.tsx   # Peer analysis
│   │   └── ipo-tabs.tsx          # Tab navigation
│   ├── listed/                   # Listed IPOs page components
│   ├── admin/                    # Admin components
│   │   └── ipo-form.tsx          # IPO create/edit form
│   └── ui/                       # shadcn/ui components
│
├── lib/                          # Core utilities & data
│   ├── data.ts                   # Type definitions & fallback data
│   ├── utils.ts                  # Utility functions (cn, etc.)
│   ├── supabase.ts               # Simple Supabase client
│   └── supabase/                 # Supabase utilities
│       ├── client.ts             # Browser client
│       ├── server.ts             # Server client
│       └── queries.ts            # Database queries
│
├── hooks/                        # Custom React hooks
│   ├── use-mobile.ts             # Mobile detection
│   ├── use-toast.ts              # Toast notifications
│   └── use-listed-filters.ts     # Listed IPOs filtering
│
├── scripts/                      # Database migrations & seeds
│   ├── schema.sql                # Simple schema (for quick setup)
│   ├── seed.sql                  # Sample seed data
│   ├── 001_create_ipo_tables.sql # Full schema with all tables
│   ├── 002_add_logo_url.sql      # Logo URL migration
│   ├── 002_add_exchange_symbols.sql
│   └── 003_add_chittorgarh_url.sql
│
├── data/                         # Static data files
│   └── listed-ipos/              # Historical listed IPO data
│
├── public/                       # Static assets
│   └── images/                   # Logo and images
│
├── next.config.mjs               # Next.js configuration
├── open-next.config.ts           # OpenNext Cloudflare config
├── wrangler.jsonc                # Cloudflare Workers config
└── vercel.json                   # Vercel deployment config
```

---

## Database Schema (Supabase)

### Core Tables

#### `ipos` - Main IPO Data Table
```sql
CREATE TABLE ipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,         -- Full IPO name (NOT "name")
  slug TEXT UNIQUE NOT NULL,          -- URL-friendly identifier
  status TEXT NOT NULL DEFAULT 'upcoming',  -- open|lastday|allot|listing|upcoming|closed|listed
  
  -- Pricing
  price_min NUMERIC(12,2),            -- Min price (93)
  price_max NUMERIC(12,2),            -- Max price (98)
  lot_size INT NOT NULL,
  issue_size TEXT,                    -- Display "31.75 Cr"
  
  -- Exchange & Sector
  exchange TEXT NOT NULL,             -- 'BSE SME'|'NSE SME'|'Mainboard'
  sector TEXT,
  
  -- Dates
  open_date DATE NOT NULL,
  close_date DATE NOT NULL,
  allotment_date DATE,
  listing_date DATE,                  -- NOT "list_date"
  
  -- GMP Data
  gmp NUMERIC(10,2) DEFAULT 0,
  gmp_last_updated TIMESTAMPTZ,
  
  -- Subscription Data
  subscription_total NUMERIC(10,2) DEFAULT 0,
  subscription_retail TEXT DEFAULT '-',
  subscription_nii TEXT DEFAULT '-',
  subscription_qib TEXT DEFAULT '-',
  subscription_day INT DEFAULT 0,
  subscription_is_final BOOLEAN DEFAULT FALSE,
  
  -- AI Predictions
  ai_prediction NUMERIC(6,2) DEFAULT 0,
  ai_confidence INT DEFAULT 50,
  sentiment_score INT DEFAULT 50,
  sentiment_label TEXT DEFAULT 'Neutral',  -- Bullish|Neutral|Bearish
  
  -- Appearance
  bg_color TEXT DEFAULT '#f0f9ff',
  fg_color TEXT DEFAULT '#0369a1',
  logo_url TEXT,
  
  -- Additional Info
  registrar TEXT,
  brlm TEXT,                          -- Book Running Lead Manager (NOT "lead_manager")
  description TEXT,                   -- Company description (NOT "about_company")
  chittorgarh_url TEXT,
  investorgain_gmp_url TEXT,
  investorgain_sub_url TEXT,
  nse_symbol TEXT,
  bse_scrip_code TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**CRITICAL: Column Name Mapping (TypeScript → Database)**
| TypeScript Property | Database Column |
|---------------------|-----------------|
| `name` | `company_name` |
| `listDate` | `listing_date` |
| `leadManager` | `brlm` |
| `aboutCompany` | `description` |

#### `gmp_history` - GMP Price History
```sql
CREATE TABLE gmp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  gmp INT NOT NULL,
  gmp_percent NUMERIC(6,2),
  date DATE,
  source TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Additional Tables (defined in 001_create_ipo_tables.sql)
- `ipo_financials` - Financial data (revenue, PAT, EBITDA by fiscal year)
- `ipo_issue_details` - Issue structure details
- `subscription_history` - Day-by-day subscription data
- `expert_reviews` - Expert/analyst reviews
- `peer_companies` - Peer comparison data
- `listed_ipos` - Historical listed IPO data

### Row Level Security (RLS)
- All tables have RLS enabled
- Public read access for all IPO data
- Admin write access requires authentication

---

## Data Flow Architecture

### 1. Server-Side Data Fetching (Homepage)
```
app/page.tsx
    │
    ├── getCurrentIPOs()  ──────► Supabase: ipos + gmp_history
    │   └── lib/supabase/queries.ts
    │
    ├── getListedIPOs()   ──────► Supabase: ipos WHERE status='listed'
    │
    └── Fallback to lib/data.ts if Supabase returns empty
```

### 2. Dynamic IPO Detail Page
```
app/ipo/[slug]/page.tsx
    │
    ├── getIPOBySlug(slug)  ────► Supabase: single IPO + gmp_history
    │
    └── Fallback to static data from lib/data.ts
```

### 3. Admin Data Management
```
Admin Dashboard (app/admin/)
    │
    ├── GET /api/admin/ipos      ──► List all IPOs
    ├── POST /api/admin/ipos     ──► Create new IPO
    ├── PATCH /api/admin/ipos/[id] ─► Update IPO
    ├── DELETE /api/admin/ipos/[id] ─► Delete IPO
    │
    ├── GET /api/admin/gmp       ──► List GMP history
    ├── POST /api/admin/gmp      ──► Add GMP entry
    │
    └── POST /api/admin/reviews  ──► Add expert review
```

---

## Key TypeScript Interfaces

### IPO Interface (lib/data.ts)
```typescript
export interface IPO {
  id: number;
  name: string;
  slug: string;
  abbr: string;
  bgColor: string;
  fgColor: string;
  logoUrl?: string;
  exchange: 'BSE SME' | 'NSE SME' | 'Mainboard' | 'REIT';
  sector: string;
  openDate: string;
  closeDate: string;
  allotmentDate: string;
  listDate: string;
  priceMin: number;
  priceMax: number;
  lotSize: number;
  issueSize: string;
  issueSizeCr: number;
  freshIssue: string;
  ofs: string;
  gmp: number;
  gmpPercent: number;
  gmpLastUpdated: string;
  estListPrice: number;
  subscription: {
    total: number;
    retail: string;
    nii: string;
    qib: string;
    day: number;
    isFinal: boolean;
  };
  aiPrediction: number;
  aiConfidence: number;
  sentimentScore: number;
  sentimentLabel: 'Bullish' | 'Neutral' | 'Bearish';
  status: 'open' | 'lastday' | 'allot' | 'listing' | 'upcoming' | 'closed';
  registrar: string;
  leadManager: string;
  marketCap: string;
  peRatio: number;
  aboutCompany: string;
  financials?: {...};
  issueDetails?: {...};
  gmpHistory?: GMPHistoryEntry[];
  subscriptionHistory?: SubscriptionHistoryEntry[];
  expertReviews?: ExpertReview[];
  peerCompanies?: PeerCompany[];
}
```

---

## Environment Variables Required

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Admin authentication
ADMIN_PASSWORD=your-admin-password
```

---

## Design System

### Color Tokens (defined in globals.css)
```css
--primary: #4F46E5;        /* Indigo - brand color */
--emerald: #15803D;        /* Green - positive/gain */
--destructive: #DC2626;    /* Red - negative/loss */
--gold: #B45309;           /* Amber - warnings */
--cobalt: #1D4ED8;         /* Blue - info */

/* Text hierarchy */
--ink: #111827;            /* Primary text */
--ink2: #374151;           /* Secondary text */
--ink3: #6B7280;           /* Muted text */
--ink4: #9CA3AF;           /* Disabled text */
```

### Fonts
- **Headings:** Sora (var(--font-sora))
- **Body:** DM Sans (var(--font-dm-sans))

---

## IPO Status Lifecycle

```
upcoming ──► open ──► lastday ──► closed ──► allot ──► listing ──► listed
```

| Status | Description |
|--------|-------------|
| `upcoming` | IPO announced, not yet open for subscription |
| `open` | Currently accepting subscriptions |
| `lastday` | Last day to subscribe |
| `closed` | Subscription period ended |
| `allot` | Allotment being processed |
| `listing` | Listed on exchange |
| `listed` | Historical record |

---

## API Endpoints Summary

### Public (No Auth)
- `GET /api/admin/ipos` - List all IPOs
- `GET /api/admin/gmp` - List GMP history

### Admin (Auth Required)
- `POST /api/admin/ipos` - Create IPO
- `PATCH /api/admin/ipos/[id]` - Update IPO
- `DELETE /api/admin/ipos/[id]` - Delete IPO
- `POST /api/admin/gmp` - Add GMP entry
- `POST /api/admin/reviews` - Add review
- `POST /api/admin/upload-logo` - Upload IPO logo
- `POST /api/admin/ipos/[id]/migrate-listed` - Migrate to listed

### Cron Jobs
- `GET /api/cron/update-subscriptions` - Auto-update subscription data

---

## Component Patterns

### Server Component (RSC) Data Fetching
```tsx
// app/page.tsx
export default async function HomePage() {
  const ipos = await getCurrentIPOs();
  return <CurrentIPOs ipos={ipos} />;
}
```

### Client Component with SWR
```tsx
'use client';
import useSWR from 'swr';

export function GMPTracker() {
  const { data, error } = useSWR('/api/admin/gmp', fetcher);
  // ...
}
```

### Hybrid Fallback Pattern
```tsx
// Fetch from Supabase, fallback to static data
let ipos = await getCurrentIPOs();
if (ipos.length === 0) {
  ipos = fallbackIPOs; // from lib/data.ts
}
```

---

## Common Tasks for AI Agents

### Adding a New IPO Field
1. Update `lib/data.ts` - Add to IPO interface
2. Update `lib/supabase/queries.ts` - Add to transformIPO()
3. Update `scripts/` - Add migration SQL
4. Update `app/api/admin/ipos/route.ts` - Handle in POST/PATCH
5. Update `components/admin/ipo-form.tsx` - Add form field

### Adding a New Page
1. Create `app/[route]/page.tsx`
2. Add route to `components/header.tsx` navLinks
3. Add route to homepage allPages array
4. Update `app/sitemap.ts`

### Modifying GMP Display
1. Check `lib/supabase/queries.ts` - transformIPO() for GMP calculation
2. Update `components/home/gmp-tracker.tsx` for homepage
3. Update `components/ipo-detail/ai-prediction.tsx` for detail page

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-10 | Initial documentation created |

---

## Notes for AI Agents

1. **Always check Supabase integration** before database operations
2. **Use fallback patterns** - Static data in lib/data.ts when Supabase unavailable
3. **Follow existing patterns** for new features
4. **Update this document** when making significant changes
5. **Test with both** Supabase data and fallback data
