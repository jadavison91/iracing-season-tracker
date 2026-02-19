'use client';

import { useQuery } from '@tanstack/react-query';
import { MemberSummary, License } from '@/lib/iracing/types';
import { USE_MOCK_DATA, mockMemberSummary } from '@/lib/mock-data';

/**
 * Safely convert to number with fallback
 */
function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * Transform iRacing API license data (snake_case) to our format (camelCase)
 */
function transformLicense(raw: Record<string, unknown>): License {
  // Safety rating comes as a decimal (e.g., 3.41) but we store as integer (341)
  const sr = toNumber(raw.safety_rating ?? raw.safetyRating);
  const safetyRating = sr < 10 ? Math.round(sr * 100) : sr;

  return {
    categoryId: toNumber(raw.category_id ?? raw.categoryId),
    category: String(raw.category ?? 'road'),
    licenseLevel: toNumber(raw.license_level ?? raw.licenseLevel),
    safetyRating: safetyRating,
    iRating: toNumber(raw.irating ?? raw.iRating),
    color: '#' + String(raw.color ?? '000000').replace('#', ''),
    groupName: String(raw.group_name ?? raw.groupName ?? 'R').replace('Class ', '').replace('Rookie', 'R'),
  };
}

/**
 * Transform iRacing API member summary to our format
 * Note: licenses comes as an object keyed by category name, not an array
 */
function transformMemberSummary(raw: Record<string, unknown>): MemberSummary {
  // Licenses is an object like { oval: {...}, sports_car: {...}, dirt_road: {...} }
  const licensesObj = (raw.licenses ?? {}) as Record<string, Record<string, unknown>>;
  const licenses = Object.values(licensesObj).map(transformLicense);

  // Club info might be in flair fields
  const clubName = String(
    raw.club_name ?? raw.clubName ?? raw.flair_name ?? 'Unknown Club'
  );

  // Helmet colors
  const helmetRaw = raw.helmet as Record<string, unknown> | undefined;
  const helmet = helmetRaw ? {
    color1: String(helmetRaw.color1 ?? '5a5a5a'),
    color2: String(helmetRaw.color2 ?? '333333'),
    color3: String(helmetRaw.color3 ?? 'ffffff'),
  } : undefined;

  return {
    custId: toNumber(raw.cust_id ?? raw.custId),
    displayName: String(raw.display_name ?? raw.displayName ?? 'Unknown Driver'),
    clubId: toNumber(raw.club_id ?? raw.clubId ?? raw.flair_id),
    clubName: clubName,
    licenses: licenses,
    helmet: helmet,
  };
}

async function fetchDriverSummary(customerId: number): Promise<MemberSummary> {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { ...mockMemberSummary, custId: customerId };
  }

  const response = await fetch(`/api/driver/${customerId}/summary`);
  if (!response.ok) {
    throw new Error(`Failed to fetch driver summary: ${response.status}`);
  }
  const data = await response.json();

  // Log raw response for debugging
  console.log('[useDriverSummary] Raw API response:', JSON.stringify(data, null, 2));

  // The API might return data nested under different keys
  // Try to find the actual member data
  const memberData = data.member ?? data.members?.[0] ?? data.summary ?? data;

  return transformMemberSummary(memberData);
}

export function useDriverSummary(customerId: number | null) {
  return useQuery({
    queryKey: ['driverSummary', customerId],
    queryFn: () => fetchDriverSummary(customerId!),
    enabled: customerId !== null && customerId > 0,
  });
}
