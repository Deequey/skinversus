# SkinVersus — Premium build

A Versus-style comparison platform for Counter-Strike 2 skins. This version is designed as a polished product rather than a basic CRUD demo.

## What is included

- Premium responsive dark UI with smooth native scrolling and reveal animations
- Smart skin search where word order does not matter
  - `tiger tooth talon` → `★ Talon Knife | Tiger Tooth`
  - `doppler m9`
  - `deagle printstream`
  - aliases such as `ak`, `ak47`, `deagle`, `bfk`, `kara`, `m4a1s`
- Global search with `Ctrl/Cmd + K`
- 1v1 comparison pages with community voting
- Optimistic battle voting — UI updates instantly
- Individual skin upvote/downvote without an account
- Community Score and approval percentage
- Multi-compare for 2–4 skins with no voting
- Filterable/searchable community rankings
- Player reviews (account required only for written reviews)
- Related skins on each skin profile
- Quick "compare against" picker on skin pages
- Random matchup / "Surprise me"
- Native share/copy-link controls
- Custom loading, error and 404 states
- Dynamic sitemap + robots route
- Supabase RLS + RPC voting functions
- CS2 skin importer using ByMykel/CSGO-API
- Vercel-ready Next.js app

## Stack

- Next.js 16.3.3 App Router
- React 19.3
- TypeScript
- Tailwind CSS 4
- Supabase Postgres + Auth
- Zod
- Lucide icons
- Node.js 24
- Vercel

No animation framework is required. The visual effects use CSS + `IntersectionObserver`, which keeps the client bundle lighter.

## 1. Install

Use Node.js 24, then:

```bash
npm install
```

## 2. Supabase

Create a Supabase project. Open **SQL Editor**, paste the full contents of:

```text
supabase/schema.sql
```

and run it once.

This creates the database tables, views, RLS policies and RPC functions used by the app.

## 3. Environment variables

Copy `.env.example` to `.env.local`.

Windows CMD:

```cmd
copy .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SUPABASE_URL` must be the project root URL only. Do **not** append `/rest/v1`.

Keep `SUPABASE_SERVICE_ROLE_KEY` private. It is needed only by the import script and must never be exposed in browser code.

## 4. Email confirmation / SMTP

Login is optional for the core product. Users can search, compare, battle-vote and upvote/downvote without an account.

Accounts are used for written reviews.

For local development you can temporarily disable **Confirm email** in Supabase Auth. For production, configure a custom SMTP provider such as Resend and keep confirmation enabled.

If confirmation is enabled, set the confirmation template link to:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## 5. Import skins

```bash
npm run import:skins
```

The importer downloads the English skin metadata feed and upserts the records into `public.skins`.

## 6. Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Main routes

```text
/                              premium homepage + 1v1 builder
/compare/[left]/vs/[right]     head-to-head comparison + battle vote
/compare/multi                 2–4 skin shortlist comparison
/skins/[slug]                  skin profile + reactions + reviews
/rankings                      searchable/filterable community ranking
/login                         optional account for written reviews
/sitemap.xml                   dynamic skin sitemap
```

## 7. Deploy to Vercel

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Set Node.js to 24.x.
4. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
5. Do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel unless you intentionally run private server-only admin/import jobs there.
6. Deploy.
7. Update Supabase Auth Site URL to your production domain and keep localhost as an allowed redirect URL for development.

## Prices

The metadata importer is not a marketplace-price feed. `skins.price_usd` is intentionally nullable. Until a proper permitted marketplace data source is connected, the UI displays `—` rather than fake or stale prices.

## Before a large public launch

The app is a strong MVP, but anonymous voting still needs production anti-abuse controls before meaningful traffic:

- rate limiting on vote/reaction endpoints
- bot / abuse heuristics or CAPTCHA for suspicious traffic
- review reporting and moderation
- analytics and error monitoring
- legal/privacy pages appropriate to your deployment
- a permitted market price source if prices are added

## Important product principle

The community score is a preference signal, not an investment rating. The UI deliberately shows the data and trade-offs instead of declaring an objective "best" skin.
