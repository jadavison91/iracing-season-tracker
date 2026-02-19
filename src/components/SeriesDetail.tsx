'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSeriesRaces } from '@/hooks';
import { FinishPositionChart } from '@/components/charts/FinishPositionChart';
import { RaceResultsTable } from '@/components/RaceResultsTable';
import { RaceDetailModal } from '@/components/RaceDetailModal';
import { RaceComparison } from '@/components/RaceComparison';
import { RaceFiltersBar, RaceFilters, defaultFilters, applyRaceFilters } from '@/components/RaceFilters';
import { EmptyState } from '@/components/EmptyState';
import { RecentRace } from '@/lib/iracing/types';

interface SeriesDetailProps {
  customerId: number | null;
  seriesId: number;
}

export function SeriesDetail({ customerId, seriesId }: SeriesDetailProps) {
  const router = useRouter();
  const { data, isLoading, error } = useSeriesRaces(customerId, seriesId);
  const [selectedRace, setSelectedRace] = useState<RecentRace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRaceIds, setSelectedRaceIds] = useState<number[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [filters, setFilters] = useState<RaceFilters>(defaultFilters);

  const selectedRacesForComparison = data?.races.filter((r) =>
    selectedRaceIds.includes(r.subsessionId)
  ) || [];

  const filteredRaces = data?.races ? applyRaceFilters(data.races, filters) : [];

  const handleRaceClick = (subsessionId: number) => {
    const race = data?.races.find((r) => r.subsessionId === subsessionId);
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

      {/* Race Results Table */}
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
