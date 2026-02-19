'use client';

import { use } from 'react';
import { AppShell } from '@/components/AppShell';
import { SeriesDetail } from '@/components/SeriesDetail';

interface SeriesPageProps {
  params: Promise<{ seriesId: string }>;
}

export default function SeriesPage({ params }: SeriesPageProps) {
  const { seriesId } = use(params);
  const seriesIdNum = parseInt(seriesId, 10);

  return (
    <AppShell>
      {(customerId) => <SeriesDetail customerId={customerId} seriesId={seriesIdNum} />}
    </AppShell>
  );
}
