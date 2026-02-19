'use client';

import { useMemo } from 'react';
import { useSeasonRaces } from './useSeasonRaces';
import { SeriesSummary } from '@/lib/iracing/types';

export interface ActiveSeriesData extends SeriesSummary {
  category: string;
}

export function useActiveSeries(customerId: number | null) {
  const { data: races, isLoading, error } = useSeasonRaces(customerId);

  const activeSeries = useMemo(() => {
    if (!races || races.length === 0) return [];

    // Group races by series
    const seriesMap = new Map<number, typeof races>();
    races.forEach((race) => {
      const existing = seriesMap.get(race.seriesId) || [];
      existing.push(race);
      seriesMap.set(race.seriesId, existing);
    });

    // Calculate summary for each series
    const summaries: ActiveSeriesData[] = [];
    seriesMap.forEach((seriesRaces, seriesId) => {
      // Safety check - skip if no races (shouldn't happen, but just in case)
      if (!seriesRaces || seriesRaces.length === 0) return;

      const firstRace = seriesRaces[0];
      // Safety check for missing seriesName
      if (!firstRace || !firstRace.seriesName) {
        console.warn('Race missing seriesName:', firstRace);
        return;
      }

      // Use class positions (what matters for championship)
      const finishPositions = seriesRaces.map((r) => r.finishPositionInClass);
      const totalPoints = seriesRaces.reduce((sum, r) => sum + r.champPoints, 0);

      // Determine category based on track name or series name
      let category = 'road';
      if (firstRace.seriesName.toLowerCase().includes('dirt') ||
          firstRace.seriesName.toLowerCase().includes('off-road')) {
        category = 'dirt_road';
      }

      summaries.push({
        seriesId,
        seriesName: firstRace.seriesName,
        seasonId: firstRace.seasonId,
        custId: customerId || 0,
        racesEntered: seriesRaces.length,
        avgFinish:
          Math.round(
            (finishPositions.reduce((a, b) => a + b, 0) / finishPositions.length) * 10
          ) / 10,
        totalPoints,
        bestFinish: Math.min(...finishPositions),
        worstFinish: Math.max(...finishPositions),
        category,
      });
    });

    // Sort by total points descending
    return summaries.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [races, customerId]);

  return {
    data: activeSeries,
    isLoading,
    error,
  };
}
