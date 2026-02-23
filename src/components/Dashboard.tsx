'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDriverSummary, useActiveSeries } from '@/hooks';
import { formatIRating, formatSafetyRating } from '@/lib/iracing/types';
import { SeriesCard } from '@/components/SeriesCard';
import { EmptyState } from '@/components/EmptyState';

interface DashboardProps {
  customerId: number | null;
}

export function Dashboard({ customerId }: DashboardProps) {
  const { data: driverData, isLoading: isLoadingDriver } = useDriverSummary(customerId);
  const { data: activeSeries, isLoading: isLoadingSeries } = useActiveSeries(customerId);

  if (!customerId) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="border-dashed">
          <EmptyState variant="no-driver">
            <div className="mt-4 text-left">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                You can find your Customer ID in your iRacing profile URL:
              </p>
              <code className="mt-2 block rounded bg-zinc-100 p-2 text-sm dark:bg-zinc-800">
                https://members.iracing.com/membersite/member/CareerStats.do?custid=
                <span className="text-red-600">123456</span>
              </code>
            </div>
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Driver Hero Section */}
      <section className="mb-10 sm:mb-12">
        {isLoadingDriver ? (
          <DriverHeroSkeleton />
        ) : driverData ? (
          <DriverHero data={driverData} />
        ) : (
          <Card>
            <EmptyState
              variant="error"
              title="Unable to Load Driver"
              description="We couldn't find data for this Customer ID. Please verify the ID is correct."
            />
          </Card>
        )}
      </section>

      {/* Active Series Section */}
      <section>
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-xl font-semibold sm:text-2xl">Active Series</h2>
          {activeSeries && activeSeries.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {activeSeries.length}
            </span>
          )}
        </div>
        {isLoadingSeries ? (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SeriesCardSkeleton key={i} />
            ))}
          </div>
        ) : activeSeries && activeSeries.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeSeries.map((series) => (
              <SeriesCard key={series.seriesId} series={series} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <EmptyState variant="no-races" />
          </Card>
        )}
      </section>
    </div>
  );
}

function DriverHero({ data }: { data: NonNullable<ReturnType<typeof useDriverSummary>['data']> }) {
  const displayName = data.displayName || 'Unknown Driver';
  const clubName = data.clubName || 'Unknown Club';

  return (
    <div className="rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 p-5 dark:from-zinc-900 dark:to-zinc-800 sm:p-6">
      {/* Driver Identity */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {displayName}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{clubName}</p>
      </div>

      {/* License Cards */}
      <div className="flex gap-1.5 overflow-x-auto">
        {(data.licenses || []).map((license) => (
          <LicenseCard key={license.categoryId} license={license} />
        ))}
      </div>
    </div>
  );
}

interface LicenseCardProps {
  license: {
    categoryId: number;
    category: string;
    groupName: string;
    safetyRating: number;
    iRating: number;
  };
}

function LicenseCard({ license }: LicenseCardProps) {
  const getLicenseColor = (groupName: string) => {
    switch (groupName) {
      case 'A':
        return 'bg-blue-500';
      case 'B':
        return 'bg-green-500';
      case 'C':
        return 'bg-yellow-500';
      case 'D':
        return 'bg-orange-500';
      case 'R':
      default:
        return 'bg-red-500';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'road':
        return 'Road';
      case 'oval':
        return 'Oval';
      case 'dirt_road':
        return 'Dirt Road';
      case 'dirt_oval':
        return 'Dirt Oval';
      case 'sports_car':
        return 'Sports Car';
      case 'formula_car':
        return 'Formula';
      default:
        return category;
    }
  };

  return (
    <div className="flex w-[85px] flex-col items-center rounded-lg border border-zinc-200 bg-white px-1.5 py-2 dark:border-zinc-700 dark:bg-zinc-800">
      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mb-1">
        {getCategoryLabel(license.category)}
      </span>
      <div className="flex items-center gap-1 mb-0.5">
        <span
          className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded text-[9px] font-bold text-white ${getLicenseColor(license.groupName)}`}
        >
          {license.groupName}
        </span>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {formatSafetyRating(license.safetyRating)}
        </span>
      </div>
      <span className="text-lg font-bold">
        {formatIRating(license.iRating)}
      </span>
      <span className="text-[8px] text-zinc-400 dark:text-zinc-500">iRating</span>
    </div>
  );
}

function DriverHeroSkeleton() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 p-5 dark:from-zinc-900 dark:to-zinc-800 sm:p-6">
      <div className="mb-5 sm:mb-6">
        <Skeleton className="h-7 w-48 sm:w-64" />
        <Skeleton className="mt-1.5 h-4 w-32" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[72px] w-[85px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function SeriesCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-24 w-full rounded-none" />
      <CardContent className="pt-4">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/3 mb-4" />
        <div className="grid grid-cols-3 gap-4 text-center">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-7 w-10 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
