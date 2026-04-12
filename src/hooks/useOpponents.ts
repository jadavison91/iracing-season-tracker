'use client';

import { useState, useEffect } from 'react';
import { getOpponents, clearOpponents, Opponent } from '@/lib/opponents';
import { useDriverData } from '@/contexts/DriverDataContext';

export function useOpponents() {
  const { data: driverData } = useDriverData();
  const customerId = driverData.customerId;
  const [opponents, setOpponents] = useState<Opponent[]>([]);

  // Re-read from localStorage when driver changes or race data is refreshed
  useEffect(() => {
    if (customerId) {
      setOpponents(getOpponents(customerId));
    } else {
      setOpponents([]);
    }
  }, [customerId, driverData.lastFetched]);

  function refresh() {
    if (customerId) setOpponents(getOpponents(customerId));
  }

  function clear() {
    if (customerId) {
      clearOpponents(customerId);
      setOpponents([]);
    }
  }

  return { opponents, refresh, clear };
}
