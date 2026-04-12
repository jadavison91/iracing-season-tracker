'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSeriesRaces, useSeriesSchedule } from '@/hooks';
import { FinishPositionChart } from '@/components/charts/FinishPositionChart';
import { RaceResultsTable } from '@/components/RaceResultsTable';
import { RaceDetailModal } from '@/components/RaceDetailModal';
import { RaceComparison } from '@/components/RaceComparison';
import {
  RaceFiltersBar,
  RaceFilters,
  defaultFilters,
  applyRaceFilters,
} from '@/components/RaceFilters';
import { SeasonScheduleTable } from '@/components/SeasonScheduleTable';
import { EmptyState } from '@/components/EmptyState';
import { RecentRace, WeekResult } from '@/lib/iracing/types';

type ViewMode = 'results' | 'schedule';

interface SeriesDetailProps {
  customerId: number | null;
  seriesId: number;
}

interface CarOption {
  carId: number;
  carName: string;
  raceCount: number;
}

export function SeriesDetail({ customerId, seriesId }: SeriesDetailProps) {
  const router = useRouter();
  const { data, isLoading, error } = useSeriesRaces(customerId, seriesId);
  const {
    weekResults,
    seasonTotal,
    weeksCounting,
    isLoading: scheduleLoading,
  } = useSeriesSchedule(customerId, seriesId);
  const [selectedRace, setSelectedRace] = useState<RecentRace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRaceIds, setSelectedRaceIds] = useState<number[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [filters, setFilters] = useState<RaceFilters>(defaultFilters);
  const [viewMode, setViewMode] = useState<ViewMode>('schedule');
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);

  // Compute available cars from races
  const carOptions: CarOption[] = useMemo(() => {
    if (!data?.races) return [];
    const carMap = new Map<number, { name: string; count: number }>();
    data.races.forEach((race) => {
      if (race.carId) {
        const existing = carMap.get(race.carId);
        if (existing) {
          existing.count++;
        } else {
          carMap.set(race.carId, { name: race.carName || `Car ${race.carId}`, count: 1 });
        }
      }
    });
    return Array.from(carMap.entries())
      .map(([carId, { name, count }]) => ({ carId, carName: name, raceCount: count }))
      .sort((a, b) => b.raceCount - a.raceCount);
  }, [data?.races]);

  const hasMultipleCars = carOptions.length > 1;

  // Filter races by selected car (if any)
  const carFilteredRaces = useMemo(() => {
    if (!data?.races) return [];
    if (!selectedCarId) return data.races;
    return data.races.filter((r) => r.carId === selectedCarId);
  }, [data?.races, selectedCarId]);

  // Recalculate stats for filtered races
  const filteredStats = useMemo(() => {
    const races = carFilteredRaces;
    if (races.length === 0) return data?.stats;

    const finishPositions = races.map((r) => r.finishPositionInClass);
    const startPositions = races.map((r) => r.startPositionInClass);
    const incidents = races.map((r) => r.incidents);
    const sofs = races.map((r) => r.strengthOfField);

    return {
      totalRaces: races.length,
      totalPoints: Array.from(
        races.reduce((map, r) => {
          if (r.champPoints > (map.get(r.raceWeekNum) ?? 0)) map.set(r.raceWeekNum, r.champPoints);
          return map;
        }, new Map<number, number>()).values()
      ).reduce((sum, pts) => sum + pts, 0),
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
    };
  }, [carFilteredRaces, data?.stats]);

  // Filter week results by selected car
  const carFilteredWeekResults: WeekResult[] = useMemo(() => {
    if (!selectedCarId) return weekResults;

    // First pass: filter races and calculate best results
    const filteredWeeks = weekResults.map((week) => {
      // Filter allResults to only include races with the selected car
      const filteredAllResults = week.allResults.filter((r) => r.carId === selectedCarId);

      // Find best result from filtered races
      const bestResult =
        filteredAllResults.length > 0
          ? filteredAllResults.reduce(
              (best, r) => (!best || r.champPoints > best.champPoints ? r : best),
              null as RecentRace | null
            )
          : null;

      // Determine status based on filtered results
      // If week was completed but no races with this car, mark as 'skipped' (week passed, didn't race this car)
      // Keep 'upcoming' and 'active' as-is since those are time-based
      let status = week.status;
      if (week.status === 'completed' && filteredAllResults.length === 0) {
        status = 'skipped';
      }

      return {
        ...week,
        allResults: filteredAllResults,
        bestResult,
        totalAttempts: filteredAllResults.length,
        status,
        isCounting: false, // Will be set in second pass
      };
    });

    // Second pass: determine which weeks are counting (top 8 by points)
    const weeksWithPoints = filteredWeeks
      .filter((w) => w.bestResult && w.status === 'completed')
      .map((w) => ({ weekNum: w.weekNum, points: w.bestResult?.champPoints || 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 8)
      .map((w) => w.weekNum);

    const countingWeekNums = new Set(weeksWithPoints);

    return filteredWeeks.map((week) => ({
      ...week,
      isCounting: countingWeekNums.has(week.weekNum),
    }));
  }, [weekResults, selectedCarId]);

  // Recalculate season totals for filtered results
  const filteredSeasonStats = useMemo(() => {
    // Include completed weeks AND the active week (if the driver has raced in it)
    const completedWeeks = carFilteredWeekResults.filter(
      (w) => (w.status === 'completed' || w.status === 'active') && w.bestResult
    );

    // Get points from best results, sort descending, take top 8
    const weekPoints = completedWeeks
      .map((w) => w.bestResult?.champPoints || 0)
      .sort((a, b) => b - a);

    const countingWeeks = weekPoints.slice(0, 8);
    const total = countingWeeks.reduce((sum, pts) => sum + pts, 0);

    return {
      seasonTotal: total,
      weeksCounting: countingWeeks.length,
    };
  }, [carFilteredWeekResults]);

  const selectedRacesForComparison =
    data?.races.filter((r) => selectedRaceIds.includes(r.subsessionId)) || [];

  const filteredRaces = carFilteredRaces ? applyRaceFilters(carFilteredRaces, filters) : [];

  const handleRaceClick = (subsessionId: number) => {
    // First check in the series races data
    let race = data?.races.find((r) => r.subsessionId === subsessionId);

    // If not found, check in the schedule's week results
    if (!race) {
      for (const week of weekResults) {
        race = week.allResults.find((r) => r.subsessionId === subsessionId);
        if (race) break;
      }
    }

    if (race) {
      setSelectedRace(race);
      setModalOpen(true);
    }
  };

  if (!customerId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <EmptyState
            variant="no-driver"
            description="Enter a Customer ID to view series statistics."
            action={{
              label: 'Go to Dashboard',
              onClick: () => router.push('/'),
            }}
          />
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <SeriesDetailSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <EmptyState
            variant={error ? 'error' : 'no-series'}
            title={error ? 'Error Loading Series' : 'No Race Data'}
            description={
              error
                ? 'We encountered an error loading series data. Please try again.'
                : 'No race data found for this series in the current season.'
            }
            action={{
              label: 'Back to Dashboard',
              onClick: () => router.push('/'),
            }}
          />
        </Card>
      </div>
    );
  }

  const { races, seriesName, stats } = data;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Series Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl">{seriesName}</CardTitle>
              <CardDescription>Season performance summary</CardDescription>
            </div>
            {/* Car selector for multi-car series */}
            {hasMultipleCars && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCarId(null)}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    selectedCarId === null
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  All Cars ({data?.races.length})
                </button>
                {carOptions.map((car) => (
                  <button
                    key={car.carId}
                    onClick={() => setSelectedCarId(car.carId)}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      selectedCarId === car.carId
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {car.carName} ({car.raceCount})
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Races & Points */}
            <StatGroup title="Season">
              <StatBox label="Races" value={filteredStats?.totalRaces ?? 0} size="large" />
              <StatBox label="Points" value={filteredStats?.totalPoints ?? 0} size="large" />
            </StatGroup>

            {/* Position Stats */}
            <StatGroup title="Positions">
              <StatBox label="Avg Finish" value={filteredStats?.avgFinish ?? 0} />
              <StatBox label="Avg Start" value={filteredStats?.avgStart ?? 0} />
              <StatBox
                label="Best"
                value={`P${filteredStats?.bestFinish ?? '-'}`}
                highlight="green"
              />
              <StatBox
                label="Worst"
                value={`P${filteredStats?.worstFinish ?? '-'}`}
                highlight="red"
              />
            </StatGroup>

            {/* Highlights */}
            <StatGroup title="Highlights">
              <StatBox
                label="Wins"
                value={filteredStats?.wins ?? 0}
                highlight={(filteredStats?.wins ?? 0) > 0 ? 'gold' : undefined}
              />
              <StatBox
                label="Podiums"
                value={filteredStats?.podiums ?? 0}
                highlight={(filteredStats?.podiums ?? 0) > 0 ? 'bronze' : undefined}
              />
              <StatBox label="Top 5s" value={filteredStats?.top5s ?? 0} />
            </StatGroup>

            {/* Incidents & Field */}
            <StatGroup title="Race Quality">
              <StatBox label="Avg Inc" value={`${filteredStats?.avgIncidents ?? 0}x`} />
              <StatBox label="Total Inc" value={`${filteredStats?.totalIncidents ?? 0}x`} />
              <StatBox label="Avg SoF" value={(filteredStats?.avgSoF ?? 0).toLocaleString()} />
            </StatGroup>
          </div>
        </CardContent>
      </Card>

      {/* Finish Position Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Finish Position Trend</CardTitle>
          <CardDescription>
            Your finishing positions over recent races (lower is better)
            {selectedCarId && carOptions.find((c) => c.carId === selectedCarId) && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                · {carOptions.find((c) => c.carId === selectedCarId)?.carName}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FinishPositionChart races={carFilteredRaces} />
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'schedule' ? 'default' : 'outline'}
            onClick={() => setViewMode('schedule')}
            size="sm"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Season Schedule
          </Button>
          <Button
            variant={viewMode === 'results' ? 'default' : 'outline'}
            onClick={() => setViewMode('results')}
            size="sm"
          >
            <ListIcon className="mr-2 h-4 w-4" />
            Race Results
          </Button>
        </div>
        {filteredSeasonStats.seasonTotal > 0 && (
          <div className="flex items-center gap-4 rounded-lg bg-green-50 dark:bg-green-950/30 px-4 py-2">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Season Total ({filteredSeasonStats.weeksCounting}/8 weeks counting)
            </div>
            <div className="text-xl font-bold text-green-700 dark:text-green-400">
              {filteredSeasonStats.seasonTotal} pts
            </div>
          </div>
        )}
      </div>

      {/* Season Schedule View */}
      {viewMode === 'schedule' && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Season Schedule</CardTitle>
                <CardDescription>
                  12-week season grid with best results per week
                  {selectedCarId && carOptions.find((c) => c.carId === selectedCarId) && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      · {carOptions.find((c) => c.carId === selectedCarId)?.carName}
                    </span>
                  )}
                </CardDescription>
              </div>
              {carFilteredWeekResults.length > 0 && (
                <SeasonProgressBadge weekResults={carFilteredWeekResults} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {scheduleLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : carFilteredWeekResults.length > 0 ? (
              <SeasonScheduleTable
                weekResults={carFilteredWeekResults}
                onRaceClick={handleRaceClick}
              />
            ) : (
              <EmptyState
                variant="no-results"
                title="No Schedule Data"
                description="Schedule data is not available for this series."
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Race Results Table */}
      {viewMode === 'results' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Race Results</CardTitle>
                <CardDescription>
                  Click a race for details · Select races to compare
                </CardDescription>
              </div>
              {selectedRaceIds.length >= 2 && (
                <Button onClick={() => setComparisonOpen(true)}>
                  Compare {selectedRaceIds.length} Races
                </Button>
              )}
            </div>
            {selectedRaceIds.length === 1 && (
              <p className="text-sm text-zinc-500 mt-2">Select at least one more race to compare</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <RaceFiltersBar
              filters={filters}
              onFiltersChange={setFilters}
              totalRaces={races.length}
              filteredCount={filteredRaces.length}
            />
            {filteredRaces.length > 0 ? (
              <RaceResultsTable
                races={filteredRaces}
                onRaceClick={handleRaceClick}
                selectable
                selectedRaces={selectedRaceIds}
                onSelectionChange={setSelectedRaceIds}
              />
            ) : (
              <EmptyState
                variant="no-results"
                title="No Matching Races"
                description="No races match your current filters. Try adjusting your search criteria."
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Race Detail Modal */}
      <RaceDetailModal
        race={selectedRace}
        customerId={customerId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Race Comparison Modal */}
      <RaceComparison
        races={selectedRacesForComparison}
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
      />
    </div>
  );
}

interface StatGroupProps {
  title: string;
  children: React.ReactNode;
}

function StatGroup({ title, children }: StatGroupProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: string | number;
  highlight?: 'green' | 'gold' | 'red' | 'bronze';
  size?: 'default' | 'large';
}

function StatBox({ label, value, highlight, size = 'default' }: StatBoxProps) {
  const highlightClass =
    highlight === 'green'
      ? 'text-green-600 dark:text-green-400'
      : highlight === 'gold'
        ? 'text-yellow-500 dark:text-yellow-400'
        : highlight === 'red'
          ? 'text-red-500 dark:text-red-400'
          : highlight === 'bronze'
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-zinc-900 dark:text-zinc-100';

  const valueClass = size === 'large' ? 'text-2xl' : 'text-lg';

  return (
    <div className="text-center">
      <div className={`font-bold ${valueClass} ${highlightClass}`}>{value}</div>
      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</div>
    </div>
  );
}

function SeriesDetailSkeleton() {
  return (
    <>
      <Skeleton className="mb-4 h-5 w-32" />
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="mx-auto h-8 w-12 mb-1" />
                <Skeleton className="mx-auto h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    </>
  );
}

function SeasonProgressBadge({ weekResults }: { weekResults: WeekResult[] }) {
  // Count completed weeks + active week (if raced)
  const raced = weekResults.filter(
    (w) => w.status === 'completed' || (w.status === 'active' && w.bestResult)
  ).length;
  const skipped = weekResults.filter((w) => w.status === 'skipped').length;

  return (
    <div className="text-right">
      <div className="text-sm font-medium">
        {raced} / {weekResults.length} weeks
      </div>
      <div className="text-xs text-zinc-500">{skipped > 0 && `${skipped} skipped`}</div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  );
}
