/**
 * Derives a human-readable iRacing season label (e.g. "S4 2026") for a race.
 *
 * Prefers the real `seasonYear`/`seasonQuarter` the server resolved for the
 * fetch that returned this race (see season-races/route.ts, which derives it
 * from each season's actual week schedule, not the calendar). Those fields
 * are only present on races fetched after this was added — for older races
 * already sitting in the local race cache, fall back to guessing from the
 * calendar quarter of the race's own date:
 *   S1 = Jan–Mar, S2 = Apr–Jun, S3 = Jul–Sep, S4 = Oct–Dec
 * That guess can be off by one quarter, since iRacing season numbering does
 * not actually align with calendar quarters — it's only a fallback for data
 * that predates real season metadata, not the source of truth.
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
