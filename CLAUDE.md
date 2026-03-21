# iRacing Season Tracker — Claude Context

## What This Project Does

A Next.js web dashboard for tracking iRacing motorsport performance. It authenticates with the official iRacing API (OAuth2) server-side and displays race history, iRating progressions, championship points, and analytics charts for any driver by Customer ID.

## Development Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint + Prettier check
npm run format       # Auto-format with Prettier
npm test             # Run Jest tests
npm run test:watch   # Watch mode
npm run test:coverage
```

## Environment Variables

Required in `.env.local` (server-side only, never exposed to browser):

```
IRACING_USERNAME=your-iracing-email
IRACING_PASSWORD=your-iracing-password
```

Optional:
```
IRACING_API_BASE_URL=https://members-ng.iracing.com/data  # default
NEXT_PUBLIC_USE_MOCK_DATA=true  # opt-in mock data for development without credentials
```

**Mock data is OFF by default.** It must be explicitly enabled via `NEXT_PUBLIC_USE_MOCK_DATA=true`. If you see driver stats but no API calls in the Network tab, check this first.

## Architecture

### API Layer (server-side)
- `src/lib/iracing/auth.ts` — OAuth2 Password Limited Grant, token management, auto-refresh
- `src/lib/iracing/client.ts` — iRacing API wrapper with rate limiting (1 req/sec), chunked result fetching
- `src/app/api/**` — Next.js API routes that proxy iRacing API calls

### Data Layer (client-side)
- `src/contexts/DriverDataContext.tsx` — Centralized React Context store; handles data fetching, snake_case→camelCase transformation, iRating enrichment, and batch fetching
- `src/hooks/` — React Query hooks (`useSeasonRaces`, `useIRatingHistory`, `useDriverSummary`, etc.)
- React Query config: 5-min stale time, 10-min GC, 2 retries, no refetch on window focus

### UI Layer
- `src/components/` — Feature components (Dashboard, RaceResultsTable, SeriesDetail, etc.)
- `src/components/charts/` — Recharts-based analytics charts
- `src/components/ui/` — shadcn/ui primitives (do not edit these manually; use `npx shadcn add`)

## Key Conventions

### Data Transformation
- iRacing API returns snake_case; everything in the app uses camelCase
- Positions from the iRacing API are 0-indexed; add 1 for display (`adjustPosition`)
- `seasonId` is present on every race result but is **series-specific** — different series have different season IDs even within the same global iRacing season

### iRacing Season Structure
- All series follow the same fixed season calendar: **12 racing weeks + 1 "week 13"** fun week
- iRacing season numbering does **not** align with calendar quarters — do not try to derive `season_year`/`season_quarter` from the current date
- The `/api/driver/[customerId]/season-races` route automatically resolves the current season by calling `getSeriesSeasons()` and finding the first `active: true` record — no date math needed
- Active season result is cached in-memory for 1 hour in the route handler
- Do **not** filter by `seasonId` across series — each series has its own season ID, so this would drop races from all but one series
- Do **not** use date ranges with `results/search_series` — the iRacing API rejects dates outside the current season window

### Season Races API Flow
1. Client calls `/api/driver/[customerId]/season-races` (no params needed)
2. Server calls `getSeriesSeasons()`, finds `active: true` season, reads `season_year` + `season_quarter`
3. Server calls `searchMemberResults(custId, seasonYear, seasonQuarter)`
4. Results returned as `{ races: [...] }`

### Path Alias
`@/` maps to `src/` — always use this for imports.

### Styling
- Tailwind CSS v4 with CSS variables (defined in `src/app/globals.css`)
- shadcn/ui "new-york" style
- Dark mode via `next-themes`
- Prettier config: single quotes, 2-space indent, 100 char print width, trailing commas (ES5)

## Project Structure

```
src/
├── app/
│   ├── api/                    # Server-side API routes
│   │   ├── car/assets/
│   │   ├── driver/[customerId]/
│   │   │   ├── irating-history/
│   │   │   ├── recent-races/
│   │   │   ├── season-races/   # Resolves active season automatically
│   │   │   └── summary/
│   │   ├── series/[seriesId]/schedule/
│   │   ├── subsession/[subsessionId]/
│   │   └── track/assets/
│   ├── charts/                 # Charts page
│   ├── series/[seriesId]/      # Series detail page
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── charts/                 # Recharts visualization components
│   ├── ui/                     # shadcn/ui primitives (auto-generated)
│   └── *.tsx                   # Feature components
├── contexts/
│   └── DriverDataContext.tsx   # Central data store
├── hooks/                      # React Query data hooks
├── lib/
│   ├── iracing/                # API client, auth, types
│   ├── mock-data.ts            # Dev mock data (opt-in via NEXT_PUBLIC_USE_MOCK_DATA=true)
│   ├── providers.tsx           # React Query + Theme + Context providers
│   └── utils.ts
└── __tests__/                  # Jest + Testing Library tests
```

## iRacing API Notes

- Two-step fetch pattern: endpoint returns a signed S3 URL, then fetch data from that URL
- `results/search_series` returns chunked results — all chunks must be fetched and concatenated
- `results/search_series` uses `season_year` + `season_quarter` params (not date ranges)
- `results/search_series` rejects `start_range_begin` dates outside the current season window
- `/series/seasons` returns all series seasons; filter client-side for `active: true`
- Rate limit: 1 request/second (enforced in `client.ts`)
- Auth errors (401) are handled separately from API errors and trigger token refresh
