'use client';

import { V2Shell } from '@/components/v2/V2Shell';
import { RivalsView } from '@/components/v2/RivalsView';

export default function RivalsPage() {
  return <V2Shell>{(customerId) => <RivalsView customerId={customerId} />}</V2Shell>;
}
