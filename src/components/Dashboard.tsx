'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="container mx-auto px-4 py-8">
        <Card>
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
    <div className="container mx-auto px-4 py-8">
      {/* Driver Profile Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Driver Profile</CardTitle>
          <CardDescription>
            {isLoadingDriver
              ? 'Loading driver data...'
              : driverData
                ? `${driverData.clubName} Club`
                : 'Driver information'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDriver ? (
            <DriverProfileSkeleton />
          ) : driverData ? (
            <DriverProfile data={driverData} />
          ) : (
            <EmptyState
              variant="error"
              title="Unable to Load Driver"
              description="We couldn't find data for this Customer ID. Please verify the ID is correct."
            />
          )}
        </CardContent>
      </Card>

      {/* Active Series */}
      <h2 className="mb-4 text-lg font-semibold">Active Series</h2>
      {isLoadingSeries ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SeriesCardSkeleton key={i} />
          ))}
        </div>
      ) : activeSeries && activeSeries.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeSeries.map((series) => (
            <SeriesCard key={series.seriesId} series={series} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState variant="no-races" />
        </Card>
      )}
    </div>
  );
}

function DriverProfile({ data }: { data: NonNullable<ReturnType<typeof useDriverSummary>['data']> }) {
  // Get license colors
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
      default:
        return category;
    }
  };

  const displayName = data.displayName || 'Unknown Driver';
  const clubName = data.clubName || 'Unknown Club';

  // Use helmet color1 for avatar background, default to a neutral gray
  const helmetColor = data.helmet?.color1 ? `#${data.helmet.color1}` : '#5a5a5a';

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-full"
          style={{ backgroundColor: helmetColor }}
          title={`Helmet color: ${helmetColor}`}
        />
        <div>
          <h3 className="text-xl font-semibold">{displayName}</h3>
          <p className="text-sm text-zinc-500">{clubName}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 sm:ml-auto">
        {(data.licenses || []).map((license) => (
          <div
            key={license.categoryId}
            className="flex flex-col items-center rounded-lg border bg-white p-3 dark:bg-zinc-800"
          >
            <span className="text-xs text-zinc-500 mb-1">{getCategoryLabel(license.category)}</span>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white ${getLicenseColor(license.groupName)}`}
              >
                {license.groupName}
              </span>
              <span className="text-sm">{formatSafetyRating(license.safetyRating)}</span>
            </div>
            <span className="text-lg font-bold mt-1">{formatIRating(license.iRating)}</span>
            <span className="text-xs text-zinc-500">iRating</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DriverProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 sm:ml-auto">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function SeriesCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
