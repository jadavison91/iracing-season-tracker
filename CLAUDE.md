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
- `src/hooks/` — React Query hooks (`useSeasonRaces`, `useDriverSummary`, etc.)
- React Query config: 5-min stale time, 10-min GC, 2 retries, no refetch on window focus

### UI Layer
There is a single UI — the "Pitwall" design system. (An earlier v1/v2 split existed during a redesign; v1 was deleted once v2 fully replaced it, so don't go looking for two parallel UIs — `src/components/v2/` is just where the surviving one lives, the folder name is a historical artifact, not a signal that another version exists.)
- `src/components/v2/` — Page-level components: `V2Shell` (nav shell), `SeasonHQ` (`/`), `RaceLog` (`/races`), `RivalsView` (`/rivals`), `SeriesFocus` (`/series/[seriesId]`)
- `src/components/RaceDetailModal.tsx` — Shared race detail modal, opened from multiple pages
- `src/components/charts/` — Recharts-based analytics charts used by `SeriesFocus`
- `src/components/ui/` — shadcn/ui primitives (do not edit these manually; use `npx shadcn add`)
- `src/app/v2.css` — the design system's CSS custom properties, scoped to a `.v2` class applied on `<body>` in `src/app/layout.tsx`
- Dark theme only — fixed palette in `v2.css`, no light-mode variant and no user-facing toggle (`next-themes`/`ThemeProvider` is still wired up in `providers.tsx` but nothing switches it anymore)

## Key Conventions

### Data Transformation
- iRacing API returns snake_case; everything in the app uses camelCase
- Positions from the iRacing API are 0-indexed; add 1 for display (`adjustPosition`)
- `seasonId` is present on every race result but is **series-specific** — different series have different season IDs even within the same global iRacing season

### iRacing Season Structure
- All series follow the same fixed season calendar: **12 racing weeks + 1 "week 13"** fun week
- iRacing season numbering does **not** align with calendar quarters — do not assume a fixed month→quarter mapping (e.g. "Jan–Mar = S1") and use it to derive `season_year`/`season_quarter` from today's date
- A season row's `active` flag means "this series is currently being run at all" — it does **not** mean "this row is the current quarter." A series can stay `active: true` across a season rollover while its previous-quarter row is still present in `getSeriesSeasons()`'s response, so filtering on `active` can silently pin the app to a stale season
- The `/api/driver/[customerId]/season-races` route resolves the current season by checking each season row's own `schedules[].start_date` (each week runs 7 days from its start date) against today's date, and using the row whose week window contains "now" — this is real schedule data, not a guess, so it's safe even though season numbering doesn't align with calendar quarters
- The resolved season is cached in-memory for 1 hour in the route handler
- Do **not** filter by `seasonId` across series — each series has its own season ID, so this would drop races from all but one series
- Do **not** use date ranges with `results/search_series` — the iRacing API rejects dates outside the current season window

### Season Races API Flow
1. Client calls `/api/driver/[customerId]/season-races` (no params needed)
2. Server calls `getSeriesSeasons()`, finds the season row whose `schedules[].start_date` window contains today (see `isSeasonCurrent` in the route), reads `season_year` + `season_quarter` from it
3. Server calls `searchMemberResults(custId, seasonYear, seasonQuarter)`
4. Results returned as `{ races: [...], seasonYear, seasonQuarter }` — callers (`useSeasonRaces`, `DriverDataContext`) stamp `seasonYear`/`seasonQuarter` onto each race so `deriveSeasonLabel` (`src/lib/season-utils.ts`) can use the real value instead of guessing one from the race's date

### Path Alias
`@/` maps to `src/` — always use this for imports.

### Styling
- Tailwind CSS v4 with CSS variables (defined in `src/app/globals.css`) — underlies the shadcn/ui primitives
- `src/app/v2.css` layers the Pitwall design system's own CSS variables (`--v2-*`, `--disc-*`) on top, scoped to `.v2`
- shadcn/ui "new-york" style
- Prettier config: single quotes, 2-space indent, 100 char print width, trailing commas (ES5)

## Project Structure

```
src/
├── app/
│   ├── api/                    # Server-side API routes
│   │   ├── car/assets/
│   │   ├── driver/[customerId]/
│   │   │   ├── season-races/   # Resolves current season automatically (via schedule dates)
│   │   │   └── summary/
│   │   ├── series/[seriesId]/schedule/
│   │   ├── subsession/[subsessionId]/
│   │   └── track/assets/
│   ├── races/                  # Race Log page (RaceLog)
│   ├── rivals/                 # Rivals page (RivalsView)
│   ├── series/[seriesId]/      # Series Focus page (SeriesFocus)
│   ├── layout.tsx              # Fonts, globals.css + v2.css, wraps <body> in .v2
│   ├── page.tsx                # Season HQ (SeasonHQ) — the home page
│   └── v2.css                  # Pitwall design system CSS variables
├── components/
│   ├── v2/                     # Page-level components (V2Shell, SeasonHQ, RaceLog, RivalsView, SeriesFocus)
│   ├── charts/                 # Recharts visualization components (used by SeriesFocus)
│   ├── ui/                     # shadcn/ui primitives (auto-generated)
│   └── RaceDetailModal.tsx     # Shared race detail modal
├── contexts/
│   └── DriverDataContext.tsx   # Central data store
├── hooks/                      # React Query data hooks
├── lib/
│   ├── iracing/                # API client, auth, types
│   ├── mock-data.ts            # Dev mock data (opt-in via NEXT_PUBLIC_USE_MOCK_DATA=true)
│   ├── providers.tsx           # React Query + Theme + Context providers
│   ├── season-utils.ts         # deriveSeasonLabel — human-readable season labels
│   └── utils.ts
└── __tests__/                  # Jest + Testing Library tests
```

There's no `/api/driver/[customerId]/irating-history` or `/recent-races` route — both existed only to back hooks nothing ever called, and were removed along with the hooks themselves.

## iRacing API Notes

- Two-step fetch pattern: endpoint returns a signed S3 URL, then fetch data from that URL
- `results/search_series` returns chunked results — all chunks must be fetched and concatenated
- `results/search_series` uses `season_year` + `season_quarter` params (not date ranges)
- `results/search_series` rejects `start_range_begin` dates outside the current season window
- `/series/seasons` returns every season row for every series (current and historical) in one array — filter client-side by `series_id` and/or by checking each row's `schedules[].start_date` against today's date; the `active` flag does not reliably indicate "this row is the current quarter"
- Rate limit: 1 request/second (enforced in `client.ts`)
- Auth errors (401) are handled separately from API errors and trigger token refresh
