'use client';

import { useQuery } from '@tanstack/react-query';
import { RecentRace } from '@/lib/iracing/types';
import { USE_MOCK_DATA, mockRecentRaces } from '@/lib/mock-data';

/**
 * Safely convert to number with fallback
 */
function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * Transform iRacing API race data (snake_case) to our format (camelCase)
 */
function transformRace(raw: Record<string, unknown>): RecentRace {
  // Handle nested track object if present
  const track = raw.track as Record<string, unknown> | undefined;

  // iRacing API uses 0-indexed positions, so add 1 for display
  // But only if the position is >= 0 (valid position)
  const adjustPosition = (pos: number) => pos >= 0 ? pos + 1 : pos;

  const startPos = toNumber(raw.start_position ?? raw.starting_position ?? raw.startPosition, 0);
  const finishPos = toNumber(raw.finish_position ?? raw.finishPosition, 0);
  const startPosInClass = toNumber(raw.starting_position_in_class ?? raw.startPositionInClass, 0);
  const finishPosInClass = toNumber(raw.finish_position_in_class ?? raw.finishPositionInClass, 0);

  return {
    subsessionId: toNumber(raw.subsession_id ?? raw.subsessionId),
    seasonId: toNumber(raw.season_id ?? raw.seasonId),
    seriesId: toNumber(raw.series_id ?? raw.seriesId),
    seriesName: String(raw.series_name ?? raw.seriesName ?? 'Unknown Series'),
    sessionStartTime: String(raw.session_start_time ?? raw.sessionStartTime ?? raw.start_time ?? ''),
    eventType: toNumber(raw.event_type ?? raw.eventType, 5),
    eventTypeName: String(raw.event_type_name ?? raw.eventTypeName ?? 'Race'),
    trackId: toNumber(raw.track_id ?? raw.trackId ?? track?.track_id),
    trackName: String(raw.track_name ?? raw.trackName ?? track?.track_name ?? 'Unknown Track'),
    trackCategoryId: toNumber(raw.track_category_id ?? raw.license_category_id ?? raw.category_id ?? track?.category_id, 0),
    raceWeekNum: toNumber(raw.race_week_num ?? raw.raceWeekNum, 0),
    startPosition: adjustPosition(startPos),
    finishPosition: adjustPosition(finishPos),
    startPositionInClass: adjustPosition(startPosInClass),
    finishPositionInClass: adjustPosition(finishPosInClass),
    carClassId: toNumber(raw.car_class_id ?? raw.carClassId),
    carClassName: String(raw.car_class_name ?? raw.carClassName ?? ''),
    carClassShortName: String(raw.car_class_short_name ?? raw.carClassShortName ?? ''),
    carId: toNumber(raw.car_id ?? raw.carId),
    carName: String(raw.car_name ?? raw.carName ?? ''),
    champPoints: toNumber(raw.champ_points ?? raw.champPoints),
    clubPoints: toNumber(raw.club_points ?? raw.clubPoints),
    incidents: toNumber(raw.incidents),
    lapsComplete: toNumber(raw.laps_complete ?? raw.lapsComplete),
    lapsLed: toNumber(raw.laps_led ?? raw.lapsLed),
    averageLap: toNumber(raw.average_lap ?? raw.averageLap),
    bestLapTime: toNumber(raw.best_lap_time ?? raw.bestLapTime),
    bestNlapsTime: toNumber(raw.best_nlaps_time ?? raw.bestNlapsTime),
    newIRating: toNumber(raw.newi_rating ?? raw.new_irating ?? raw.newIRating),
    oldIRating: toNumber(raw.oldi_rating ?? raw.old_irating ?? raw.oldIRating),
    newSafetyRating: toNumber(raw.new_sub_level ?? raw.newSafetyRating),
    oldSafetyRating: toNumber(raw.old_sub_level ?? raw.oldSafetyRating),
    strengthOfField: toNumber(raw.strength_of_field ?? raw.event_strength_of_field ?? raw.strengthOfField),
    numDrivers: toNumber(raw.num_drivers ?? raw.numDrivers),
    winnerName: raw.winner_name ?? raw.winnerName ? String(raw.winner_name ?? raw.winnerName) : undefined,
    winnerCustId: raw.winner_cust_id ?? raw.winnerCustId ? toNumber(raw.winner_cust_id ?? raw.winnerCustId) : undefined,
  };
}

/**
 * Fetch a window wide enough to always overlap with the previous season,
 * so we have raceWeekNum data from both seasons to detect the boundary.
 * 20 weeks covers a full 13-week season plus 7 weeks of buffer.
 */
function getSeasonDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 140); // 20 weeks
  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
  };
}

/**
 * Filter races to only those in the current iRacing season using raceWeekNum.
 *
 * Races are sorted newest-first. Going backwards in time, week numbers should
 * decrease (or stay the same) within a season. When a race's week number jumps
 * significantly higher than the lowest week seen so far, that's the previous
 * season bleeding in — stop there.
 *
 * Threshold of 4: handles users who skip weeks within a season (e.g. week 8
 * followed by week 3 is fine) but catches season rollovers (e.g. week 1 current
 * season followed by week 11 of the previous season).
 */
function filterToCurrentSeason(races: RecentRace[]): RecentRace[] {
  if (races.length === 0) return races;

  let minWeekSeen = races[0].raceWeekNum;

  for (let i = 1; i < races.length; i++) {
    const weekNum = races[i].raceWeekNum;
    if (weekNum > minWeekSeen + 4) {
      console.log(
        `[useSeasonRaces] Season boundary detected at index ${i}: week ${weekNum} after min week ${minWeekSeen}`
      );
      return races.slice(0, i);
    }
    minWeekSeen = Math.min(minWeekSeen, weekNum);
  }

  return races;
}

async function fetchSeasonRaces(customerId: number): Promise<RecentRace[]> {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 700));
    return mockRecentRaces;
  }

  const { startDate, endDate } = getSeasonDateRange();

  console.log('[useSeasonRaces] Fetching races', { startDate, endDate });

  const response = await fetch(
    `/api/driver/${customerId}/season-races?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch season races: ${response.status}`);
  }

  const data = await response.json();

  // The response structure is { races: [...] }
  let racesArray: Record<string, unknown>[] = [];

  if (data.races && Array.isArray(data.races)) {
    racesArray = data.races;
  } else if (data.results && Array.isArray(data.results)) {
    racesArray = data.results;
  } else if (Array.isArray(data)) {
    racesArray = data;
  }

  console.log('[useSeasonRaces] Raw races from API:', racesArray.length);

  // Transform the races from snake_case to camelCase
  const races = racesArray.map((raw: Record<string, unknown>) => transformRace(raw));

  // Sort by session start time (newest first)
  races.sort((a, b) => new Date(b.sessionStartTime).getTime() - new Date(a.sessionStartTime).getTime());

  // Log each race so we can see what week/date we're working with
  console.log('[useSeasonRaces] All races (newest first):');
  races.forEach((r, i) =>
    console.log(`  [${i}] ${r.sessionStartTime.slice(0, 10)} week=${r.raceWeekNum} seasonId=${r.seasonId} series="${r.seriesName}"`)
  );

  // Filter to current season using week number to detect the season boundary
  const currentSeasonRaces = filterToCurrentSeason(races);
  console.log('[useSeasonRaces] After season filter:', currentSeasonRaces.length, 'of', races.length);

  return currentSeasonRaces;
}

export function useSeasonRaces(customerId: number | null) {
  return useQuery({
    queryKey: ['seasonRaces', customerId],
    queryFn: () => fetchSeasonRaces(customerId!),
    enabled: customerId !== null && customerId > 0,
  });
}
