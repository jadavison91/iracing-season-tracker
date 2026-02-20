'use client';

import { useState } from 'react';
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
import { RaceFiltersBar, RaceFilters, defaultFilters, applyRaceFilters } from '@/components/RaceFilters';
import { SeasonScheduleTable } from '@/components/SeasonScheduleTable';
import { EmptyState } from '@/components/EmptyState';
import { RecentRace, WeekResult } from '@/lib/iracing/types';

type ViewMode = 'results' | 'schedule';

interface SeriesDetailProps {
  customerId: number | null;
  seriesId: number;
}

export function SeriesDetail({ customerId, seriesId }: SeriesDetailProps) {
  const router = useRouter();
  const { data, isLoading, error } = useSeriesRaces(customerId, seriesId);
  const { weekResults, seasonTotal, weeksCounting, isLoading: scheduleLoading } = useSeriesSchedule(customerId, seriesId);
  const [selectedRace, setSelectedRace] = useState<RecentRace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRaceIds, setSelectedRaceIds] = useState<number[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [filters, setFilters] = useState<RaceFilters>(defaultFilters);
  const [viewMode, setViewMode] = useState<ViewMode>('schedule');

  const selectedRacesForComparison = data?.races.filter((r) =>
    selectedRaceIds.includes(r.subsessionId)
  ) || [];

  const filteredRaces = data?.races ? applyRaceFilters(data.races, filters) : [];

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
          <CardTitle className="text-2xl">{seriesName}</CardTitle>
          <CardDescription>Season performance summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            <StatBox label="Races" value={stats.totalRaces} />
            <StatBox label="Points" value={stats.totalPoints} />
            <StatBox label="Avg Finish" value={stats.avgFinish} />
            <StatBox label="Avg Start" value={stats.avgStart} />
            <StatBox label="Best" value={`P${stats.bestFinish}`} highlight="green" />
            <StatBox label="Worst" value={`P${stats.worstFinish}`} />
            <StatBox label="Wins" value={stats.wins} highlight={stats.wins > 0 ? 'gold' : undefined} />
            <StatBox label="Podiums" value={stats.podiums} />
            <StatBox label="Top 5s" value={stats.top5s} />
            <StatBox label="Avg Inc" value={`${stats.avgIncidents}x`} />
            <StatBox label="Total Inc" value={`${stats.totalIncidents}x`} />
            <StatBox label="Avg SoF" value={stats.avgSoF.toLocaleString()} />
          </div>
        </CardContent>
      </Card>

      {/* Finish Position Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Finish Position Trend</CardTitle>
          <CardDescription>Your finishing positions over recent races (lower is better)</CardDescription>
        </CardHeader>
        <CardContent>
          <FinishPositionChart races={races} />
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
        {seasonTotal > 0 && (
          <div className="flex items-center gap-4 rounded-lg bg-green-50 dark:bg-green-950/30 px-4 py-2">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Season Total ({weeksCounting}/8 weeks counting)
            </div>
            <div className="text-xl font-bold text-green-700 dark:text-green-400">
              {seasonTotal} pts
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
                </CardDescription>
              </div>
              {weekResults.length > 0 && (
                <SeasonProgressBadge weekResults={weekResults} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {scheduleLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : weekResults.length > 0 ? (
              <SeasonScheduleTable
                weekResults={weekResults}
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
                <CardDescription>Click a race for details · Select races to compare</CardDescription>
              </div>
              {selectedRaceIds.length >= 2 && (
                <Button onClick={() => setComparisonOpen(true)}>
                  Compare {selectedRaceIds.length} Races
                </Button>
              )}
            </div>
            {selectedRaceIds.length === 1 && (
              <p className="text-sm text-zinc-500 mt-2">
                Select at least one more race to compare
              </p>
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

interface StatBoxProps {
  label: string;
  value: string | number;
  highlight?: 'green' | 'gold';
}

function StatBox({ label, value, highlight }: StatBoxProps) {
  const highlightClass =
    highlight === 'green'
      ? 'text-green-600 dark:text-green-400'
      : highlight === 'gold'
        ? 'text-yellow-600 dark:text-yellow-400'
        : '';

  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${highlightClass}`}>{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
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
  const completed = weekResults.filter((w) => w.status === 'completed').length;
  const skipped = weekResults.filter((w) => w.status === 'skipped').length;
  const total = weekResults.length;
  const raced = completed;

  return (
    <div className="text-right">
      <div className="text-sm font-medium">
        {raced} / {total - skipped} weeks
      </div>
      <div className="text-xs text-zinc-500">
        {skipped > 0 && `${skipped} skipped`}
      </div>
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
