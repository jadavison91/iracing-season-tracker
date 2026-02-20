'use client';

import { useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useDriverData, useRacesByDiscipline } from '@/contexts/DriverDataContext';
import { VirtualIRatingChart } from '@/components/charts/VirtualIRatingChart';
import { IRatingByCategoryChart } from '@/components/charts/IRatingByCategoryChart';
import { AchievementsTable } from '@/components/charts/AchievementsTable';
import { IncidentTrendChart } from '@/components/charts/IncidentTrendChart';
import { FinishTrendChart } from '@/components/charts/FinishTrendChart';
import { SoFDistributionChart } from '@/components/charts/SoFDistributionChart';
import { ChampionshipPointsChart } from '@/components/charts/ChampionshipPointsChart';
import {
  calculateVirtualIRating,
  getSeriesAchievements,
  getIncidentTrend,
  getSoFDistribution,
  getFinishPositionTrend,
  getChampionshipPointsBySeries,
} from '@/lib/mock-data';

interface ChartsViewProps {
  customerId: number | null;
}

export function ChartsView({ customerId }: ChartsViewProps) {
  const { data: driverData, setCustomerId } = useDriverData();
  const { racesByDiscipline, isLoading: disciplineLoading } = useRacesByDiscipline();

  // Sync customerId with the driver data store
  useEffect(() => {
    setCustomerId(customerId);
  }, [customerId, setCustomerId]);

  const races = driverData.races;
  const isLoading = driverData.isLoading;

  // Calculate chart data from the centralized store
  const chartData = useMemo(() => {
    if (races.length === 0) return null;

    // Get unique series IDs
    const seriesIds = [...new Set(races.map((r) => r.seriesId))];

    // Calculate virtual iRating per series (using races with iRating data)
    const racesWithIRating = races.filter((r) => r.newIRating > 0);
    const virtualIRatingData = seriesIds
      .filter((seriesId) => racesWithIRating.some((r) => r.seriesId === seriesId))
      .map((seriesId) => ({
        seriesId,
        seriesName: races.find((r) => r.seriesId === seriesId)?.seriesName || '',
        data: calculateVirtualIRating(racesWithIRating, seriesId),
      }));

    return {
      virtualIRating: virtualIRatingData,
      achievements: getSeriesAchievements(races),
      incidentTrend: getIncidentTrend(races),
      sofDistribution: getSoFDistribution(races),
      finishTrend: getFinishPositionTrend(races),
      championshipPoints: getChampionshipPointsBySeries(races),
    };
  }, [races]);

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

  if (!chartData || races.length === 0) {
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

  // Count races with iRating data
  const racesWithIRating = races.filter((r) => r.newIRating > 0).length;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance Analytics</h1>
        <p className="text-zinc-500">
          Analyze your racing performance across all series ({races.length} races, {racesWithIRating} with iRating data)
        </p>
      </div>

      {/* Overall iRating by Category */}
      <Card>
        <CardHeader>
          <CardTitle>iRating by Discipline</CardTitle>
          <CardDescription>
            Track your overall iRating progression across different racing disciplines throughout the season
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IRatingByCategoryChart racesByDiscipline={racesByDiscipline} isLoading={disciplineLoading} />
        </CardContent>
      </Card>

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
