'use client';

import { V2Shell } from '@/components/v2/V2Shell';
import { SeriesRowPreview } from '@/components/v2/SeriesRowPreview';

export default function V2TestPage() {
  return <V2Shell>{(customerId) => <SeriesRowPreview customerId={customerId} />}</V2Shell>;
}
