# Handoff

## State

V2 Pitwall redesign is complete and live. All 4 pages ship: Season HQ (`/v2`), Race Log (`/v2/races`), Series Focus (`/v2/series/[seriesId]`), Rivals (`/v2/rivals`). `/` redirects to `/v2`. Mobile layout done (bottom tab bar in shell, `v2-hide-mobile` CSS utility for narrow columns). Committed and pushed on `main` at `7c3b59b`.

## Next

1. Remove `/v2/test` preview page (`src/app/v2/test/`, `src/components/v2/SeriesRowPreview.tsx`) once design is confirmed — it's harmless but adds noise
2. Loading skeletons for Series Focus hero/stats while `useSeriesSchedule` loads
3. Confirm all v1 features covered, then retire v1 routes (`/`, `/races`, `/charts`, `/opponents`) and delete `iracing-tracker.html`

## Context

- `Encounter` type now has `seriesName`/`carName`; old localStorage records backfill via `raceInfoMap` keyed by `subsessionId`
- Series Focus analysis charts use the same utility functions as `/charts` (`getTrackPerformance` etc. from `src/lib/mock-data.ts`), filtered to `data.races`
- `useSeriesSchedule` filters by `r.seasonId === scheduleData.seasonId` to avoid prior-season bleed
