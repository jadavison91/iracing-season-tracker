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

  // Calculate summary stats (must be before early returns to follow hooks rules)
  const summaryStats = useMemo(() => {
    if (races.length === 0) {
      return {
        totalRaces: 0,
        racesWithIRating: 0,
        totalWins: 0,
        totalPodiums: 0,
        avgIncidents: '0',
        uniqueSeries: 0,
        bestIRatingGain: 0,
      };
    }

    const racesWithIRating = races.filter((r) => r.newIRating > 0);
    const totalWins = races.filter((r) => r.finishPositionInClass === 1).length;
    const totalPodiums = races.filter((r) => r.finishPositionInClass <= 3).length;
    const totalIncidents = races.reduce((sum, r) => sum + r.incidents, 0);
    const avgIncidents = races.length > 0 ? (totalIncidents / races.length).toFixed(1) : '0';
    const uniqueSeries = new Set(races.map((r) => r.seriesId)).size;

    // Calculate best iRating change in a single race
    let bestIRatingGain = 0;
    racesWithIRating.forEach((r) => {
      const change = r.newIRating - r.oldIRating;
      if (change > bestIRatingGain) bestIRatingGain = change;
    });

    return {
      totalRaces: races.length,
      racesWithIRating: racesWithIRating.length,
      totalWins,
      totalPodiums,
      avgIncidents,
      uniqueSeries,
      bestIRatingGain,
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Page Header with Summary Stats */}
      <div className="rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 p-5 dark:from-zinc-900 dark:to-zinc-800 sm:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Performance Analytics</h1>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            Season overview across {summaryStats.uniqueSeries} series
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <SummaryStatBox label="Races" value={summaryStats.totalRaces} />
          <SummaryStatBox label="Wins" value={summaryStats.totalWins} highlight={summaryStats.totalWins > 0 ? 'gold' : undefined} />
          <SummaryStatBox label="Podiums" value={summaryStats.totalPodiums} highlight={summaryStats.totalPodiums > 0 ? 'bronze' : undefined} />
          <SummaryStatBox label="Avg Inc" value={`${summaryStats.avgIncidents}x`} />
          <SummaryStatBox label="Best iR Gain" value={`+${summaryStats.bestIRatingGain}`} highlight="green" />
          <SummaryStatBox label="iR Data" value={summaryStats.racesWithIRating} />
        </div>
      </div>

      {/* iRating Section */}
      <section>
        <SectionHeader title="iRating Progression" description="Track your rating changes over time" />
        <div className="mt-4 space-y-6">
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
        </div>
      </section>

      {/* Championship Section */}
      <section>
        <SectionHeader title="Championship" description="Points and achievements by series" />
        <div className="mt-4 space-y-6">
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
        </div>
      </section>

      {/* Performance Trends Section */}
      <section>
        <SectionHeader title="Performance Trends" description="Analyze your racing patterns" />
        <div className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
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
      </section>
    </div>
  );
}

// Section header component
function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-1 rounded-full bg-blue-500" />
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

// Summary stat box for the header
interface SummaryStatBoxProps {
  label: string;
  value: string | number;
  highlight?: 'green' | 'gold' | 'bronze';
}

function SummaryStatBox({ label, value, highlight }: SummaryStatBoxProps) {
  const highlightClass =
    highlight === 'green'
      ? 'text-green-600 dark:text-green-400'
      : highlight === 'gold'
        ? 'text-yellow-500 dark:text-yellow-400'
        : highlight === 'bronze'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-zinc-900 dark:text-zinc-100';

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center dark:border-zinc-700 dark:bg-zinc-800">
      <div className={`text-lg font-bold ${highlightClass}`}>{value}</div>
      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</div>
    </div>
  );
}
