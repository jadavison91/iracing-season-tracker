'use client';

import { AppShell } from '@/components/AppShell';
import { RacesView } from '@/components/RacesView';

export default function RacesPage() {
  return <AppShell>{(customerId) => <RacesView customerId={customerId} />}</AppShell>;
}
