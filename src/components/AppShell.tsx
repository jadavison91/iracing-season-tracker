'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { useRecentDrivers } from '@/hooks';
import { MOCK_CUSTOMER_ID, USE_MOCK_DATA } from '@/lib/mock-data';

interface AppShellProps {
  children: (customerId: number | null) => ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [customerId, setCustomerId] = useState<number | null>(null);
  const { getDefaultCustId, isLoaded } = useRecentDrivers();

  // Set initial customer ID on mount
  useEffect(() => {
    if (isLoaded) {
      const defaultId = getDefaultCustId();
      if (defaultId) {
        setCustomerId(defaultId);
      } else if (USE_MOCK_DATA) {
        // Use mock customer ID in development
        setCustomerId(MOCK_CUSTOMER_ID);
      }
    }
  }, [isLoaded, getDefaultCustId]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header customerId={customerId} onCustomerIdChange={setCustomerId} />
      <main>{children(customerId)}</main>
    </div>
  );
}
