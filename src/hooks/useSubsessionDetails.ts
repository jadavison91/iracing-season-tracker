'use client';

import { useQuery } from '@tanstack/react-query';
import { SessionResultEntry } from '@/lib/iracing/types';

/**
 * Safely convert to number with fallback
 */
function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * Transform iRacing API session result entry to our format
 * Note: iRacing /results/get returns lap times in ten-thousandths of a second,
 * but our formatLapTime expects hundredths, so we divide by 100
 */
function transformSessionResult(raw: Record<string, unknown>): SessionResultEntry {
  // Lap times from /results/get are in ten-thousandths of a second
  // Convert to hundredths by dividing by 100
  const bestLapRaw = toNumber(raw.best_lap_time ?? raw.bestLapTime);
  const avgLapRaw = toNumber(raw.average_lap ?? raw.averageLap);

  return {
    custId: toNumber(raw.cust_id ?? raw.custId),
    displayName: String(raw.display_name ?? raw.displayName ?? 'Unknown Driver'),
    finishPosition: toNumber(raw.finish_position ?? raw.finishPosition),
    finishPositionInClass: toNumber(raw.finish_position_in_class ?? raw.finishPositionInClass),
    startPosition: toNumber(raw.starting_position ?? raw.start_position ?? raw.startPosition),
    carId: toNumber(raw.car_id ?? raw.carId),
    carName: String(raw.car_name ?? raw.carName ?? ''),
    carClassId: toNumber(raw.car_class_id ?? raw.carClassId),
    carClassName: String(raw.car_class_name ?? raw.carClassName ?? ''),
    lapsComplete: toNumber(raw.laps_complete ?? raw.lapsComplete),
    lapsLed: toNumber(raw.laps_led ?? raw.lapsLed),
    incidents: toNumber(raw.incidents),
    champPoints: toNumber(raw.champ_points ?? raw.champPoints),
    clubPoints: toNumber(raw.club_points ?? raw.clubPoints),
    bestLapTime: bestLapRaw > 0 ? Math.round(bestLapRaw / 100) : 0,
    averageLap: avgLapRaw > 0 ? Math.round(avgLapRaw / 100) : 0,
    interval: toNumber(raw.interval),
    newIRating: toNumber(raw.newi_rating ?? raw.new_irating ?? raw.newIRating),
    oldIRating: toNumber(raw.oldi_rating ?? raw.old_irating ?? raw.oldIRating),
    newSafetyRating: toNumber(raw.new_sub_level ?? raw.newSafetyRating),
    oldSafetyRating: toNumber(raw.old_sub_level ?? raw.oldSafetyRating),
    reasonOut: String(raw.reason_out ?? raw.reasonOut ?? ''),
  };
}

export interface SubsessionDetails {
  subsessionId: number;
  seasonId: number;
  seriesId: number;
  seriesName: string;
  trackId: number;
  trackName: string;
  trackConfigName?: string;
  startTime: string;
  strengthOfField: number;
  numDrivers: number;
  results: SessionResultEntry[];
  driverResult?: SessionResultEntry; // The specific driver's result
}

async function fetchSubsessionDetails(
  subsessionId: number,
  customerId?: number
): Promise<SubsessionDetails> {
  const response = await fetch(`/api/subsession/${subsessionId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch subsession details: ${response.status}`);
  }
  const data = await response.json();

  // Log raw response for debugging
  console.log('[useSubsessionDetails] Raw API response keys:', Object.keys(data));

  // The results may be nested in session_results array
  // Each session_results entry represents a different session type (practice, qualify, race)
  // We want the race session (simsession_type_name === 'Race' or similar)
  let raceSession: Record<string, unknown> | null = null;
  const sessionResults = data.session_results ?? data.sessionResults ?? [];

  if (Array.isArray(sessionResults)) {
    // Find the race session
    raceSession = sessionResults.find((session: Record<string, unknown>) => {
      const typeName = String(session.simsession_type_name ?? session.simsessionTypeName ?? '');
      return typeName.toLowerCase().includes('race');
    }) ?? sessionResults[sessionResults.length - 1]; // Fall back to last session
  }

  console.log('[useSubsessionDetails] Found race session:', raceSession ? 'yes' : 'no');

  // Get the results from the race session
  const rawResults = (raceSession?.results ?? []) as Record<string, unknown>[];
  console.log('[useSubsessionDetails] Number of results:', rawResults.length);

  // Log first result to see available fields
  if (rawResults.length > 0) {
    console.log('[useSubsessionDetails] First result keys:', Object.keys(rawResults[0]).sort().join(', '));
    const relevantFields = ['best_lap_time', 'average_lap', 'newi_rating', 'oldi_rating', 'new_sub_level', 'old_sub_level'];
    const foundValues: Record<string, unknown> = {};
    for (const field of relevantFields) {
      if (rawResults[0][field] !== undefined) {
        foundValues[field] = rawResults[0][field];
      }
    }
    console.log('[useSubsessionDetails] Relevant fields found:', foundValues);
  }

  const results = rawResults.map(transformSessionResult);

  // Find the specific driver's result if customerId is provided
  let driverResult: SessionResultEntry | undefined;
  if (customerId) {
    driverResult = results.find(r => r.custId === customerId);
    if (driverResult) {
      console.log('[useSubsessionDetails] Driver result found:', {
        bestLapTime: driverResult.bestLapTime,
        averageLap: driverResult.averageLap,
        newIRating: driverResult.newIRating,
        oldIRating: driverResult.oldIRating,
      });
    }
  }

  return {
    subsessionId: toNumber(data.subsession_id ?? data.subsessionId),
    seasonId: toNumber(data.season_id ?? data.seasonId),
    seriesId: toNumber(data.series_id ?? data.seriesId),
    seriesName: String(data.series_name ?? data.seriesName ?? 'Unknown Series'),
    trackId: toNumber(data.track?.track_id ?? data.trackId),
    trackName: String(data.track?.track_name ?? data.trackName ?? 'Unknown Track'),
    trackConfigName: data.track?.config_name ?? data.trackConfigName,
    startTime: String(data.start_time ?? data.startTime ?? ''),
    strengthOfField: toNumber(data.event_strength_of_field ?? data.strengthOfField),
    numDrivers: results.length,
    results,
    driverResult,
  };
}

export function useSubsessionDetails(
  subsessionId: number | null,
  customerId?: number | null
) {
  return useQuery({
    queryKey: ['subsessionDetails', subsessionId, customerId],
    queryFn: () => fetchSubsessionDetails(subsessionId!, customerId ?? undefined),
    enabled: subsessionId !== null && subsessionId > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - race results don't change
  });
}
