'use client';

import { AppShell } from '@/components/AppShell';
import { OpponentsView } from '@/components/OpponentsView';

export default function OpponentsPage() {
  return <AppShell>{(customerId) => <OpponentsView customerId={customerId} />}</AppShell>;
}
