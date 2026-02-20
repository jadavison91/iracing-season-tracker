'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useRecentRaces, useSeasonRaces } from '@/hooks';
import { VirtualIRatingChart } from '@/components/charts/VirtualIRatingChart';
import { AchievementsTable } from '@/components/charts/AchievementsTable';
import { IncidentTrendChart } from '@/components/charts/IncidentTrendChart';
import { FinishTrendChart } from '@/components/charts/FinishTrendChart';
import { SoFDistributionChart } from '@/components/charts/SoFDistributionChart';
import { ChampionshipPointsChart } from '@/components/charts/ChampionshipPointsChart';
import {
  mockAllRaces,
  calculateVirtualIRating,
  getSeriesAchievements,
  getIncidentTrend,
  getSoFDistribution,
  getFinishPositionTrend,
  getChampionshipPointsBySeries,
  USE_MOCK_DATA,
} from '@/lib/mock-data';

interface ChartsViewProps {
  customerId: number | null;
}

export function ChartsView({ customerId }: ChartsViewProps) {
  // Use season-races for complete race data (championship points, achievements, etc.)
  const { data: seasonRaces, isLoading: seasonLoading } = useSeasonRaces(customerId);
  // Use recent-races for iRating data (has oldIRating/newIRating fields)
  const { data: recentRaces, isLoading: recentLoading } = useRecentRaces(customerId);

  const isLoading = seasonLoading || recentLoading;

  // Use season races for most charts (has all races with champ points)
  const races = USE_MOCK_DATA ? mockAllRaces : (seasonRaces || []);
  // Use recent races for iRating chart (has iRating change data)
  const racesWithIRating = USE_MOCK_DATA ? mockAllRaces : (recentRaces || []);

  // Calculate chart data
  const chartData = useMemo(() => {
    if (races.length === 0 && racesWithIRating.length === 0) return null;

    // Use races with iRating data for the virtual iRating chart
    const iRatingSeriesIds = [...new Set(racesWithIRating.map((r) => r.seriesId))];
    const virtualIRatingData = iRatingSeriesIds.map((seriesId) => ({
      seriesId,
      seriesName: racesWithIRating.find((r) => r.seriesId === seriesId)?.seriesName || '',
      data: calculateVirtualIRating(racesWithIRating, seriesId),
    }));

    // Use all season races for other charts (has complete champ points data)
    const racesForStats = races.length > 0 ? races : racesWithIRating;

    return {
      virtualIRating: virtualIRatingData,
      achievements: getSeriesAchievements(racesForStats),
      incidentTrend: getIncidentTrend(racesForStats),
      sofDistribution: getSoFDistribution(racesForStats),
      finishTrend: getFinishPositionTrend(racesForStats),
      championshipPoints: getChampionshipPointsBySeries(racesForStats),
    };
  }, [races, racesWithIRating]);

  if (!customerId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <EmptyState
            variant="no-driver"
            description="Enter a Customer ID to view performance charts and analytics."
          />
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!chartData || (races.length === 0 && racesWithIRating.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <EmptyState
            variant="no-races"
            title="No Race Data"
            description="No historical race data found. Start racing to see your performance analytics!"
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance Analytics</h1>
        <p className="text-zinc-500">
          Analyze your racing performance across all series
        </p>
      </div>

      {/* Virtual iRating Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Virtual Series iRating</CardTitle>
          <CardDescription>
            Track your iRating progression as if it were calculated per-series.
            Each series starts from your actual iRating at your first race.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VirtualIRatingChart data={chartData.virtualIRating} />
        </CardContent>
      </Card>

      {/* Championship Points by Series */}
      <Card>
        <CardHeader>
          <CardTitle>Championship Points by Series</CardTitle>
          <CardDescription>
            Season points breakdown showing best 8 weeks counting toward championship
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChampionshipPointsChart data={chartData.championshipPoints} />
        </CardContent>
      </Card>

      {/* Achievements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Achievement Stats</CardTitle>
          <CardDescription>
            Your accomplishments broken down by series
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AchievementsTable data={chartData.achievements} />
        </CardContent>
      </Card>

      {/* Two-column layout for smaller charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Incident Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Incident Trend</CardTitle>
            <CardDescription>
              Track your incident count over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IncidentTrendChart data={chartData.incidentTrend} />
          </CardContent>
        </Card>

        {/* Average Finish Position Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Finish Position Trend</CardTitle>
            <CardDescription>
              Your finishing positions with 5-race rolling average
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FinishTrendChart data={chartData.finishTrend} />
          </CardContent>
        </Card>
      </div>

      {/* SoF Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Strength of Field Distribution</CardTitle>
          <CardDescription>
            Distribution of races by SoF bracket and your average finish in each
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SoFDistributionChart data={chartData.sofDistribution} />
        </CardContent>
      </Card>
    </div>
  );
}
