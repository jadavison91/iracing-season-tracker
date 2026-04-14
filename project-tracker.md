# iRacing Season Tracker — Project Tracker

## Project Overview

Two parallel implementations of an iRacing performance dashboard:

1. **`iracing-tracker.html`** — Standalone SPA (~13,800 lines). Runs locally in a browser with no server. Uses `localStorage` for persistence, originally ingested data via JSON file upload, now updated to fetch live from the Next.js API.
2. **`iracing-season-tracker/`** — Next.js 15 App Router site. Fetches live from the iRacing API server-side, renders charts and dashboard using React Query + Recharts + shadcn/ui.

The goal is to eventually retire the HTML file by migrating all its functionality into the Next.js site.

---

## Next.js App — Current State

### Pages

| Route          | Status | Description                                                                 |
| -------------- | ------ | --------------------------------------------------------------------------- |
| `/`            | Done   | Driver hero (name, club, license cards per discipline) + Active Series grid |
| `/charts`      | Done   | Performance analytics — iRating, championship, incident/finish trends       |
| `/series/[id]` | Done   | Series detail — schedule, race results, series stats                        |

### API Routes

| Endpoint                               | Description                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /api/driver/[id]/summary`         | Driver profile, licenses, iRating per discipline                                |
| `GET /api/driver/[id]/season-races`    | All races in the last 12 weeks (chunked S3 response from iRacing)               |
| `GET /api/driver/[id]/irating-history` | Historical iRating for charting                                                 |
| `GET /api/driver/[id]/recent-races`    | Most recent races                                                               |
| `GET /api/subsession/[id]`             | Full subsession data including all driver results (used for iRating enrichment) |
| `GET /api/series`                      | All active series                                                               |
| `GET /api/series/[id]/schedule`        | Race schedule for a series                                                      |
| `GET /api/track/assets`                | Track images                                                                    |
| `GET /api/car/assets`                  | Car images                                                                      |

### Key Architecture

- **`src/lib/iracing/auth.ts`** — OAuth2 Password Limited grant. Credentials encoded as `Base64(SHA256(value + lowercase(key)))`. In-memory token singleton with auto-refresh.
- **`src/lib/iracing/client.ts`** — All API calls are two-step: iRacing returns a signed S3 URL, then data is fetched from S3. Module-level rate limiter enforces 1 req/sec.
- **`src/contexts/DriverDataContext.tsx`** — Centralized race data store. Fetches season races, then enriches with per-subsession iRating data in batches of 5. Shared across `/charts` and `/series/[id]`.
- **`src/components/ChartsView.tsx`** — 3 sections: iRating Progression (IRatingByDiscipline + VirtualIRating), Championship (ChampionshipPoints + Achievements), Performance Trends (IncidentTrend + FinishTrend + SoFDistribution).
- **`src/components/Dashboard.tsx`** — Driver hero card + Active Series grid using `useDriverSummary` + `useActiveSeries` hooks.

### Charts Implemented

| Chart                  | Component                 | Description                                                         |
| ---------------------- | ------------------------- | ------------------------------------------------------------------- |
| iRating by Discipline  | `IRatingByCategoryChart`  | Line chart, one line per discipline (oval/road/dirt oval/dirt road) |
| Virtual Series iRating | `VirtualIRatingChart`     | Per-series iRating projection starting from first race baseline     |
| Championship Points    | `ChampionshipPointsChart` | Points by series, best-8-weeks scoring                              |
| Achievement Stats      | `AchievementsTable`       | Wins, podiums, poles, laps led by series                            |
| Incident Trend         | `IncidentTrendChart`      | Incidents per race over time                                        |
| Finish Position Trend  | `FinishTrendChart`        | Finish positions with 5-race rolling average                        |
| SoF Distribution       | `SoFDistributionChart`    | Histogram of race SoF brackets + avg finish per bracket             |

---

## HTML File — Current State (`iracing-tracker.html`)

### Tabs

| Tab           | Sub-sections                                                                                                                  | Status                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Stats**     | iRating Progression, Best Laps, Season Comparison, Track Performance, Race Analysis, Incident Analysis, Season Learning Curve | Done                                                        |
| **Races**     | Filterable race list with summary bar                                                                                         | Done — API fetch replaces JSON upload                       |
| **Opponents** | Most Frequent, Nemesis, Cross-Racers                                                                                          | Done — API-populated, self excluded, ±500 iR Nemesis filter |

### Data Ingestion (Replaced JSON Upload)

The original Races tab required manually exporting JSON from iRacing and uploading it. This was replaced with a live API fetch flow:

**Flow:**

1. User enters Customer ID, days back, and API base URL (Next.js server URL) in a modal
2. `fetchRacesFromAPI()` calls `/api/driver/{id}/season-races` to get race list
3. For each race, calls `/api/subsession/{id}` in batches of 3 to get:
   - `oldi_rating` / `newi_rating` (not in the search endpoint)
   - `old_sub_level` / `new_sub_level` (safety rating)
   - Full driver grid (all `cust_id`s for opponent tracking)
   - Wet race detection (`weather.track_water > 0` or `precip_mm_final_session > 0`)
4. Results merged into `localStorage` (`iracing-v3-races`, `iracing-v3-opponents`)
5. Summary modal shows added / updated / skipped counts

**localStorage keys:**

| Key                     | Contents                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| `iracing-v3-races`      | Array of normalized race objects                                 |
| `iracing-v3-opponents`  | Object keyed by `iracingId`, with encounter history              |
| `iracing-v3-my-cust-id` | Current user's customer ID (used to exclude self from Opponents) |
| `iracing-v3-api-base`   | API server base URL                                              |
| `iracing-v3-api-days`   | Days lookback window                                             |

---

## Bugs Fixed

### iRating Always Showing 0

- **Root cause:** `results/search_series` (the chunked search endpoint) does not include `oldi_rating`/`newi_rating`. These fields only exist in `results/get` (per-subsession endpoint).
- **Fix:** Added Step 2 in `fetchRacesFromAPI()` — fetches each subsession and extracts iRating from the driver's row in the Race session results.
- **Same issue in Next.js:** `DriverDataContext.tsx` has the same enrichment pattern (`fetchSubsessionIRating`) in batches of 5.

### Opponents Tab Empty After API Fetch

- **Root cause:** The `season-races` endpoint only returns the requesting driver's single row, not the full race grid. `mergeOpponentsFromJSON` had nothing to work with.
- **Fix:** Step 2 subsession fetch captures `allDriverRows` (every driver in the race session) and passes them to `mergeOpponentsFromJSON`.

### Wet Race Filter Not Working

- **Root cause:** `transformApiRace()` hardcoded `wetRace: false`, discarding the `wetRace` field set during subsession enrichment.
- **Fix:** Changed to `wetRace: raw.wetRace != null ? !!raw.wetRace : false`. Wet detection reads `weather.track_water > 0 || weather.precip_mm_final_session > 0` from the subsession.

### Self Appearing in Most Frequent Opponents

- **Root cause:** `mergeOpponentsFromJSON` checks `iracing-v3-my-cust-id` at call time. If the user hadn't set their cust ID in localStorage yet, self was added as an opponent.
- **Fix:** Defensive filter at top of `renderOpponents()`: excludes any opponent whose `iracingId` matches `myCustId`.

### CORS Blocking Requests from `file://` Origin

- **Root cause:** The HTML file opens as `file://`, which sends `null` as the `Origin` header. The Next.js API rejected it.
- **Fix:** Added `Access-Control-Allow-Origin: *` to all `/api/:path*` routes in `next.config.ts`. The wildcard covers `null` origin for non-credentialed GET requests per the CORS spec.

### Position Display Off-by-One

- **Root cause:** iRacing API returns 0-indexed positions. HTML was displaying them raw.
- **Fix:** `transformRace()` in `DriverDataContext.tsx` applies `adjustPosition()` (+1 for all positions ≥ 0). HTML's `transformApiRace()` does the same.

---

## Integration Plan — HTML → Next.js

The goal is to migrate all HTML functionality into the Next.js site and retire the HTML file. Race data stays API-driven (no localStorage for races). Only opponent encounter history uses localStorage via a new `OpponentsContext`.

### Navigation After Integration

| Route          | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `/`            | Dashboard (unchanged)                                           |
| `/races`       | New — global race list (HTML Races tab)                         |
| `/charts`      | Expanded — add 7 stat sections from HTML Stats tab              |
| `/opponents`   | New — HTML Opponents tab (Nemesis, Most Frequent, Cross-Racers) |
| `/series/[id]` | Unchanged                                                       |

---

### Phase 1 — Races + Opponents Pages

**Status: Complete**

#### 1a. `/races` page ✓

- Sortable table with discipline filter tabs, search, and pagination (25/page)
- Summary bar: wins, podiums, avg incidents, total iR gained
- Data from `DriverDataContext.races`

#### 1b. `src/lib/opponents.ts` + `useOpponents` hook ✓

- localStorage-backed encounter store, per-driver key `iracing-v3-ng-opponents-{custId}`
- `mergeDriverGrid()` called automatically from `DriverDataContext` during subsession enrichment
- `useOpponents()` hook re-reads after each race fetch or driver switch via `customerId` + `lastFetched` dependencies

#### 1c. `/opponents` page ✓

- Summary stats: total opponents, cross-racers, highest iR, most frequent
- Three panels: Highest iR, Most Frequent, Nemesis (±500 iR filter, min 3 shared races, >50% ahead)
- Cross-racers callout (formula + road)
- Full paginated list with search, category filter, sort, discipline badges, recency indicator

---

### Phase 2 — Data Store + Opponent Tags + Expanded Charts

**Status: Complete**

#### 2a. localStorage Race Cache ✓

- `src/lib/race-cache.ts` — per-driver key `iracing-v3-ng-races`, 2-hour TTL
- `DriverDataContext` reads cache on load; writes after API fetch
- Fetches last 24 weeks (2 seasons) via two consecutive 12-week requests (iRacing API limit ~90 days)
- Toast notification on cold fetch: "Fetching race data… 30–60 seconds on first load"
- Refresh button in Header + "Xm ago" / stale indicator

#### 2b. Opponent Tags + Rivals view ✓

- Per-driver storage key `iracing-v3-ng-opponents-{custId}` — switching drivers shows the correct list
- Rivals tab (default): manually tagged `rival` opponents as cards with win rate bar
- All Opponents tab: Highest iR + Most Frequent panels, searchable table with inline tag picker
- Tags: `rival`, `friendly`, `blocker` — stored in `tags[0]`, written back immediately

#### 2d. Season Schedule — Prior-Season Results Bug ✓

**Fix:** `src/hooks/useSeriesSchedule.ts` — added `r.seasonId === scheduleData.seasonId` to the week-race filter.

#### 2e. Expanded Charts ✓

New sections added to `/charts`:

| Section       | Component               | Notes                                               |
| ------------- | ----------------------- | --------------------------------------------------- |
| Race Analysis | `PositionsGainedChart`  | Bar chart, green/red per race, avg reference line   |
| Track Stats   | `TrackPerformanceTable` | Sortable by any column, discipline filter tabs      |
| Best Laps     | `BestLapTimesTable`     | Fastest lap per track, mono font, discipline filter |

Discipline labels derived via `deriveDiscipline()` (mirrors `getDiscipline` logic with series-name fallback for `trackCategoryId === 0`).

---

### Phase 3a — Missing HTML Features

**Status: Complete**

#### 3a-1. Season filter on `/races` ✓

#### 3a-2. Season Comparison table ✓ (grouped by calendar quarter, not seasonId)

#### 3a-3. iRating Projection with milestones ✓

#### 3a-4. Zeitanalyse — time-of-day / day-of-week analysis ✓

#### 3a-5. Street vs Permanent circuit breakdown — dropped (not needed)

#### 3a-6. Learning Curve — per-track improvement ✓ (grouped by track config + car, expandable visits with lap count)

#### 3a-7. Incident histogram — dropped (covered by existing Incident Trend chart)

---

### Phase 3b — Polish + Retire HTML

**Status: In progress**

- [x] Add configurable lookback window to settings UI (gear icon in header: 12/24/36 weeks, persisted in localStorage, triggers force refresh on change)
- [ ] Confirm all HTML features are covered by the Next.js site
- [ ] Delete `iracing-tracker.html`

---

### Phase 4 — V2 Redesign ("Pitwall")

**Status: Complete**

Full redesign of the UI under `/v2/*`. All existing routes and API endpoints remain untouched. `/` now redirects to `/v2`. Design spec: `v2-design.md`.

**Aesthetic**: Dark-first, electric lime (`#C5F131`) accent on near-black (`#09090E`). Fonts: Syne (display) + JetBrains Mono (data values). Left rail navigation on desktop, bottom tab bar on mobile.

**Core principle**: Charts and race data woven organically into the season narrative — no separate Charts page.

#### Pages

| Route                   | Name         | Status | Description                                                                                 |
| ----------------------- | ------------ | ------ | ------------------------------------------------------------------------------------------- |
| `/v2`                   | Season HQ    | ✓      | Driver hero + iRating chart + series rows with sparklines, Now/Next badge, week progress    |
| `/v2/races`             | Race Log     | ✓      | Month-grouped timeline, discipline filter pills on mobile / sidebar on desktop, race modals |
| `/v2/series/[seriesId]` | Series Focus | ✓      | Championship hero, 12-week schedule (all statuses), embedded analysis charts                |
| `/v2/rivals`            | Rivals       | ✓      | Tagged rivals grid, all-opponents table, click-to-expand series breakdown, tag picker       |

#### Key implementation notes

- `V2Shell` — left rail (≥1024px) with driver switcher, settings, refresh; bottom tab bar (<1024px)
- `SeasonHQ` series rows call `useSeriesSchedule` per series to show active/upcoming track inline
- `SeriesFocus` embeds 6 analysis charts (track performance, best laps, learning curve, positions gained, SoF, incident trend) from `/charts`, filtered to the series
- Rivals dropdown cross-references fresh `races` array to backfill `seriesName`/`carName` for old localStorage encounters that predate the schema addition
- Mobile: `v2-hide-mobile` CSS utility hides non-essential columns (iR delta, incidents on week rows; last seen + tag on opponents table) at ≤640px
- `Encounter` type extended with `seriesName` and `carName`; `mergeDriverGrid` updated accordingly

#### Remaining / polish

- [ ] Loading skeletons for Series Focus hero/stats while schedule loads
- [ ] Empty state for Series Focus when no races have been run yet
- [ ] `/v2/test` preview page can be removed once series row design is confirmed
- [ ] Confirm all v1 features are covered, then retire v1 routes and HTML file

---

## Known Limitations / Gotchas

- **iRating enrichment is slow on first load.** Each race requires a separate subsession API call. With 30+ races, this takes 30+ seconds on first fetch (rate limiter: 1 req/sec). The 2-hour localStorage cache (`iracing-v3-ng-races`) eliminates repeat fetches. Progress display would still help for cold loads.
- **`results/search_series` never includes iRating.** Always need the subsession endpoint for authoritative iRating, SR, lap times, and wet race data.
- **`track_category_id` mapping:** 1=Oval, 2=Road (sports car or formula — must check series name), 3=Dirt Oval, 4=Dirt Road.
- **Positions are 0-indexed in the API.** Always add 1 before displaying. `DriverDataContext.transformRace()` handles this for the Next.js app.
- **`null` Origin from `file://`.** The `Access-Control-Allow-Origin: *` in `next.config.ts` is required for the HTML file to call the Next.js API. This is intentional and safe for GET-only non-credentialed requests.
- **Opponent data is per-subsession only.** The `season-races` endpoint returns one row per race (the requesting driver). Full grids require the subsession endpoint.
