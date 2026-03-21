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
 * Calculate the current iRacing season year and quarter from today's date.
 *
 * iRacing season approximate start dates:
 *   S1: ~Jan 14  |  S2: ~Apr 8  |  S3: ~Jul 2  |  S4: ~Sep 23
 */
function getCurrentIRacingSeason(): { seasonYear: number; seasonQuarter: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  if (month > 9 || (month === 9 && day >= 23)) return { seasonYear: year, seasonQuarter: 4 };
  if (month > 7 || (month === 7 && day >= 2))  return { seasonYear: year, seasonQuarter: 3 };
  if (month > 4 || (month === 4 && day >= 8))  return { seasonYear: year, seasonQuarter: 2 };
  if (month > 1 || (month === 1 && day >= 14)) return { seasonYear: year, seasonQuarter: 1 };
  return { seasonYear: year - 1, seasonQuarter: 4 };
}


async function fetchSeasonRaces(customerId: number): Promise<RecentRace[]> {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 700));
    return mockRecentRaces;
  }

  const { seasonYear, seasonQuarter } = getCurrentIRacingSeason();

  console.log(`[useSeasonRaces] Fetching season_year=${seasonYear} season_quarter=${seasonQuarter}`);

  const response = await fetch(
    `/api/driver/${customerId}/season-races?season_year=${seasonYear}&season_quarter=${seasonQuarter}`
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

  console.log('[useSeasonRaces] Loaded', races.length, 'races');

  return races;
}

export function useSeasonRaces(customerId: number | null) {
  return useQuery({
    queryKey: ['seasonRaces', customerId],
    queryFn: () => fetchSeasonRaces(customerId!),
    enabled: customerId !== null && customerId > 0,
  });
}
