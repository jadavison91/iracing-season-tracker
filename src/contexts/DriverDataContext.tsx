'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { RecentRace } from '@/lib/iracing/types';
import { USE_MOCK_DATA, mockAllRaces } from '@/lib/mock-data';
import { mergeDriverGrid, ApiDriverRow } from '@/lib/opponents';
import {
  getFullCacheEntry,
  setCachedRaces,
  clearRaceCache,
  getCacheFetchedAt,
} from '@/lib/race-cache';

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
  const adjustPosition = (pos: number) => (pos >= 0 ? pos + 1 : pos);

  const startPos = toNumber(raw.start_position ?? raw.starting_position ?? raw.startPosition, 0);
  const finishPos = toNumber(raw.finish_position ?? raw.finishPosition, 0);
  const startPosInClass = toNumber(raw.starting_position_in_class ?? raw.startPositionInClass, 0);
  const finishPosInClass = toNumber(raw.finish_position_in_class ?? raw.finishPositionInClass, 0);

  return {
    subsessionId: toNumber(raw.subsession_id ?? raw.subsessionId),
    seasonId: toNumber(raw.season_id ?? raw.seasonId),
    seriesId: toNumber(raw.series_id ?? raw.seriesId),
    seriesName: String(raw.series_name ?? raw.seriesName ?? 'Unknown Series'),
    sessionStartTime: String(
      raw.session_start_time ?? raw.sessionStartTime ?? raw.start_time ?? ''
    ),
    eventType: toNumber(raw.event_type ?? raw.eventType, 5),
    eventTypeName: String(raw.event_type_name ?? raw.eventTypeName ?? 'Race'),
    trackId: toNumber(raw.track_id ?? raw.trackId ?? track?.track_id),
    trackName: String(raw.track_name ?? raw.trackName ?? track?.track_name ?? 'Unknown Track'),
    trackCategoryId: toNumber(
      raw.track_category_id ?? raw.license_category_id ?? raw.category_id ?? track?.category_id,
      0
    ),
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
    strengthOfField: toNumber(
      raw.strength_of_field ?? raw.event_strength_of_field ?? raw.strengthOfField
    ),
    numDrivers: toNumber(raw.num_drivers ?? raw.numDrivers),
    winnerName:
      (raw.winner_name ?? raw.winnerName) ? String(raw.winner_name ?? raw.winnerName) : undefined,
    winnerCustId:
      (raw.winner_cust_id ?? raw.winnerCustId)
        ? toNumber(raw.winner_cust_id ?? raw.winnerCustId)
        : undefined,
  };
}

interface DriverData {
  customerId: number | null;
  races: RecentRace[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface DriverDataContextType {
  data: DriverData;
  setCustomerId: (id: number | null) => void;
  refreshData: () => Promise<void>;
  /** Bust the cache and re-fetch from the API */
  forceRefresh: () => Promise<void>;
}

const initialState: DriverData = {
  customerId: null,
  races: [],
  isLoading: false,
  error: null,
  lastFetched: null,
};

const DriverDataContext = createContext<DriverDataContextType | null>(null);

/**
 * Derive the discipline string from a race (used for opponent categorisation and filtering).
 */
export function getDiscipline(
  race: Pick<RecentRace, 'trackCategoryId' | 'seriesName'>
): 'formula' | 'road' | 'oval' | 'dirt_oval' | 'dirt_road' {
  const catId = race.trackCategoryId;
  const name = (race.seriesName ?? '').toLowerCase();
  if (catId === 1) return 'oval';
  if (catId === 3) return 'dirt_oval';
  if (catId === 4) return 'dirt_road';
  if (catId === 2) {
    if (
      name.includes('formula') ||
      name.includes(' f1') ||
      name.includes(' f2') ||
      name.includes(' f3') ||
      name.includes('ir-04') ||
      name.includes('usf') ||
      name.includes('indy')
    )
      return 'formula';
    return 'road';
  }
  return 'road';
}

interface SubsessionData {
  oldIRating: number;
  newIRating: number;
  bestLapTime: number; // hundredths of seconds
  averageLap: number; // hundredths of seconds
  driverGrid: ApiDriverRow[];
}

/**
 * Fetch subsession details to get iRating, lap times, and the full driver grid for opponent tracking.
 */
async function fetchSubsessionData(
  subsessionId: number,
  customerId: number
): Promise<SubsessionData | null> {
  try {
    const response = await fetch(`/api/subsession/${subsessionId}`);
    if (!response.ok) return null;

    const data = await response.json();

    let oldIRating = 0;
    let newIRating = 0;
    let bestLapTime = 0;
    let averageLap = 0;
    let driverGrid: ApiDriverRow[] = [];

    const sessions = data.session_results || data.sessionResults || [];
    for (const session of sessions) {
      const rows: ApiDriverRow[] = session.results || [];
      // Capture the full grid from the Race session (simsession_type_name === 'Race')
      if (
        session.simsession_type_name === 'Race' ||
        session.simsession_name === 'RACE' ||
        driverGrid.length === 0
      ) {
        driverGrid = rows;
      }
      const myRow = rows.find((r) => Number(r.cust_id) === customerId);
      if (myRow) {
        oldIRating = Number(myRow.oldi_rating ?? myRow.old_irating ?? 0);
        newIRating = Number(myRow.newi_rating ?? myRow.new_irating ?? 0);
        // iRacing subsession API returns lap times in ten-thousandths of a second;
        // convert to hundredths to match our RecentRace type and formatLapTime expectations.
        bestLapTime = Math.round(Number(myRow.best_lap_time ?? myRow.bestLapTime ?? 0) / 100);
        averageLap = Math.round(Number(myRow.average_lap ?? myRow.averageLap ?? 0) / 100);
      }
    }

    return { oldIRating, newIRating, bestLapTime, averageLap, driverGrid };
  } catch (error) {
    console.error(`[DriverDataContext] Failed to fetch subsession ${subsessionId}:`, error);
    return null;
  }
}

/**
 * Enrich races that are missing iRating by fetching each subsession individually.
 * Also builds opponent encounter history as a side effect.
 */
async function enrichWithSubsessionData(
  races: RecentRace[],
  customerId: number
): Promise<RecentRace[]> {
  const missing = races.filter((r) => !r.newIRating || r.newIRating === 0);
  if (missing.length === 0) return races;

  console.log(`[DriverDataContext] Fetching subsession data for ${missing.length} races…`);

  const enriched = [...races];
  const batchSize = 5;

  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((race) => fetchSubsessionData(race.subsessionId, customerId))
    );

    results.forEach((result, idx) => {
      if (!result) return;
      const race = batch[idx];
      const raceIndex = enriched.findIndex((r) => r.subsessionId === race.subsessionId);
      if (raceIndex !== -1) {
        enriched[raceIndex] = {
          ...enriched[raceIndex],
          oldIRating: result.oldIRating,
          newIRating: result.newIRating,
          bestLapTime: result.bestLapTime,
          averageLap: result.averageLap,
        };
      }
      mergeDriverGrid(
        race.subsessionId,
        {
          date: race.sessionStartTime.slice(0, 10),
          trackName: race.trackName,
          category: getDiscipline(race),
          sof: race.strengthOfField,
        },
        result.driverGrid,
        customerId
      );
    });

    if (i + batchSize < missing.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return enriched;
}

/**
 * Fetch all race data for a driver, enriching with iRating where needed.
 *
 * - First load (no cache): full fetch covering the configured lookback window.
 * - Subsequent loads (stale cache): fetches only from the last cached race date to now,
 *   merges with existing data, and saves the combined result back to the cache.
 * - forceRefresh: clears the cache and does a full re-fetch.
 */
async function fetchAllDriverRaces(
  customerId: number,
  forceRefresh = false
): Promise<RecentRace[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockAllRaces;
  }

  const cacheEntry = forceRefresh ? null : getFullCacheEntry(customerId);

  // Fresh cache — nothing to fetch
  if (cacheEntry && !cacheEntry.isStale) {
    console.log(`[DriverDataContext] Cache is fresh, loaded ${cacheEntry.races.length} races`);
    return cacheEntry.races;
  }

  const isIncremental = !forceRefresh && cacheEntry !== null;
  const toastId = toast.loading(isIncremental ? 'Checking for new races…' : 'Fetching race data…', {
    description: isIncremental ? undefined : 'This can take 30–60 seconds on first load.',
    duration: Infinity,
  });

  try {
    // Fetch current season races — server resolves active season automatically
    const seasonResponse = await fetch(`/api/driver/${customerId}/season-races`);
    if (!seasonResponse.ok) {
      throw new Error(`Failed to fetch season races: ${seasonResponse.status}`);
    }
    const seasonData = await seasonResponse.json();
    const rawRaces: Record<string, unknown>[] = seasonData.races || [];
    const freshRaces = rawRaces.map(transformRace);

    let mergedRaces: RecentRace[];

    if (isIncremental) {
      // Merge cached races with any new ones from the current season fetch
      const existingById = new Map(cacheEntry.races.map((r) => [r.subsessionId, r]));
      for (const race of freshRaces) {
        if (!existingById.has(race.subsessionId)) {
          existingById.set(race.subsessionId, race);
        }
      }
      mergedRaces = Array.from(existingById.values());

      // Only enrich genuinely new races (not already in cache with iRating)
      const cachedIds = new Set(cacheEntry.races.map((r) => r.subsessionId));
      const newRaces = mergedRaces.filter((r) => !cachedIds.has(r.subsessionId));
      console.log(`[DriverDataContext] ${newRaces.length} new races since last fetch`);

      if (newRaces.length > 0) {
        const enrichedNew = await enrichWithSubsessionData(newRaces, customerId);
        const enrichedById = new Map(enrichedNew.map((r) => [r.subsessionId, r]));
        mergedRaces = mergedRaces.map((r) => enrichedById.get(r.subsessionId) ?? r);
      }
    } else {
      mergedRaces = await enrichWithSubsessionData(freshRaces, customerId);
    }

    // Sort oldest-first for charting
    mergedRaces.sort(
      (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
    );

    console.log(
      `[DriverDataContext] Final: ${mergedRaces.length} races, ${mergedRaces.filter((r) => r.newIRating > 0).length} with iRating`
    );

    setCachedRaces(customerId, mergedRaces);

    const newCount = isIncremental
      ? mergedRaces.length - (cacheEntry?.races.length ?? 0)
      : mergedRaces.length;
    toast.success(
      isIncremental
        ? newCount > 0
          ? `Found ${newCount} new race${newCount !== 1 ? 's' : ''}`
          : 'Already up to date'
        : `Loaded ${mergedRaces.length} races`,
      { id: toastId, duration: 3000 }
    );

    return mergedRaces;
  } catch (err) {
    toast.error('Failed to load race data', {
      id: toastId,
      description: 'Check your connection and try refreshing.',
      duration: 5000,
    });
    throw err;
  }
}

export function DriverDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DriverData>(() => {
    // Initialise lastFetched from cache so the timestamp is correct on first render
    return initialState;
  });

  const fetchData = useCallback(async (customerId: number, forceRefresh = false) => {
    setData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const races = await fetchAllDriverRaces(customerId, forceRefresh);
      const fetchedAt = getCacheFetchedAt(customerId) ?? Date.now();
      setData({
        customerId,
        races,
        isLoading: false,
        error: null,
        lastFetched: fetchedAt,
      });
    } catch (error) {
      console.error('[DriverDataContext] Error fetching data:', error);
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
      }));
    }
  }, []);

  const setCustomerId = useCallback(
    (id: number | null) => {
      if (id === null) {
        setData(initialState);
        return;
      }

      // Only fetch if customer ID changed
      if (id !== data.customerId) {
        fetchData(id);
      }
    },
    [data.customerId, fetchData]
  );

  const refreshData = useCallback(async () => {
    if (data.customerId) {
      await fetchData(data.customerId, false);
    }
  }, [data.customerId, fetchData]);

  const forceRefresh = useCallback(async () => {
    if (data.customerId) {
      clearRaceCache();
      await fetchData(data.customerId, true);
    }
  }, [data.customerId, fetchData]);

  return (
    <DriverDataContext.Provider value={{ data, setCustomerId, refreshData, forceRefresh }}>
      {children}
    </DriverDataContext.Provider>
  );
}

export function useDriverData() {
  const context = useContext(DriverDataContext);
  if (!context) {
    throw new Error('useDriverData must be used within a DriverDataProvider');
  }
  return context;
}

/**
 * Hook to get races filtered by series
 */
export function useSeriesRacesFromStore(seriesId: number | null) {
  const { data } = useDriverData();

  if (!seriesId || data.races.length === 0) {
    return { races: [], isLoading: data.isLoading };
  }

  const races = data.races.filter((r) => r.seriesId === seriesId);
  return { races, isLoading: data.isLoading };
}

/**
 * Hook to get races grouped by discipline/category
 */
export function useRacesByDiscipline() {
  const { data } = useDriverData();

  const racesByDiscipline = React.useMemo(() => {
    const result: Record<string, RecentRace[]> = {
      sports_car: [],
      formula: [],
      oval: [],
      dirt_road: [],
      dirt_oval: [],
    };

    // Group races by discipline using trackCategoryId when available, fallback to string matching
    data.races.forEach((race) => {
      const catId = race.trackCategoryId;
      const name = (race.seriesName || '').toLowerCase();
      const track = (race.trackName || '').toLowerCase();

      // Use trackCategoryId if available (1=oval, 2=road, 3=dirt_oval, 4=dirt_road)
      if (catId === 1) {
        result.oval.push(race);
      } else if (catId === 3) {
        result.dirt_oval.push(race);
      } else if (catId === 4) {
        result.dirt_road.push(race);
      } else if (catId === 2) {
        // Road category - distinguish between formula and sports car
        if (
          name.includes('formula') ||
          name.includes(' f1') ||
          name.includes(' f2') ||
          name.includes(' f3') ||
          name.includes('ir-04') ||
          name.includes('usf') ||
          name.includes('indy')
        ) {
          result.formula.push(race);
        } else {
          result.sports_car.push(race);
        }
      } else {
        // Fallback to string matching if no category ID
        const dirtRoadKeywords = [
          'dirt',
          'off-road',
          'off road',
          'offroad',
          'rallycross',
          'rx',
          'pro 2',
          'pro2',
          'pro 4',
          'pro4',
          'cross car',
          'trophy truck',
          'stadium truck',
          'short course',
          'pro lite',
        ];
        const dirtOvalKeywords = [
          'dirt oval',
          'sprint car',
          'world of outlaws',
          'usac',
          'midget',
          'silver crown',
          'dirt late model',
          'ump modified',
        ];
        const ovalKeywords = ['oval', 'nascar', 'arca', 'truck series', 'superspeedway'];
        const formulaKeywords = ['formula', ' f1', ' f2', ' f3', 'ir-04', 'usf', 'indy'];

        if (dirtOvalKeywords.some((kw) => name.includes(kw))) {
          result.dirt_oval.push(race);
        } else if (dirtRoadKeywords.some((kw) => name.includes(kw) || track.includes(kw))) {
          result.dirt_road.push(race);
        } else if (ovalKeywords.some((kw) => name.includes(kw))) {
          result.oval.push(race);
        } else if (formulaKeywords.some((kw) => name.includes(kw))) {
          result.formula.push(race);
        } else {
          result.sports_car.push(race);
        }
      }
    });

    return result;
  }, [data.races]);

  return { racesByDiscipline, isLoading: data.isLoading };
}
