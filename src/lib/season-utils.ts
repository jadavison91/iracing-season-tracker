/**
 * Derives a human-readable iRacing season label (e.g. "S4 2026") for a race.
 *
 * Prefers the real `seasonYear`/`seasonQuarter` the server resolved for the
 * fetch that returned this race (see season-races/route.ts, which derives it
 * from each season's actual week schedule, not the calendar). Those fields
 * are only present on races fetched after this was added — for older races
 * already sitting in the local race cache with no real tag AND no tagged
 * sibling to borrow one from (see deriveSeasonLabels below, which is what
 * every UI should actually call), fall back to guessing from the calendar
 * quarter of the race's own date:
 *   S1 = Jan–Mar, S2 = Apr–Jun, S3 = Jul–Sep, S4 = Oct–Dec
 * That guess can be off by one quarter, since iRacing season numbering does
 * not actually align with calendar quarters — it's only a last-resort
 * fallback, not the source of truth.
 */
export function deriveSeasonLabel(race: {
  seasonId: number;
  sessionStartTime: string;
  seasonYear?: number;
  seasonQuarter?: number;
}): string {
  if (race.seasonYear != null && race.seasonQuarter != null) {
    return `S${race.seasonQuarter} ${race.seasonYear}`;
  }

  const date = new Date(race.sessionStartTime);
  if (isNaN(date.getTime())) return `Season ${race.seasonId}`;

  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();
  let season: number;
  if (month < 3) season = 1;
  else if (month < 6) season = 2;
  else if (month < 9) season = 3;
  else season = 4;
  return `S${season} ${year}`;
}

/**
 * Labels a whole list of races at once, keyed by subsessionId.
 *
 * A single race's own seasonYear/seasonQuarter tag is only set on the batch
 * a given /season-races fetch returned — races merged into the local cache
 * earlier (see DriverDataContext's incremental merge) never get re-tagged,
 * so calling deriveSeasonLabel() per-race in isolation leaves old untagged
 * races to fall back to the calendar guess even when they're actually part
 * of the very same season as other, tagged races run this week. That's what
 * split one week's races across two different "season" groups/filter
 * options in the Race Log.
 *
 * seasonId is a reliable join key here (it's been on every race from the
 * start and uniquely identifies one series' one season instance), so before
 * falling back to the calendar guess, borrow the real tag from any other
 * race that shares the same seriesId+seasonId. Only a race whose entire
 * seriesId+seasonId group has never been tagged at all still needs the
 * calendar guess.
 */
export function deriveSeasonLabels(
  races: {
    subsessionId: number;
    seriesId: number;
    seasonId: number;
    sessionStartTime: string;
    seasonYear?: number;
    seasonQuarter?: number;
  }[]
): Map<number, string> {
  const tagBySeriesSeason = new Map<string, { seasonYear: number; seasonQuarter: number }>();
  races.forEach((r) => {
    if (r.seasonYear != null && r.seasonQuarter != null) {
      tagBySeriesSeason.set(`${r.seriesId}:${r.seasonId}`, {
        seasonYear: r.seasonYear,
        seasonQuarter: r.seasonQuarter,
      });
    }
  });

  const labels = new Map<number, string>();
  races.forEach((r) => {
    const borrowed = tagBySeriesSeason.get(`${r.seriesId}:${r.seasonId}`);
    labels.set(
      r.subsessionId,
      borrowed ? `S${borrowed.seasonQuarter} ${borrowed.seasonYear}` : deriveSeasonLabel(r)
    );
  });
  return labels;
}
