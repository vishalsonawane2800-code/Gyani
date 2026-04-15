# IPOGyani - Quick Reference

> **Last Updated:** 2026-04-15
> **Purpose:** Quick lookup for common operations and patterns

---

## Hosting & Database

| Item | Value |
|------|-------|
| **Hosting** | Cloudflare Pages |
| **Database** | Supabase (PostgreSQL) |
| **Build** | `pnpm run build` (opennextjs-cloudflare) |
| **Deploy** | `wrangler deploy` |

---

## Environment Variables (Cloudflare Dashboard)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
BLOB_READ_WRITE_TOKEN=your-blob-token  # Optional
```

---

## Key File Locations

| Purpose | Location |
|---------|----------|
| Types & Interfaces | `lib/data.ts` |
| Supabase Server Client | `lib/supabase/server.ts` |
| Supabase Browser Client | `lib/supabase/client.ts` |
| Database Queries | `lib/supabase/queries.ts` |
| JWT Auth | `lib/jwt.ts` |
| Password Hashing | `lib/hash.ts` |
| Design Tokens | `app/globals.css` |
| Root Layout | `app/layout.tsx` |

---

## Column Name Mappings (TypeScript → Database)

| TypeScript | Database |
|------------|----------|
| `name` | `company_name` |
| `listDate` | `listing_date` |
| `leadManager` | `brlm` |
| `aboutCompany` | `description` |
| `abbr` | **REMOVED** (generated on-the-fly) |

---

## IPO Status Values

| Status | Description |
|--------|-------------|
| `upcoming` | Not yet open |
| `open` | Accepting subscriptions |
| `lastday` | Last day |
| `closed` | Subscription ended |
| `allot` | Allotment phase |
| `listing` | Listing today |
| `listed` | Listed (historical) |

---

## Common Supabase Patterns

### Server Component Query
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  if (!supabase) return <div>Not configured</div>
  
  const { data } = await supabase.from('ipos').select('*')
  return <IPOList ipos={data} />
}
```

### API Route Query
```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('ipos').select('*')
  
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}
```

### Client Component Query
```typescript
'use client'
import { createBrowserClient } from '@/lib/supabase/client'

export function Component() {
  const supabase = createBrowserClient()
  
  useEffect(() => {
    supabase.from('ipos').select('*').then(({ data }) => {
      setIpos(data)
    })
  }, [])
}
```

---

## Abbreviation Generation (No abbr column)

```typescript
function generateAbbr(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'IP'
}

// Examples:
// "Fractal Analytics" → "FA"
// "APSIS Aerocom" → "AA"
// "RailTel" → "RA"
```

---

## All Database Tables

| Table | Purpose |
|-------|---------|
| `ipos` | Main IPO data |
| `gmp_history` | GMP price history |
| `subscription_live` | Live subscription by category |
| `subscription_history` | Day-wise subscription |
| `ipo_financials` | Financial data |
| `ipo_kpi` | Key performance indicators |
| `ipo_issue_details` | Issue structure |
| `expert_reviews` | Expert reviews |
| `peer_companies` | Peer comparisons |
| `listed_ipos` | Listed IPO archive |

---

## Design System Colors

```css
/* Primary */
--primary: #4F46E5;        /* Indigo */

/* Status Colors */
--emerald: #15803D;        /* Green - positive */
--destructive: #DC2626;    /* Red - negative */
--gold: #B45309;           /* Amber - warning */
--cobalt: #1D4ED8;         /* Blue - info */

/* Text Hierarchy */
--ink: #111827;            /* Primary */
--ink2: #374151;           /* Secondary */
--ink3: #6B7280;           /* Muted */
--ink4: #9CA3AF;           /* Disabled */
```

---

## API Endpoints Quick Reference

### IPO CRUD
- `GET /api/admin/ipos` - List all
- `GET /api/admin/ipos/[id]` - Get one
- `POST /api/admin/ipos` - Create
- `PUT /api/admin/ipos/[id]` - Update
- `DELETE /api/admin/ipos/[id]` - Delete

### Related Data (under /api/admin/ipos/[id]/)
- `/financials` - Financial data
- `/kpi` - KPI data
- `/issue-details` - Issue structure
- `/subscription-live` - Live subscription
- `/subscription-history` - Subscription history
- `/gmp-history` - GMP history
- `/peers` - Peer companies
- `/migrate-listed` - Migrate to listed

---

## Troubleshooting

### Schema Cache Error
```sql
NOTIFY pgrst, 'reload schema';
```
Or: Supabase Dashboard → Project Settings → API → "Reload schema"

### Supabase Returns Null
Check Cloudflare environment variables are set.

### JWT Verification Failed
Ensure JWT_SECRET is same across all environments.

---

## Quick Commands

```bash
# Development
pnpm dev

# Build for Cloudflare
pnpm run build

# Deploy to Cloudflare
wrangler deploy

# Preview locally
wrangler pages dev .open-next/static
```
