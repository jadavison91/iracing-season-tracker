'use client';

import { useMemo } from 'react';
import { useSeasonRaces } from './useSeasonRaces';
import { RecentRace } from '@/lib/iracing/types';

export interface SeriesRacesData {
  races: RecentRace[];
  seriesName: string;
  seasonId: number;
  stats: {
    totalRaces: number;
    totalPoints: number;
    avgFinish: number;
    avgStart: number;
    bestFinish: number;
    worstFinish: number;
    wins: number;
    podiums: number;
    top5s: number;
    totalIncidents: number;
    avgIncidents: number;
    avgSoF: number;
  };
}

export function useSeriesRaces(customerId: number | null, seriesId: number) {
  const { data: allRaces, isLoading, error } = useSeasonRaces(customerId);

  const seriesData = useMemo((): SeriesRacesData | null => {
    if (!allRaces || allRaces.length === 0) return null;

    // Filter races for this series
    const races = allRaces
      .filter((r) => r.seriesId === seriesId)
      .sort((a, b) => new Date(b.sessionStartTime).getTime() - new Date(a.sessionStartTime).getTime());

    if (races.length === 0) return null;

    // Calculate stats using class positions (what matters for championship)
    const finishPositions = races.map((r) => r.finishPositionInClass);
    const startPositions = races.map((r) => r.startPositionInClass);
    const incidents = races.map((r) => r.incidents);
    const sofs = races.map((r) => r.strengthOfField);

    return {
      races,
      seriesName: races[0].seriesName,
      seasonId: races[0].seasonId,
      stats: {
        totalRaces: races.length,
        totalPoints: races.reduce((sum, r) => sum + r.champPoints, 0),
        avgFinish: Math.round((finishPositions.reduce((a, b) => a + b, 0) / races.length) * 10) / 10,
        avgStart: Math.round((startPositions.reduce((a, b) => a + b, 0) / races.length) * 10) / 10,
        bestFinish: Math.min(...finishPositions),
        worstFinish: Math.max(...finishPositions),
        wins: finishPositions.filter((p) => p === 1).length,
        podiums: finishPositions.filter((p) => p <= 3).length,
        top5s: finishPositions.filter((p) => p <= 5).length,
        totalIncidents: incidents.reduce((a, b) => a + b, 0),
        avgIncidents: Math.round((incidents.reduce((a, b) => a + b, 0) / races.length) * 10) / 10,
        avgSoF: Math.round(sofs.reduce((a, b) => a + b, 0) / races.length),
      },
    };
  }, [allRaces, seriesId]);

  return {
    data: seriesData,
    isLoading,
    error,
  };
}
