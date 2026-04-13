'use client';

import { V2Shell } from '@/components/v2/V2Shell';
import { RaceLog } from '@/components/v2/RaceLog';

export default function V2RacesPage() {
  return <V2Shell>{(customerId) => <RaceLog customerId={customerId} />}</V2Shell>;
}
