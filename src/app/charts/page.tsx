'use client';

import { AppShell } from '@/components/AppShell';
import { ChartsView } from '@/components/ChartsView';

export default function ChartsPage() {
  return (
    <AppShell>
      {(customerId) => <ChartsView customerId={customerId} />}
    </AppShell>
  );
}
