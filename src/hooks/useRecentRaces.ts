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

async function fetchRecentRaces(customerId: number): Promise<{ races: RecentRace[] }> {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { races: mockRecentRaces };
  }

  const response = await fetch(`/api/driver/${customerId}/recent-races`);
  if (!response.ok) {
    throw new Error(`Failed to fetch recent races: ${response.status}`);
  }
  const data = await response.json();

  // Log raw response for debugging
  console.log('[useRecentRaces] Raw API response:', data);

  // Transform the races from snake_case to camelCase
  const races = (data.races || []).map((raw: Record<string, unknown>) => transformRace(raw));

  return { races };
}

export function useRecentRaces(customerId: number | null) {
  return useQuery({
    queryKey: ['recentRaces', customerId],
    queryFn: () => fetchRecentRaces(customerId!),
    enabled: customerId !== null && customerId > 0,
    select: (data) => data.races,
  });
}
