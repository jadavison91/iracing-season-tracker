'use client';

import { useState, useEffect, useCallback } from 'react';
import { DriverProfile } from '@/lib/iracing/types';

const STORAGE_KEY = 'iracing-recent-drivers';
const MAX_RECENT_DRIVERS = 10;

interface RecentDriversState {
  drivers: DriverProfile[];
  defaultCustId: number | null;
}

function loadFromStorage(): RecentDriversState {
  if (typeof window === 'undefined') {
    return { drivers: [], defaultCustId: null };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load recent drivers from localStorage:', e);
  }

  return { drivers: [], defaultCustId: null };
}

function saveToStorage(state: RecentDriversState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save recent drivers to localStorage:', e);
  }
}

export function useRecentDrivers() {
  const [state, setState] = useState<RecentDriversState>({
    drivers: [],
    defaultCustId: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadFromStorage();
    setState(loaded);
    setIsLoaded(true);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(state);
    }
  }, [state, isLoaded]);

  const addDriver = useCallback((driver: DriverProfile) => {
    setState((prev) => {
      // Remove if already exists
      const filtered = prev.drivers.filter((d) => d.custId !== driver.custId);

      // Add to front with updated lastViewed
      const updated = [
        { ...driver, lastViewed: new Date() },
        ...filtered,
      ].slice(0, MAX_RECENT_DRIVERS);

      return { ...prev, drivers: updated };
    });
  }, []);

  const removeDriver = useCallback((custId: number) => {
    setState((prev) => ({
      ...prev,
      drivers: prev.drivers.filter((d) => d.custId !== custId),
      defaultCustId: prev.defaultCustId === custId ? null : prev.defaultCustId,
    }));
  }, []);

  const setDefaultDriver = useCallback((custId: number | null) => {
    setState((prev) => ({ ...prev, defaultCustId: custId }));
  }, []);

  const getDefaultCustId = useCallback((): number | null => {
    // Check for environment variable default first
    const envDefault = process.env.NEXT_PUBLIC_DEFAULT_CUSTOMER_ID;
    if (envDefault && !state.defaultCustId) {
      return parseInt(envDefault, 10);
    }
    return state.defaultCustId;
  }, [state.defaultCustId]);

  return {
    drivers: state.drivers,
    defaultCustId: state.defaultCustId,
    isLoaded,
    addDriver,
    removeDriver,
    setDefaultDriver,
    getDefaultCustId,
  };
}
