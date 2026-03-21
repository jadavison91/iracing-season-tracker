'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { RecentRace } from '@/lib/iracing/types';
import { USE_MOCK_DATA, mockAllRaces } from '@/lib/mock-data';

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
 * Fetch a 20-week window — wide enough to always overlap with the previous season
 * so we have raceWeekNum data from both seasons to detect the boundary.
 */
function getSeasonDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 91); // 13 weeks — covers full season + 1 week overlap for boundary detection
  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
  };
}

/**
 * Filter races to only those in the current iRacing season using raceWeekNum.
 *
 * Races must be sorted newest-first. Going backwards in time, week numbers should
 * decrease within a season. When a week number jumps more than 4 higher than the
 * lowest week seen so far, that indicates the previous season — stop there.
 */
function filterToCurrentSeason(races: RecentRace[]): RecentRace[] {
  if (races.length === 0) return races;

  let minWeekSeen = races[0].raceWeekNum;

  for (let i = 1; i < races.length; i++) {
    const weekNum = races[i].raceWeekNum;
    if (weekNum > minWeekSeen + 4) {
      console.log(`[DriverDataContext] Season boundary at index ${i}: week ${weekNum} > min ${minWeekSeen} + 4`);
      return races.slice(0, i);
    }
    minWeekSeen = Math.min(minWeekSeen, weekNum);
  }

  return races;
}

/**
 * Fetch subsession details to get iRating data for a race
 */
async function fetchSubsessionIRating(
  subsessionId: number,
  customerId: number
): Promise<{ oldIRating: number; newIRating: number } | null> {
  try {
    const response = await fetch(`/api/subsession/${subsessionId}`);
    if (!response.ok) return null;

    const data = await response.json();

    // Find the driver's result in the session results
    const results = data.session_results || data.sessionResults || [];
    for (const session of results) {
      const driverResults = session.results || [];
      const driverResult = driverResults.find(
        (r: Record<string, unknown>) =>
          Number(r.cust_id ?? r.custId) === customerId
      );
      if (driverResult) {
        return {
          oldIRating: Number(driverResult.oldi_rating ?? driverResult.old_irating ?? driverResult.oldIRating ?? 0),
          newIRating: Number(driverResult.newi_rating ?? driverResult.new_irating ?? driverResult.newIRating ?? 0),
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`[DriverDataContext] Failed to fetch subsession ${subsessionId}:`, error);
    return null;
  }
}

/**
 * Fetch all race data for a driver, enriching with iRating where needed
 */
async function fetchAllDriverRaces(customerId: number): Promise<RecentRace[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockAllRaces;
  }

  const { startDate, endDate } = getSeasonDateRange();

  // Fetch season races (all races for the season)
  const seasonResponse = await fetch(
    `/api/driver/${customerId}/season-races?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  );

  if (!seasonResponse.ok) {
    throw new Error(`Failed to fetch season races: ${seasonResponse.status}`);
  }

  const seasonData = await seasonResponse.json();

  // Transform from snake_case API response to camelCase
  const rawRaces: Record<string, unknown>[] = seasonData.races || [];
  const races: RecentRace[] = rawRaces.map(transformRace);

  console.log(`[DriverDataContext] Fetched ${races.length} races for date range ${startDate} → ${endDate}`);

  // Check if races have iRating data
  const racesWithoutIRating = races.filter(r => !r.newIRating || r.newIRating === 0);
  console.log(`[DriverDataContext] ${racesWithoutIRating.length} races missing iRating data`);

  // If races are missing iRating, fetch from subsession details
  if (racesWithoutIRating.length > 0) {
    console.log(`[DriverDataContext] Fetching iRating data from subsessions...`);

    // Fetch in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < racesWithoutIRating.length; i += batchSize) {
      const batch = racesWithoutIRating.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(race => fetchSubsessionIRating(race.subsessionId, customerId))
      );

      // Update races with fetched iRating data
      results.forEach((result, idx) => {
        if (result) {
          const race = batch[idx];
          const raceIndex = races.findIndex(r => r.subsessionId === race.subsessionId);
          if (raceIndex !== -1) {
            races[raceIndex] = {
              ...races[raceIndex],
              oldIRating: result.oldIRating,
              newIRating: result.newIRating,
            };
          }
        }
      });

      // Small delay between batches to respect rate limits
      if (i + batchSize < racesWithoutIRating.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  // Sort newest-first for season boundary detection
  races.sort((a, b) =>
    new Date(b.sessionStartTime).getTime() - new Date(a.sessionStartTime).getTime()
  );

  console.log('[DriverDataContext] All races (newest first):');
  races.forEach((r, i) =>
    console.log(`  [${i}] ${r.sessionStartTime.slice(0, 10)} week=${r.raceWeekNum} seasonId=${r.seasonId} series="${r.seriesName}"`)
  );

  // Filter to current season using week number boundary detection
  const currentSeasonRaces = filterToCurrentSeason(races);
  console.log(`[DriverDataContext] After season filter: ${currentSeasonRaces.length} of ${races.length} races`);

  // Re-sort oldest-first for charting
  currentSeasonRaces.sort((a, b) =>
    new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
  );

  console.log(`[DriverDataContext] Final: ${currentSeasonRaces.length} races, ${currentSeasonRaces.filter(r => r.newIRating > 0).length} with iRating`);

  return currentSeasonRaces;
}

export function DriverDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DriverData>(initialState);

  const fetchData = useCallback(async (customerId: number) => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const races = await fetchAllDriverRaces(customerId);
      setData({
        customerId,
        races,
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
      });
    } catch (error) {
      console.error('[DriverDataContext] Error fetching data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
      }));
    }
  }, []);

  const setCustomerId = useCallback((id: number | null) => {
    if (id === null) {
      setData(initialState);
      return;
    }

    // Only fetch if customer ID changed
    if (id !== data.customerId) {
      fetchData(id);
    }
  }, [data.customerId, fetchData]);

  const refreshData = useCallback(async () => {
    if (data.customerId) {
      await fetchData(data.customerId);
    }
  }, [data.customerId, fetchData]);

  return (
    <DriverDataContext.Provider value={{ data, setCustomerId, refreshData }}>
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

  const races = data.races.filter(r => r.seriesId === seriesId);
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
    data.races.forEach(race => {
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
        if (name.includes('formula') || name.includes(' f1') || name.includes(' f2') || name.includes(' f3') ||
            name.includes('ir-04') || name.includes('usf') || name.includes('indy')) {
          result.formula.push(race);
        } else {
          result.sports_car.push(race);
        }
      } else {
        // Fallback to string matching if no category ID
        const dirtRoadKeywords = ['dirt', 'off-road', 'off road', 'offroad', 'rallycross', 'rx',
                                   'pro 2', 'pro2', 'pro 4', 'pro4', 'cross car', 'trophy truck',
                                   'stadium truck', 'short course', 'pro lite'];
        const dirtOvalKeywords = ['dirt oval', 'sprint car', 'world of outlaws', 'usac', 'midget',
                                   'silver crown', 'dirt late model', 'ump modified'];
        const ovalKeywords = ['oval', 'nascar', 'arca', 'truck series', 'superspeedway'];
        const formulaKeywords = ['formula', ' f1', ' f2', ' f3', 'ir-04', 'usf', 'indy'];

        if (dirtOvalKeywords.some(kw => name.includes(kw))) {
          result.dirt_oval.push(race);
        } else if (dirtRoadKeywords.some(kw => name.includes(kw) || track.includes(kw))) {
          result.dirt_road.push(race);
        } else if (ovalKeywords.some(kw => name.includes(kw))) {
          result.oval.push(race);
        } else if (formulaKeywords.some(kw => name.includes(kw))) {
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
