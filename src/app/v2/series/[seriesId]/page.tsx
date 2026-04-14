'use client';

import { use } from 'react';
import { V2Shell } from '@/components/v2/V2Shell';
import { SeriesFocus } from '@/components/v2/SeriesFocus';

interface SeriesFocusPageProps {
  params: Promise<{ seriesId: string }>;
}

export default function V2SeriesFocusPage({ params }: SeriesFocusPageProps) {
  const { seriesId } = use(params);
  const seriesIdNum = parseInt(seriesId, 10);

  return (
    <V2Shell>
      {(customerId) => <SeriesFocus customerId={customerId} seriesId={seriesIdNum} />}
    </V2Shell>
  );
}
