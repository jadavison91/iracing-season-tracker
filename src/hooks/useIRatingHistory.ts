'use client';

import { useQuery } from '@tanstack/react-query';
import { USE_MOCK_DATA } from '@/lib/mock-data';

export interface IRatingDataPoint {
  when: string;
  value: number;
}

export interface IRatingHistoryData {
  categoryId: number;
  data: IRatingDataPoint[];
}

export type IRatingHistoryResponse = Record<string, IRatingHistoryData>;

// Mock data for development - dates align with current season (starting Dec 2025)
const mockIRatingHistory: IRatingHistoryResponse = {
  sports_car: {
    categoryId: 5,
    data: [
      // Pre-season data (should be filtered out)
      { when: '2025-11-15T00:00:00Z', value: 2450 },
      { when: '2025-12-01T00:00:00Z', value: 2480 },
      // Current season data (Dec 2025 onwards)
      { when: '2025-12-17T00:00:00Z', value: 2504 },
      { when: '2025-12-19T00:00:00Z', value: 2490 },
      { when: '2025-12-22T00:00:00Z', value: 2475 },
      { when: '2025-12-28T00:00:00Z', value: 2510 },
      { when: '2026-01-03T00:00:00Z', value: 2545 },
      { when: '2026-01-10T00:00:00Z', value: 2560 },
      { when: '2026-01-17T00:00:00Z', value: 2575 },
      { when: '2026-01-24T00:00:00Z', value: 2620 },
      { when: '2026-01-31T00:00:00Z', value: 2590 },
      { when: '2026-02-07T00:00:00Z', value: 2560 },
    ],
  },
  formula: {
    categoryId: 6,
    data: [],
  },
  oval: {
    categoryId: 1,
    data: [],
  },
  dirt_road: {
    categoryId: 4,
    data: [
      // Pre-season data (should be filtered out)
      { when: '2025-11-20T00:00:00Z', value: 1450 },
      // Current season data
      { when: '2025-12-20T00:00:00Z', value: 1500 },
      { when: '2025-12-27T00:00:00Z', value: 1545 },
      { when: '2026-01-05T00:00:00Z', value: 1590 },
      { when: '2026-01-12T00:00:00Z', value: 1620 },
      { when: '2026-01-19T00:00:00Z', value: 1680 },
      { when: '2026-01-26T00:00:00Z', value: 1720 },
      { when: '2026-02-02T00:00:00Z', value: 1762 },
    ],
  },
  dirt_oval: {
    categoryId: 3,
    data: [],
  },
};

async function fetchIRatingHistory(customerId: number): Promise<IRatingHistoryResponse> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockIRatingHistory;
  }

  const response = await fetch(`/api/driver/${customerId}/irating-history`);
  if (!response.ok) {
    throw new Error(`Failed to fetch iRating history: ${response.status}`);
  }
  return response.json();
}

export function useIRatingHistory(customerId: number | null) {
  return useQuery({
    queryKey: ['iRatingHistory', customerId],
    queryFn: () => fetchIRatingHistory(customerId!),
    enabled: customerId !== null && customerId > 0,
  });
}
