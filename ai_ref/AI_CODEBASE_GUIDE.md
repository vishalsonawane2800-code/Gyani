# IPOGyani - AI Agent Codebase Documentation

> **Last Updated:** 2026-04-15
> **Purpose:** Complete reference for AI agents to understand the IPOGyani codebase structure, Supabase integration, and architecture patterns.
> **Hosting:** Cloudflare Pages (via OpenNext adapter)
> **Database:** Supabase (PostgreSQL) - connected externally to Cloudflare

---

## Quick Start

**Key Points for AI Agents:**
1. Project is hosted on **Cloudflare**, NOT Vercel
2. Database is **Supabase (PostgreSQL)** - connected via environment variables on Cloudflare
3. The last 4 migration scripts have been run - all tables exist
4. Use `lib/supabase/server.ts` for server-side queries
5. Use `lib/supabase/client.ts` for client-side queries
6. Fallback data exists in `lib/data.ts` if Supabase returns empty

---

## Project Overview

**IPOGyani** is India's smartest IPO research platform providing:
- Live GMP (Grey Market Premium) tracking
- AI-predicted listing gains
- Real-time subscription data
- Market sentiment analysis
- Expert reviews for all mainboard and SME IPOs

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.2.0 | React framework with App Router |
| React | 19 | UI library |
| TypeScript | 5.7.3 | Type safety |
| Tailwind CSS | 4.2.0 | Styling (v4 - no tailwind.config.js) |
| Supabase | 2.102.1 | PostgreSQL database |
| @opennextjs/cloudflare | 1.18.0 | Cloudflare adapter |
| Recharts | 2.15.0 | Data visualization |
| Zustand | 5.0.12 | State management |
| Lucide React | 0.564.0 | Icons |
| Jose | 6.2.2 | JWT authentication |
| bcryptjs | 3.0.3 | Password hashing |

### Hosting & Deployment

- **Production Host:** Cloudflare Pages (via OpenNext adapter)
- **Database:** Supabase (PostgreSQL) - external connection
- **Build Command:** `pnpm run build` (runs `opennextjs-cloudflare build`)
- **Deploy Command:** `wrangler deploy`

---

## Environment Variables (Cloudflare)

```env
# Supabase Configuration (REQUIRED - set in Cloudflare dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Admin Authentication (REQUIRED)
JWT_SECRET=your-jwt-secret-key

# Optional: Vercel Blob for logo uploads
BLOB_READ_WRITE_TOKEN=your-blob-token
```

**Note:** These environment variables are configured in Cloudflare Pages dashboard, NOT in a local .env file.

---

## Directory Structure

```
/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (Inter font, Analytics)
│   ├── page.tsx                  # Homepage - fetches IPOs from Supabase
│   ├── globals.css               # Design system tokens (Tailwind v4)
│   │
│   ├── api/                      # API Routes
│   │   ├── admin/                # Admin API endpoints
│   │   │   ├── ipos/             # IPO CRUD operations
│   │   │   │   ├── route.ts      # GET (list), POST (create)
│   │   │   │   └── [id]/         # Dynamic IPO routes
│   │   │   │       ├── route.ts  # GET, PUT, DELETE single IPO
│   │   │   │       ├── financials/
│   │   │   │       ├── gmp-history/
│   │   │   │       ├── issue-details/
│   │   │   │       ├── kpi/
│   │   │   │       ├── peers/
│   │   │   │       ├── subscription-history/
│   │   │   │       ├── subscription-live/
│   │   │   │       └── migrate-listed/
│   │   │   ├── gmp/              # GMP management
│   │   │   ├── reviews/          # Expert reviews
│   │   │   ├── login/            # Admin login (JWT)
│   │   │   ├── reset-password/   # Password reset
│   │   │   ├── upload-logo/      # Logo upload (Vercel Blob)
│   │   │   ├── auto-status/      # Auto status sync
│   │   │   └── scrape-ipo/       # IPO scraping
│   │   └── cron/                 # Scheduled tasks
│   │       ├── run-all/
│   │       ├── scrape-gmp/
│   │       ├── scrape-gmp-history/
│   │       ├── scrape-subscription/
│   │       └── update-subscriptions/
│   │
│   ├── admin/                    # Admin dashboard pages
│   │   ├── page.tsx              # Dashboard overview
│   │   ├── layout.tsx            # Admin layout
│   │   ├── dashboard-client.tsx  # Client component
│   │   ├── login/                # Login page
│   │   ├── gmp/                  # GMP management
│   │   ├── ipos/                 # IPO management
│   │   │   ├── new/              # Create new IPO
│   │   │   └── [id]/             # Edit IPO
│   │   ├── reviews/              # Reviews management
│   │   ├── settings/             # Admin settings
│   │   └── reset-password/       # Password reset
│   │
│   ├── ipo/[slug]/               # Dynamic IPO detail pages
│   ├── gmp/                      # GMP tracker page
│   ├── ipo-gmp/                  # IPO GMP guide page
│   ├── listed/                   # Listed IPOs page
│   ├── upcoming/                 # Upcoming IPOs page
│   ├── sme/                      # SME IPOs page
│   ├── allotment-status/         # Allotment checker
│   ├── subscription-status/      # Subscription tracker
│   ├── listing-gain/             # Listing gain analysis
│   ├── best-ipo/                 # Best IPO recommendations
│   ├── shareholder-quota/        # Shareholder quota info
│   ├── about/                    # About page
│   ├── contact/                  # Contact page
│   ├── privacy/                  # Privacy policy
│   ├── disclaimer/               # Disclaimer page
│   ├── methodology/              # AI methodology
│   ├── accuracy/                 # AI accuracy page
│   ├── sitemap.ts                # Dynamic sitemap
│   └── robots.ts                 # Robots.txt
│
├── components/                   # React components
│   ├── header.tsx                # Main navigation
│   ├── footer.tsx                # Site footer
│   ├── ticker.tsx                # Stock ticker
│   ├── ipo-card.tsx              # IPO card
│   ├── status-bar.tsx            # Status indicator
│   │
│   ├── home/                     # Homepage components
│   │   ├── hero-section.tsx      # Hero with ticker
│   │   ├── current-ipos.tsx      # Current IPO listings
│   │   ├── listed-ipos.tsx       # Recent listed IPOs
│   │   ├── gmp-tracker.tsx       # GMP overview
│   │   ├── market-sentiment.tsx  # Market sentiment
│   │   ├── market-sentiment-score.tsx
│   │   ├── ai-accuracy.tsx       # AI accuracy widget
│   │   ├── news-section.tsx      # IPO news
│   │   └── sidebar.tsx           # Homepage sidebar
│   │
│   ├── ipo-detail/               # IPO detail components
│   │   ├── ipo-hero.tsx          # IPO header
│   │   ├── ai-prediction.tsx     # AI prediction card
│   │   ├── issue-details.tsx     # Issue structure
│   │   ├── company-financials.tsx
│   │   ├── expert-reviews.tsx    
│   │   ├── peer-comparison.tsx   
│   │   ├── subscription-live.tsx # Live subscription
│   │   ├── subscription-history.tsx
│   │   └── ipo-tabs.tsx          # Tab navigation
│   │
│   ├── listed/                   # Listed IPOs components
│   │   └── listed-table.tsx      # Listed IPOs table
│   │
│   ├── admin/                    # Admin components
│   │   ├── ipo-form.tsx          # IPO create/edit form
│   │   └── bulk-data-entry.tsx   # Bulk data entry
│   │
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── toast.tsx
│       └── ... (40+ components)
│
├── lib/                          # Core utilities
│   ├── data.ts                   # Type definitions & fallback data
│   ├── utils.ts                  # Utility functions (cn)
│   ├── jwt.ts                    # JWT sign/verify (jose)
│   ├── hash.ts                   # Password hashing (bcryptjs)
│   ├── bulk-data-parsers.ts      # Bulk data parsing
│   ├── supabase.ts               # Simple Supabase client (deprecated)
│   └── supabase/                 # Supabase utilities
│       ├── client.ts             # Browser client
│       ├── server.ts             # Server client (async)
│       └── queries.ts            # Database queries & transformers
│
├── hooks/                        # Custom React hooks
│   ├── use-mobile.ts             # Mobile detection
│   ├── use-toast.ts              # Toast notifications
│   └── use-listed-filters.ts     # Listed IPOs filtering
│
├── cloudflare-worker/            # Cloudflare Worker files
│   └── src/
│       ├── index.ts              # Main worker
│       └── index-jwt.ts          # JWT worker
│
├── ai_ref/                       # AI reference documentation
│   ├── AI_CODEBASE_GUIDE.md      # This file
│   ├── DATABASE_SCHEMA.md        # Database schema reference
│   ├── QUICK_REFERENCE.md        # Quick fixes reference
│   └── ... (other docs)
│
├── public/                       # Static assets
│   └── images/
│
├── package.json
├── next.config.mjs               # Next.js configuration
├── open-next.config.ts           # OpenNext Cloudflare config
├── wrangler.jsonc                # Cloudflare Workers config
└── tsconfig.json
```

---

## Supabase Integration

### Connection Setup

**Server-side (lib/supabase/server.ts):**
```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null  // Returns null if not configured
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}
```

**Client-side (lib/supabase/client.ts):**
```typescript
import { createClient } from '@supabase/supabase-js'

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Usage Pattern
```typescript
// In API routes or server components
const supabase = await createClient()

// Always check if supabase is available
if (!supabase) {
  return [] // Return empty or fallback data
}

const { data, error } = await supabase
  .from('ipos')
  .select('*')
  .order('open_date', { ascending: true })
```

---

## Database Schema (Supabase PostgreSQL)

### All Tables (Already Created via Migration Scripts)

| Table | Purpose |
|-------|---------|
| `ipos` | Main IPO data |
| `gmp_history` | GMP price history |
| `subscription_live` | Live subscription by category |
| `subscription_history` | Day-wise subscription history |
| `ipo_financials` | Financial data by fiscal year |
| `ipo_kpi` | Key performance indicators |
| `ipo_issue_details` | Issue structure details |
| `expert_reviews` | Expert/analyst reviews |
| `peer_companies` | Peer comparison data |
| `listed_ipos` | Historical listed IPO archive |

### Table: `ipos` (Main Table)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| company_name | TEXT | Full IPO name (NOT "name") |
| slug | TEXT | URL-friendly identifier (UNIQUE) |
| status | TEXT | 'upcoming', 'open', 'lastday', 'closed', 'allot', 'listing', 'listed' |
| exchange | TEXT | 'BSE SME', 'NSE SME', 'Mainboard' |
| sector | TEXT | Industry sector |
| price_min | NUMERIC(12,2) | Minimum price |
| price_max | NUMERIC(12,2) | Maximum price |
| lot_size | INT | Lot size |
| issue_size | TEXT | Display format "31.75 Cr" |
| open_date | DATE | Subscription start |
| close_date | DATE | Subscription end |
| allotment_date | DATE | Allotment date |
| listing_date | DATE | Listing date (NOT "list_date") |
| gmp | NUMERIC(10,2) | Current GMP |
| gmp_last_updated | TIMESTAMPTZ | GMP update time |
| subscription_total | NUMERIC(10,2) | Total subscription |
| subscription_retail | TEXT | Retail subscription |
| subscription_nii | TEXT | NII subscription |
| subscription_qib | TEXT | QIB subscription |
| ai_prediction | NUMERIC(6,2) | AI predicted gain % |
| ai_confidence | INT | AI confidence % |
| sentiment_score | INT | Sentiment score (0-100) |
| sentiment_label | TEXT | 'Bullish', 'Neutral', 'Bearish' |
| bg_color | TEXT | Card background color |
| fg_color | TEXT | Card foreground color |
| logo_url | TEXT | Logo image URL |
| registrar | TEXT | Registrar name |
| brlm | TEXT | Book Running Lead Manager (NOT "lead_manager") |
| description | TEXT | Company description (NOT "about_company") |
| chittorgarh_url | TEXT | Chittorgarh.com URL |
| investorgain_gmp_url | TEXT | InvestorGain GMP URL |
| investorgain_sub_url | TEXT | InvestorGain Sub URL |
| nse_symbol | TEXT | NSE symbol |
| bse_scrip_code | TEXT | BSE scrip code |
| created_at | TIMESTAMPTZ | Created timestamp |

### Critical Column Name Mappings

**TypeScript Interface → Database Column:**
| TypeScript (lib/data.ts) | Database (Supabase) |
|--------------------------|---------------------|
| `name` | `company_name` |
| `listDate` | `listing_date` |
| `leadManager` | `brlm` |
| `aboutCompany` | `description` |
| `abbr` | **REMOVED** - generated on-the-fly |

### Table: `subscription_live`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ipo_id | UUID | Foreign key to ipos |
| category | TEXT | 'anchor', 'qib', 'nii', 'bnii', 'snii', 'retail', 'employee', 'total' |
| subscription_times | NUMERIC(10,2) | Subscription times (e.g., 1.52x) |
| shares_offered | BIGINT | Total shares offered |
| shares_bid_for | BIGINT | Shares bid for |
| total_amount_cr | NUMERIC(12,2) | Total amount in Crores |
| display_order | INT | Display order |
| updated_at | TIMESTAMPTZ | Last update time |

### Table: `subscription_history`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ipo_id | UUID | Foreign key to ipos |
| date | DATE | Subscription date |
| time | TEXT | Time of snapshot (e.g., '17:00') |
| day_number | INT | Day 1, 2, or 3 |
| anchor | NUMERIC | Anchor subscription times |
| retail | NUMERIC | Retail subscription times |
| nii | NUMERIC | NII subscription times |
| snii | NUMERIC | sNII subscription times |
| bnii | NUMERIC | bNII subscription times |
| qib | NUMERIC | QIB subscription times |
| total | NUMERIC | Total subscription times |
| employee | NUMERIC | Employee subscription times |

### Table: `gmp_history`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ipo_id | UUID | Foreign key to ipos |
| gmp | INT | GMP value |
| recorded_at | TIMESTAMPTZ | Timestamp |

### Table: `ipo_financials`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ipo_id | UUID | Foreign key to ipos |
| fiscal_year | TEXT | 'FY23', 'FY24', 'FY25' |
| revenue | NUMERIC(15,2) | Revenue |
| pat | NUMERIC(15,2) | Profit After Tax |
| net_worth | NUMERIC(15,2) | Net Worth |

### Table: `ipo_kpi`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ipo_id | UUID | Foreign key to ipos |
| kpi_type | TEXT | 'dated' or 'pre_post' |
| metric | TEXT | 'roe', 'roce', 'eps', 'pe', etc. |
| date_label | TEXT | Date label or 'pre'/'post' |
| value | NUMERIC | Numeric value |
| text_value | TEXT | Text value |

### Table: `ipo_issue_details`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ipo_id | UUID | Foreign key to ipos (UNIQUE) |
| total_issue_size_cr | NUMERIC | Total issue size in Crores |
| fresh_issue_cr | NUMERIC | Fresh issue amount |
| fresh_issue_percent | NUMERIC | Fresh issue percentage |
| ofs_cr | NUMERIC | OFS amount |
| ofs_percent | NUMERIC | OFS percentage |
| retail_quota_percent | NUMERIC | Retail quota |
| nii_quota_percent | NUMERIC | NII quota |
| qib_quota_percent | NUMERIC | QIB quota |
| ipo_objectives | TEXT[] | Array of objectives |

### Table: `expert_reviews`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ipo_id | UUID | Foreign key to ipos |
| source | TEXT | Review source |
| source_type | TEXT | 'youtube', 'analyst', 'news', 'firm' |
| author | TEXT | Author name |
| summary | TEXT | Review summary |
| sentiment | TEXT | 'positive', 'neutral', 'negative' |
| rating | TEXT | Rating text |
| url | TEXT | Source URL |
| logo_url | TEXT | Source logo |
| review_date | DATE | Review date |

### Table: `peer_companies`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ipo_id | UUID | Foreign key to ipos |
| company_name | TEXT | Peer company name |
| market_cap | NUMERIC | Market cap in Cr |
| revenue | NUMERIC | Revenue in Cr |
| pat | NUMERIC | PAT in Cr |
| pe_ratio | NUMERIC | P/E ratio |
| pb_ratio | NUMERIC | P/B ratio |
| roe | NUMERIC | ROE percentage |

---

## IPO Status Lifecycle

```
upcoming → open → lastday → closed → allot → listing → listed
```

| Status | Description | UI Badge |
|--------|-------------|----------|
| `upcoming` | IPO announced, not yet open | "Coming Soon" |
| `open` | Currently accepting subscriptions | "Open Now" |
| `lastday` | Last day to subscribe | "Last Day" |
| `closed` | Subscription period ended | "Closed" |
| `allot` | Allotment being processed | "Allotment" |
| `listing` | Listing today | "Listing Today" |
| `listed` | Listed on exchange | "Listed" |

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
    ├── getIPOStats()     ──────► Supabase: aggregated stats
    │
    └── Fallback to lib/data.ts if Supabase returns empty
```

### 2. IPO Detail Page
```
app/ipo/[slug]/page.tsx
    │
    └── getIPOBySlug(slug) ────► Supabase: IPO + all related data
        │
        ├── gmp_history
        ├── ipo_financials
        ├── expert_reviews
        ├── peer_companies
        ├── ipo_kpi
        ├── ipo_issue_details
        ├── subscription_live
        └── subscription_history
```

### 3. Admin Operations
```
Admin Dashboard (app/admin/)
    │
    ├── GET /api/admin/ipos           → List all IPOs
    ├── POST /api/admin/ipos          → Create new IPO
    ├── PUT /api/admin/ipos/[id]      → Update IPO
    ├── DELETE /api/admin/ipos/[id]   → Delete IPO
    │
    ├── POST /api/admin/gmp           → Add GMP entry
    ├── POST /api/admin/reviews       → Add expert review
    └── POST /api/admin/upload-logo   → Upload logo (Vercel Blob)
```

---

## Key Query Functions (lib/supabase/queries.ts)

### getCurrentIPOs()
Fetches all current/active IPOs with latest GMP data.
```typescript
// Returns IPO[] - transformed for frontend components
const ipos = await getCurrentIPOs()
```

### getIPOBySlug(slug)
Fetches single IPO with all related data (financials, reviews, KPI, etc.)
```typescript
// Returns IPO | null
const ipo = await getIPOBySlug('fractal-analytics-ipo')
```

### getListedIPOs(options?)
Fetches listed IPOs with optional limit.
```typescript
// Returns ListedIPO[]
const listed = await getListedIPOs({ limit: 10 })
```

### getIPOStats()
Fetches aggregated statistics for mainboard and SME IPOs.
```typescript
// Returns { mainboard: IPOCategoryStats, sme: IPOCategoryStats }
const stats = await getIPOStats()
```

---

## Authentication (Admin)

### JWT-based Authentication

**Login Flow:**
1. POST `/api/admin/login` with username/password
2. Server validates against stored hash
3. Returns JWT token (15 min expiry by default)
4. Client stores token in localStorage

**JWT Utilities (lib/jwt.ts):**
```typescript
import { signJWT, verifyJWT, extractToken } from '@/lib/jwt'

// Sign a JWT
const token = await signJWT({ adminId: '123', username: 'admin' }, '15m')

// Verify a JWT
const payload = await verifyJWT(token)

// Extract token from Authorization header
const token = extractToken(request.headers.get('Authorization'))
```

**Password Hashing (lib/hash.ts):**
```typescript
import { hashPassword, verifyPassword } from '@/lib/hash'

// Hash a password
const hash = await hashPassword('mypassword')

// Verify a password
const isValid = await verifyPassword('mypassword', hash)
```

---

## Design System (globals.css)

### Color Tokens
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

/* Backgrounds */
--background: #F8FAFC;     /* Page background */
--card: #FFFFFF;           /* Card background */
--secondary: #F1F5F9;      /* Secondary background */
```

### Fonts
- **Primary Font:** Inter (loaded via Next.js font optimization)
- **CSS Variable:** `var(--font-sans)`

---

## API Endpoints Reference

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/ipos` | List all IPOs |
| GET | `/api/admin/ipos/[id]` | Get single IPO |

### Admin Endpoints (JWT Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| POST | `/api/admin/ipos` | Create IPO |
| PUT | `/api/admin/ipos/[id]` | Update IPO |
| DELETE | `/api/admin/ipos/[id]` | Delete IPO |
| POST | `/api/admin/gmp` | Add GMP entry |
| PUT | `/api/admin/gmp/[id]` | Update GMP |
| POST | `/api/admin/reviews` | Add review |
| PUT | `/api/admin/reviews/[id]` | Update review |
| DELETE | `/api/admin/reviews/[id]` | Delete review |
| POST | `/api/admin/upload-logo` | Upload logo |
| POST | `/api/admin/ipos/[id]/financials` | Add financials |
| POST | `/api/admin/ipos/[id]/kpi` | Add KPI data |
| POST | `/api/admin/ipos/[id]/issue-details` | Add issue details |
| POST | `/api/admin/ipos/[id]/subscription-live` | Add live subscription |
| POST | `/api/admin/ipos/[id]/subscription-history` | Add subscription history |
| POST | `/api/admin/ipos/[id]/gmp-history` | Add GMP history |
| POST | `/api/admin/ipos/[id]/peers` | Add peer companies |

### Cron Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cron/run-all` | Run all cron jobs |
| GET | `/api/cron/scrape-gmp` | Scrape latest GMP |
| GET | `/api/cron/scrape-gmp-history` | Scrape GMP history |
| GET | `/api/cron/scrape-subscription` | Scrape subscription data |
| GET | `/api/cron/update-subscriptions` | Update subscription data |

---

## Common Tasks for AI Agents

### 1. Adding a New IPO Field

1. **Update TypeScript types** (`lib/data.ts`):
   ```typescript
   export interface IPO {
     // ... existing fields
     newField: string;  // Add new field
   }
   ```

2. **Update transformer** (`lib/supabase/queries.ts`):
   ```typescript
   function transformIPO(ipo: IPOSimple): IPO {
     return {
       // ... existing mappings
       newField: ipo.new_field_db || '',
     }
   }
   ```

3. **Add database migration**:
   ```sql
   ALTER TABLE ipos ADD COLUMN new_field_db TEXT;
   ```

4. **Update API routes** (`app/api/admin/ipos/route.ts`):
   ```typescript
   const ipoData = {
     // ... existing fields
     new_field_db: body.newField || null,
   }
   ```

5. **Update admin form** (`components/admin/ipo-form.tsx`)

### 2. Adding a New Page

1. Create `app/[route]/page.tsx`
2. Add to `components/header.tsx` navLinks
3. Add to homepage allPages array in `app/page.tsx`
4. Update `app/sitemap.ts`

### 3. Querying Supabase

```typescript
// Always use async createClient
const supabase = await createClient()

// Check for null (not configured)
if (!supabase) {
  return fallbackData
}

// Query with proper error handling
const { data, error } = await supabase
  .from('ipos')
  .select('*')
  .eq('status', 'open')

if (error) {
  console.error('Query error:', error)
  return []
}

return data
```

---

## Troubleshooting

### Error: "Could not find table 'public.ipos'"
**Solution:** Reload Supabase schema cache
```sql
NOTIFY pgrst, 'reload schema';
```
Or: Supabase Dashboard → Project Settings → API → "Reload schema"

### Error: Supabase returns null
**Cause:** Environment variables not set on Cloudflare
**Solution:** Check Cloudflare Pages dashboard → Settings → Environment Variables

### Error: JWT verification failed
**Cause:** JWT_SECRET mismatch or expired token
**Solution:** Ensure JWT_SECRET is same across all environments

---

## Notes for AI Agents

1. **Always check Supabase availability** - createClient() returns null if env vars missing
2. **Use fallback patterns** - Static data in lib/data.ts when Supabase unavailable
3. **Column name mapping is critical** - TypeScript uses camelCase, DB uses snake_case
4. **The `abbr` field was removed** - It's now generated on-the-fly from company_name
5. **Project runs on Cloudflare** - Not Vercel, use Cloudflare-specific patterns
6. **All tables already exist** - Migration scripts have been run
7. **Follow existing patterns** for consistency
8. **Update this document** when making significant changes

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-15 | Updated with complete Supabase integration, all tables documented |
| 2026-04-10 | Removed abbr field, documented column mappings |
| 2026-04-10 | Initial documentation created |
