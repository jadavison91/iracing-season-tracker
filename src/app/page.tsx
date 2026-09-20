'use client';

import { V2Shell } from '@/components/v2/V2Shell';
import { SeasonHQ } from '@/components/v2/SeasonHQ';

export default function Home() {
  return <V2Shell>{(customerId) => <SeasonHQ customerId={customerId} />}</V2Shell>;
}
