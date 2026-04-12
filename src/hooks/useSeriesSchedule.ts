'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SeasonScheduleData, WeekSchedule, WeekResult, RecentRace } from '@/lib/iracing/types';
import { useSeasonRaces } from './useSeasonRaces';

/**
 * Fetch schedule data for a series
 */
async function fetchSeriesSchedule(seriesId: number): Promise<SeasonScheduleData> {
  const response = await fetch(`/api/series/${seriesId}/schedule`);

  if (!response.ok) {
    throw new Error(`Failed to fetch schedule: ${response.status}`);
  }

  return response.json();
}

/**
 * Determine the status of a week based on schedule and results
 */
function getWeekStatus(
  week: WeekSchedule,
  hasResults: boolean
): 'completed' | 'active' | 'upcoming' | 'skipped' {
  if (week.isActive) {
    return 'active';
  }
  if (week.isComplete) {
    return hasResults ? 'completed' : 'skipped';
  }
  return 'upcoming';
}

/**
 * Find the best result for a week (highest championship points)
 */
function getBestResult(races: RecentRace[]): RecentRace | null {
  if (races.length === 0) return null;

  return races.reduce(
    (best, race) => {
      if (!best) return race;
      // Sort by championship points (higher is better)
      return race.champPoints > best.champPoints ? race : best;
    },
    null as RecentRace | null
  );
}

export interface SeriesScheduleResult {
  schedule: SeasonScheduleData | null;
  weekResults: WeekResult[];
  seasonTotal: number; // Sum of top 8 weeks' championship points
  weeksCompleted: number; // Number of weeks with results
  weeksCounting: number; // Number of weeks counting toward championship (max 8)
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch series schedule and combine with race results
 * to show the 12-week season grid with best results per week
 */
export function useSeriesSchedule(
  customerId: number | null,
  seriesId: number
): SeriesScheduleResult {
  // Fetch schedule data
  const {
    data: scheduleData,
    isLoading: scheduleLoading,
    error: scheduleError,
  } = useQuery({
    queryKey: ['seriesSchedule', seriesId],
    queryFn: () => fetchSeriesSchedule(seriesId),
    enabled: seriesId > 0,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (schedules don't change often)
  });

  // Fetch race data for the driver
  const { data: allRaces, isLoading: racesLoading, error: racesError } = useSeasonRaces(customerId);

  // Combine schedule with race results and calculate counting weeks
  const { weekResults, seasonTotal, weeksCompleted, weeksCounting } = useMemo(() => {
    if (!scheduleData?.weeks) {
      return { weekResults: [], seasonTotal: 0, weeksCompleted: 0, weeksCounting: 0 };
    }

    // Filter races for this series
    const seriesRaces = (allRaces || []).filter((r) => r.seriesId === seriesId);

    // First pass: create week results without isCounting flag
    const preliminaryResults = scheduleData.weeks.map((week) => {
      // Filter by both raceWeekNum AND seasonId to avoid prior-season results
      // appearing in upcoming weeks of the current season.
      const weekRaces = seriesRaces.filter(
        (r) => r.raceWeekNum === week.raceWeekNum && r.seasonId === scheduleData.seasonId
      );
      const bestResult = getBestResult(weekRaces);
      const hasResults = weekRaces.length > 0;
      const status = getWeekStatus(week, hasResults);

      return {
        weekNum: week.raceWeekNum,
        displayWeek: week.displayWeek,
        schedule: week,
        status,
        bestResult,
        totalAttempts: weekRaces.length,
        allResults: weekRaces.sort((a, b) => b.champPoints - a.champPoints),
      };
    });

    // Find the top 8 weeks by championship points
    const weeksWithResults = preliminaryResults.filter((w) => w.bestResult !== null);
    const sortedByPoints = [...weeksWithResults].sort(
      (a, b) => (b.bestResult?.champPoints ?? 0) - (a.bestResult?.champPoints ?? 0)
    );
    const countingWeekNums = new Set(sortedByPoints.slice(0, 8).map((w) => w.weekNum));

    // Calculate season total (sum of top 8)
    const seasonTotal = sortedByPoints
      .slice(0, 8)
      .reduce((sum, w) => sum + (w.bestResult?.champPoints ?? 0), 0);

    // Second pass: add isCounting flag
    const weekResults: WeekResult[] = preliminaryResults.map((w) => ({
      ...w,
      isCounting: countingWeekNums.has(w.weekNum),
    }));

    return {
      weekResults,
      seasonTotal,
      weeksCompleted: weeksWithResults.length,
      weeksCounting: Math.min(weeksWithResults.length, 8),
    };
  }, [scheduleData, allRaces, seriesId]);

  return {
    schedule: scheduleData ?? null,
    weekResults,
    seasonTotal,
    weeksCompleted,
    weeksCounting,
    isLoading: scheduleLoading || racesLoading,
    error: (scheduleError ?? racesError) as Error | null,
  };
}
