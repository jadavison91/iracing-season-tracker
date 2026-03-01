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
 * Get the current season date range - simply look back 12 weeks from today.
 * This reliably captures the full current season regardless of exact season boundaries.
 */
function getSeasonDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const SEASON_LENGTH_DAYS = 84; // 12 weeks

  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - SEASON_LENGTH_DAYS);

  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
  };
}

async function fetchSeasonRaces(customerId: number): Promise<RecentRace[]> {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 700));
    return mockRecentRaces;
  }

  const { startDate, endDate } = getSeasonDateRange();

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

  // Log for debugging
  console.log('[useSeasonRaces] Loaded', racesArray.length, 'races');

  // Log all available fields from first race to help identify missing data
  if (racesArray.length > 0) {
    const firstRace = racesArray[0] as Record<string, unknown>;
    console.log('[useSeasonRaces] Available fields:', Object.keys(firstRace).sort().join(', '));
    // Log fields that might contain lap/rating data
    const relevantFields = ['average_lap', 'best_lap_time', 'best_lap_num', 'best_qual_lap_time',
      'newi_rating', 'oldi_rating', 'new_irating', 'old_irating', 'new_sub_level', 'old_sub_level',
      'event_average_lap', 'event_best_lap_time'];
    const foundFields: Record<string, unknown> = {};
    for (const field of relevantFields) {
      if (firstRace[field] !== undefined) {
        foundFields[field] = firstRace[field];
      }
    }
    console.log('[useSeasonRaces] Lap/rating fields found:', foundFields);
  }

  // Transform the races from snake_case to camelCase
  const races = racesArray.map((raw: Record<string, unknown>) => transformRace(raw));

  // Sort by session start time (newest first)
  races.sort((a, b) => new Date(b.sessionStartTime).getTime() - new Date(a.sessionStartTime).getTime());

  return races;
}

export function useSeasonRaces(customerId: number | null) {
  return useQuery({
    queryKey: ['seasonRaces', customerId],
    queryFn: () => fetchSeasonRaces(customerId!),
    enabled: customerId !== null && customerId > 0,
  });
}
