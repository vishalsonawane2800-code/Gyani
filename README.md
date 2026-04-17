# IPOGyani

IPO tracking and prediction platform built with Next.js, Supabase, and Vercel.

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

## Tech Stack

- **Framework**: Next.js 16.2.0 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS 4.2.0
- **State**: Zustand, SWR
- **UI**: Radix UI, Lucide React, Recharts
- **Fonts**: Sora (headings), DM Sans (body)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Vercel Deployment

This project is deployed on Vercel. Every push to `main` triggers an automatic deployment.

### Required Environment Variables

Set these in your Vercel project settings (Settings > Environment Variables):

#### Database (Supabase)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase URL for client-side
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key for client-side

#### Automation & Cron Jobs
- `CRON_SECRET` - Secret token to protect cron endpoints (generate a secure random string)
- `ML_EXPORT_SECRET` - Secret for ML training data export endpoints

#### External Services (for automation features)
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL for caching
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- `YOUTUBE_API_KEY` - YouTube Data API key for video summaries
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token for ML model storage

### Cron Jobs

The project uses a single dispatcher cron (Vercel Hobby tier supports 2 crons):

| Schedule | Endpoint | Description |
|----------|----------|-------------|
| Every 15 min | `/api/cron/dispatch` | Routes to GMP, subscription, and news scrapers |

The dispatcher internally manages which scrapers to run based on time-of-day and data freshness.

## Project Structure

```
app/                    # Next.js App Router pages
app/api/admin/          # Admin API endpoints
app/api/cron/           # Cron job endpoints
components/             # React components
  home/                 # Homepage components
  ipo-detail/           # IPO detail page components
  admin/                # Admin panel components
  ui/                   # Shared UI components
lib/                    # Utilities and configurations
  supabase/             # Supabase client and queries
scripts/                # SQL migrations
hooks/                  # Custom React hooks
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
