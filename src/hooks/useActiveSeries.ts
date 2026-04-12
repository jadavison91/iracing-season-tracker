'use client';

import { useMemo } from 'react';
import { useSeasonRaces } from './useSeasonRaces';
import { SeriesSummary } from '@/lib/iracing/types';

export interface CarClassStats {
  carClassId: number;
  carClassName: string;
  carId: number | null; // Most driven car in this class
  carName: string | null;
  racesEntered: number;
  avgFinish: number;
  totalPoints: number;
  bestFinish: number;
  worstFinish: number;
}

export interface ActiveSeriesData extends Omit<
  SeriesSummary,
  'racesEntered' | 'avgFinish' | 'totalPoints' | 'bestFinish' | 'worstFinish'
> {
  category: string;
  // Stats for the primary (most driven) class
  carId: number | null;
  carName: string | null;
  carClassId: number | null;
  carClassName: string | null;
  racesEntered: number;
  avgFinish: number;
  totalPoints: number;
  bestFinish: number;
  worstFinish: number;
  // All class stats for multi-class series
  classStats: CarClassStats[];
}

export function useActiveSeries(customerId: number | null) {
  const { data: races, isLoading, error } = useSeasonRaces(customerId);

  const activeSeries = useMemo(() => {
    if (!races || races.length === 0) return [];

    // Determine when the current iRacing season started by finding the most
    // recent race with raceWeekNum === 0 (first week of a season) across all series.
    // All series share the same season calendar, so this gives us the season boundary.
    const weekZeroRaces = races.filter((r) => r.raceWeekNum === 0);
    const currentSeasonStart =
      weekZeroRaces.length > 0
        ? weekZeroRaces.reduce((latest, r) => {
            const d = new Date(r.sessionStartTime);
            return d > latest ? d : latest;
          }, new Date(0))
        : null;

    // Group races by series
    const seriesMap = new Map<number, typeof races>();
    races.forEach((race) => {
      const existing = seriesMap.get(race.seriesId) || [];
      existing.push(race);
      seriesMap.set(race.seriesId, existing);
    });

    // Calculate summary for each series
    const summaries: ActiveSeriesData[] = [];
    seriesMap.forEach((allSeriesRaces, seriesId) => {
      // Safety check - skip if no races (shouldn't happen, but just in case)
      if (!allSeriesRaces || allSeriesRaces.length === 0) return;

      // Only include races from the most recent season for this series.
      // The 12-week window can overlap the tail of a prior season — filter it out.
      const maxSeasonId = Math.max(...allSeriesRaces.map((r) => r.seasonId));
      const seriesRaces = allSeriesRaces.filter((r) => r.seasonId === maxSeasonId);

      // Skip this series if all its races pre-date the current season start.
      // This excludes series the driver only raced in the previous season.
      if (currentSeasonStart) {
        const hasCurrentSeasonRace = seriesRaces.some(
          (r) => new Date(r.sessionStartTime) >= currentSeasonStart!
        );
        if (!hasCurrentSeasonRace) return;
      }

      const firstRace = seriesRaces[0];
      // Safety check for missing seriesName
      if (!firstRace || !firstRace.seriesName) {
        console.warn('Race missing seriesName:', firstRace);
        return;
      }

      // Determine category from track category ID (1=oval, 2=road, 3=dirt_oval, 4=dirt_road)
      let category = 'road';
      const trackCatId = firstRace.trackCategoryId;

      if (trackCatId === 1) {
        category = 'oval';
      } else if (trackCatId === 2) {
        category = 'road';
      } else if (trackCatId === 3) {
        category = 'dirt_oval';
      } else if (trackCatId === 4) {
        category = 'dirt_road';
      } else {
        // Fallback to string matching if category ID not available
        const seriesLower = firstRace.seriesName.toLowerCase();
        const trackLower = firstRace.trackName.toLowerCase();

        // Dirt road series keywords
        const dirtRoadKeywords = [
          'dirt',
          'off-road',
          'offroad',
          'rallycross',
          'rx',
          'pro lite',
          'pro 2',
          'pro 4',
          'cross car',
          'trophy truck',
          'stadium truck',
          'short course',
        ];
        // Oval series keywords
        const ovalKeywords = ['nascar', 'oval', 'superspeedway', 'speedway'];
        // Dirt oval keywords
        const dirtOvalKeywords = [
          'sprint car',
          'world of outlaws',
          'usac',
          'midget',
          'silver crown',
          'dirt late model',
          'ump modified',
        ];

        if (dirtRoadKeywords.some((kw) => seriesLower.includes(kw) || trackLower.includes(kw))) {
          category = 'dirt_road';
        } else if (dirtOvalKeywords.some((kw) => seriesLower.includes(kw))) {
          category = 'dirt_oval';
        } else if (ovalKeywords.some((kw) => seriesLower.includes(kw))) {
          category = 'oval';
        }
      }

      // Group races by car class and calculate stats for each class
      const classesByRaceCount = new Map<number, typeof seriesRaces>();
      seriesRaces.forEach((race) => {
        if (race.carClassId) {
          const existing = classesByRaceCount.get(race.carClassId) || [];
          existing.push(race);
          classesByRaceCount.set(race.carClassId, existing);
        }
      });

      // Calculate stats for each class
      const classStats: CarClassStats[] = [];
      classesByRaceCount.forEach((classRaces, classId) => {
        // Find most driven car in this class
        const carCounts = new Map<number, { count: number; name: string }>();
        classRaces.forEach((race) => {
          if (race.carId) {
            const existing = carCounts.get(race.carId);
            if (existing) {
              existing.count++;
            } else {
              carCounts.set(race.carId, { count: 1, name: race.carName || '' });
            }
          }
        });

        let mostDrivenCarId: number | null = null;
        let mostDrivenCarName: string | null = null;
        let maxCarCount = 0;
        carCounts.forEach(({ count, name }, carId) => {
          if (count > maxCarCount) {
            maxCarCount = count;
            mostDrivenCarId = carId;
            mostDrivenCarName = name;
          }
        });

        const finishPositions = classRaces.map((r) => r.finishPositionInClass);

        // Championship scoring: best result per week, sum of top 8 weeks
        const weeklyBest = new Map<number, number>();
        classRaces.forEach((r) => {
          const prev = weeklyBest.get(r.raceWeekNum) ?? 0;
          if (r.champPoints > prev) weeklyBest.set(r.raceWeekNum, r.champPoints);
        });
        const totalPoints = [...weeklyBest.values()]
          .sort((a, b) => b - a)
          .slice(0, 8)
          .reduce((sum, pts) => sum + pts, 0);
        const className = classRaces[0]?.carClassName || classRaces[0]?.carClassShortName || '';

        classStats.push({
          carClassId: classId,
          carClassName: className,
          carId: mostDrivenCarId,
          carName: mostDrivenCarName,
          racesEntered: classRaces.length,
          avgFinish:
            Math.round((finishPositions.reduce((a, b) => a + b, 0) / finishPositions.length) * 10) /
            10,
          totalPoints,
          bestFinish: Math.min(...finishPositions),
          worstFinish: Math.max(...finishPositions),
        });
      });

      // Sort by race count (most driven first)
      classStats.sort((a, b) => b.racesEntered - a.racesEntered);

      // Primary class is the most driven one
      const primaryClass = classStats[0];

      summaries.push({
        seriesId,
        seriesName: firstRace.seriesName,
        seasonId: firstRace.seasonId,
        custId: customerId || 0,
        racesEntered: primaryClass?.racesEntered || 0,
        avgFinish: primaryClass?.avgFinish || 0,
        totalPoints: primaryClass?.totalPoints || 0,
        bestFinish: primaryClass?.bestFinish || 0,
        worstFinish: primaryClass?.worstFinish || 0,
        category,
        carId: primaryClass?.carId || null,
        carName: primaryClass?.carName || null,
        carClassId: primaryClass?.carClassId || null,
        carClassName: primaryClass?.carClassName || null,
        classStats,
      });
    });

    // Filter out series with no championship points (fun/special events)
    // and sort by total points descending
    return summaries.filter((s) => s.totalPoints > 0).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [races, customerId]);

  return {
    data: activeSeries,
    isLoading,
    error,
  };
}
