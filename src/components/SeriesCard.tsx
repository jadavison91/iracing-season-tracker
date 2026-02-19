'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActiveSeriesData } from '@/hooks/useActiveSeries';

interface SeriesCardProps {
  series: ActiveSeriesData;
}

export function SeriesCard({ series }: SeriesCardProps) {
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'road':
        return { label: 'Road', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
      case 'oval':
        return { label: 'Oval', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
      case 'dirt_road':
        return { label: 'Dirt Road', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
      case 'dirt_oval':
        return { label: 'Dirt Oval', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' };
      default:
        return { label: category, className: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200' };
    }
  };

  const categoryBadge = getCategoryBadge(series.category);

  return (
    <Link href={`/series/${series.seriesId}`}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">{series.seriesName}</CardTitle>
          </div>
          <CardDescription className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryBadge.className}`}
            >
              {categoryBadge.label}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{series.racesEntered || 0}</div>
              <div className="text-xs text-zinc-500">Races</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{isNaN(series.avgFinish) ? '-' : series.avgFinish}</div>
              <div className="text-xs text-zinc-500">Avg Finish</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{isNaN(series.totalPoints) ? 0 : series.totalPoints}</div>
              <div className="text-xs text-zinc-500">Points</div>
            </div>
          </div>

          <div className="mt-4 flex justify-between text-xs text-zinc-500">
            <span>
              Best: P{isNaN(series.bestFinish) ? '-' : series.bestFinish}
            </span>
            <span>
              Worst: P{isNaN(series.worstFinish) ? '-' : series.worstFinish}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
