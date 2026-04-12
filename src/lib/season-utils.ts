/**
 * Derives a human-readable iRacing season label (e.g. "S2 2025") from the
 * earliest race date in that season. iRacing seasons run roughly quarterly:
 *   S1 = Jan–Mar, S2 = Apr–Jun, S3 = Jul–Sep, S4 = Oct–Dec
 */
export function deriveSeasonLabel(
  seasonId: number,
  races: { seasonId: number; sessionStartTime: string }[]
): string {
  const seasonRaces = races.filter((r) => r.seasonId === seasonId);
  if (seasonRaces.length === 0) return `Season ${seasonId}`;
  const dates = seasonRaces.map((r) => new Date(r.sessionStartTime));
  const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const month = earliest.getMonth(); // 0-indexed
  const year = earliest.getFullYear();
  let season: number;
  if (month < 3) season = 1;
  else if (month < 6) season = 2;
  else if (month < 9) season = 3;
  else season = 4;
  return `S${season} ${year}`;
}
