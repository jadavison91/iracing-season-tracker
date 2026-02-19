'use client';

import { AppShell } from '@/components/AppShell';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  return (
    <AppShell>
      {(customerId) => <Dashboard customerId={customerId} />}
    </AppShell>
  );
}
