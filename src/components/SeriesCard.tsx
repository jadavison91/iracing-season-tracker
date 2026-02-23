'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActiveSeriesData } from '@/hooks/useActiveSeries';
import { useCarAssets, getCarImageUrl } from '@/hooks';

interface SeriesCardProps {
  series: ActiveSeriesData;
}

export function SeriesCard({ series }: SeriesCardProps) {
  const { data: carAssets } = useCarAssets();

  // Get car asset for the most driven car in this series
  const carAsset = series.carId ? carAssets?.[series.carId.toString()] : undefined;
  const carImageUrl = getCarImageUrl(carAsset, 'small');

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
      <Card className="group h-full cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-600">
        {/* Car Image Banner or Fallback */}
        <div className="relative h-20 w-full bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-700">
          {carImageUrl ? (
            <>
              <Image
                src={carImageUrl}
                alt={series.carName || 'Car'}
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 350px"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl opacity-20">🏁</span>
            </div>
          )}
          {series.carName && carImageUrl && (
            <div className="absolute bottom-1.5 left-2.5 text-[11px] text-white/90 font-medium truncate max-w-[90%]">
              {series.carName}
            </div>
          )}
          {/* Category badge overlaid on image */}
          <div className="absolute top-2 right-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm ${categoryBadge.className}`}
            >
              {categoryBadge.label}
            </span>
          </div>
        </div>

        <CardHeader className="px-3 py-2.5 pb-1.5">
          <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
            {series.seriesName}
          </CardTitle>
        </CardHeader>

        <CardContent className="px-3 pb-3 pt-0">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold">{series.racesEntered || 0}</div>
              <div className="text-[10px] text-zinc-500">Races</div>
            </div>
            <div>
              <div className="text-lg font-bold">{isNaN(series.avgFinish) ? '-' : series.avgFinish}</div>
              <div className="text-[10px] text-zinc-500">Avg Finish</div>
            </div>
            <div>
              <div className="text-lg font-bold">{isNaN(series.totalPoints) ? 0 : series.totalPoints}</div>
              <div className="text-[10px] text-zinc-500">Points</div>
            </div>
          </div>

          <div className="mt-2.5 flex justify-between gap-2">
            <span className="inline-flex items-center rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Best: P{isNaN(series.bestFinish) ? '-' : series.bestFinish}
            </span>
            <span className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Worst: P{isNaN(series.worstFinish) ? '-' : series.worstFinish}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
