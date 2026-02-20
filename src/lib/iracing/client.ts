import { getAuthHeaders, IRacingAuthError } from './auth';
import {
  IRacingApiResponse,
  MemberSummary,
  RecentRace,
  Series,
  SubsessionResult,
  SeasonStanding,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.IRACING_API_BASE_URL || 'https://members-ng.iracing.com/data';

// Rate limiting: iRacing recommends max 1 request per second
const MIN_REQUEST_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 0 : 1000;
let lastRequestTime = 0;

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Reset the rate limiter (for testing)
 */
export function resetRateLimiter(): void {
  lastRequestTime = 0;
}

/**
 * Wait if necessary to respect rate limits
 */
async function waitForRateLimit(): Promise<void> {
  if (MIN_REQUEST_INTERVAL_MS === 0) return; // Skip in test environment

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

// ============================================================================
// API Client Error
// ============================================================================

export class IRacingApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'IRacingApiError';
  }
}

// ============================================================================
// Core Fetch Functions
// ============================================================================

/**
 * Make an authenticated request to the iRacing API
 * This handles the two-step fetch process:
 * 1. Request endpoint returns a signed S3 URL
 * 2. Fetch actual data from the signed URL
 */
async function fetchFromApi<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  await waitForRateLimit();

  // Build URL with query params
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  }

  // Get auth headers
  const headers = await getAuthHeaders();

  // Step 1: Request the signed URL
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      ...headers,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API request failed: ${response.status}`;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch {
      // Use default error message
    }

    // Handle specific error codes
    if (response.status === 401) {
      throw new IRacingAuthError('Unauthorized - token may be invalid', 401);
    }

    if (response.status === 429) {
      throw new IRacingApiError('Rate limit exceeded', 429, endpoint);
    }

    throw new IRacingApiError(errorMessage, response.status, endpoint);
  }

  const linkResponse: IRacingApiResponse<T> = await response.json();

  // Debug log the response
  console.log(`[fetchFromApi] ${endpoint} response:`, JSON.stringify(linkResponse, null, 2).slice(0, 1000));

  // Step 2: Fetch actual data from signed URL
  if (!linkResponse.link) {
    throw new IRacingApiError(`API response missing data link. Got: ${JSON.stringify(linkResponse).slice(0, 200)}`, undefined, endpoint);
  }

  const dataResponse = await fetch(linkResponse.link);

  if (!dataResponse.ok) {
    throw new IRacingApiError(
      `Failed to fetch data from signed URL: ${dataResponse.status}`,
      dataResponse.status,
      endpoint
    );
  }

  return dataResponse.json();
}

// ============================================================================
// Member/Driver Endpoints
// ============================================================================

// Cache the authenticated user's cust_id
let authenticatedCustId: number | null = null;

/**
 * Get member info (profile, licenses)
 * @param custId - Customer ID of the driver
 */
export async function getMemberSummary(custId: number): Promise<MemberSummary> {
  // First, get the authenticated user's ID if we don't have it
  if (authenticatedCustId === null) {
    try {
      const myInfo = await fetchFromApi<Record<string, unknown>>('/member/info');
      authenticatedCustId = Number(myInfo.cust_id);
      console.log('[getMemberSummary] Authenticated user cust_id:', authenticatedCustId);

      // If requesting our own profile, return this result
      if (custId === authenticatedCustId) {
        return myInfo as unknown as MemberSummary;
      }
    } catch (error) {
      console.log('[getMemberSummary] /member/info failed:', error);
    }
  } else if (custId === authenticatedCustId) {
    // We know this is the authenticated user, use /member/info
    const result = await fetchFromApi<Record<string, unknown>>('/member/info');
    return result as unknown as MemberSummary;
  }

  // For other drivers, use /member/get with cust_ids parameter
  console.log('[getMemberSummary] Looking up driver:', custId);
  try {
    const result = await fetchFromApi<{ members: Record<string, unknown>[] }>('/member/get', {
      cust_ids: custId.toString(),
      include_licenses: 'true',
    });
    console.log('[getMemberSummary] /member/get response:', JSON.stringify(result, null, 2).slice(0, 1000));

    if (result.members && result.members.length > 0) {
      return result.members[0] as unknown as MemberSummary;
    }
  } catch (error) {
    console.log('[getMemberSummary] /member/get failed, trying /lookup/drivers');
  }

  // Fallback to lookup/drivers endpoint
  const lookupResult = await fetchFromApi<Record<string, unknown>[]>('/lookup/drivers', {
    search_term: custId.toString(),
    lc: custId.toString(),
  });
  console.log('[getMemberSummary] /lookup/drivers response:', JSON.stringify(lookupResult, null, 2));

  return (lookupResult?.[0] ?? {}) as unknown as MemberSummary;
}

/**
 * Get recent races for a member
 * @param custId - Customer ID of the driver
 */
export async function getMemberRecentRaces(custId: number): Promise<{ races: RecentRace[] }> {
  return fetchFromApi<{ races: RecentRace[] }>('/stats/member_recent_races', {
    cust_id: custId.toString(),
  });
}

/**
 * Get member career stats
 * @param custId - Customer ID of the driver
 */
export async function getMemberCareerStats(
  custId: number
): Promise<{ stats: Record<string, unknown>[] }> {
  return fetchFromApi<{ stats: Record<string, unknown>[] }>('/stats/member_career', {
    cust_id: custId.toString(),
  });
}

/**
 * Search for race results within a date range
 * This returns all races for a member in the specified time period
 * The search endpoint uses chunked responses that need separate fetching
 * @param custId - Customer ID of the driver
 * @param startDate - Start of date range (ISO string)
 * @param endDate - End of date range (ISO string)
 * @param officialOnly - Only return official races (default: true)
 */
export async function searchMemberResults(
  custId: number,
  startDate: string,
  endDate: string,
  officialOnly: boolean = true
): Promise<{ results: Record<string, unknown>[] }> {
  await waitForRateLimit();

  const params: Record<string, string> = {
    cust_id: custId.toString(),
    start_range_begin: startDate,
    start_range_end: endDate,
    event_types: '5', // Races only
  };

  if (officialOnly) {
    params.official_only = 'true';
  }

  // Build URL with query params
  const url = new URL(`${API_BASE_URL}/results/search_series`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  // Get auth headers
  const headers = await getAuthHeaders();

  // Step 1: Request the search metadata
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      ...headers,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new IRacingApiError(`Search request failed: ${response.status}`, response.status, '/results/search_series');
  }

  const searchResponse = await response.json();
  console.log('[searchMemberResults] Search response:', JSON.stringify(searchResponse, null, 2).slice(0, 500));

  // The search endpoint returns chunked results
  // Structure: { type: "search_series_results", data: { success: true, chunk_info: { base_download_url, num_chunks, rows } } }
  const chunkInfo = searchResponse.data?.chunk_info;

  if (!chunkInfo || !chunkInfo.base_download_url) {
    console.log('[searchMemberResults] No chunk_info found, returning empty results');
    return { results: [] };
  }

  // Fetch all chunks
  const allResults: Record<string, unknown>[] = [];

  console.log(`[searchMemberResults] chunk_info:`, JSON.stringify(chunkInfo, null, 2));
  console.log(`[searchMemberResults] Will fetch ${chunkInfo.num_chunks} chunks with ${chunkInfo.rows} total rows`);

  // The API provides chunk_file_names array with signed S3 URLs
  const chunkFileNames: string[] = chunkInfo.chunk_file_names || [];

  for (let i = 0; i < chunkInfo.num_chunks; i++) {
    // Use the provided chunk file name (includes AWS signing params)
    const chunkFileName = chunkFileNames[i];
    if (!chunkFileName) {
      console.error(`[searchMemberResults] Missing chunk file name for chunk ${i}`);
      continue;
    }

    const chunkUrl = `${chunkInfo.base_download_url}${chunkFileName}`;
    console.log(`[searchMemberResults] Fetching chunk ${i}: ${chunkUrl.slice(0, 150)}...`);

    const chunkResponse = await fetch(chunkUrl);
    console.log(`[searchMemberResults] Chunk ${i} response status: ${chunkResponse.status}`);

    if (!chunkResponse.ok) {
      const errorText = await chunkResponse.text();
      console.error(`[searchMemberResults] Failed to fetch chunk ${i}: ${chunkResponse.status} - ${errorText.slice(0, 200)}`);
      continue;
    }

    const chunkData = await chunkResponse.json();
    console.log(`[searchMemberResults] Chunk ${i} data type: ${typeof chunkData}, isArray: ${Array.isArray(chunkData)}, length: ${Array.isArray(chunkData) ? chunkData.length : 'N/A'}`);

    // Chunk data is typically an array of results
    if (Array.isArray(chunkData)) {
      allResults.push(...chunkData);
    } else if (chunkData.results && Array.isArray(chunkData.results)) {
      allResults.push(...chunkData.results);
    } else {
      console.log(`[searchMemberResults] Chunk ${i} unexpected format:`, JSON.stringify(chunkData).slice(0, 500));
    }
  }

  console.log(`[searchMemberResults] Fetched ${allResults.length} total results`);

  return { results: allResults };
}

// ============================================================================
// Series Endpoints
// ============================================================================

/**
 * Get all series
 */
export async function getSeries(): Promise<Series[]> {
  return fetchFromApi<Series[]>('/series/get');
}

/**
 * Get series assets (logos, etc.)
 */
export async function getSeriesAssets(): Promise<Record<string, { logo: string }>> {
  return fetchFromApi<Record<string, { logo: string }>>('/series/assets');
}

/**
 * Get series seasons with full schedule information
 * Note: The iRacing API returns ALL series seasons regardless of the series_id parameter,
 * so filtering must be done client-side.
 * @param seriesId - Series ID (optional - but filtering still needed on response)
 */
export async function getSeriesSeasons(seriesId?: number): Promise<Record<string, unknown>[]> {
  const params: Record<string, string> = {};
  if (seriesId !== undefined) {
    params.series_id = seriesId.toString();
  }
  return fetchFromApi<Record<string, unknown>[]>('/series/seasons', params);
}

// ============================================================================
// Season/Results Endpoints
// ============================================================================

/**
 * Get season standings
 * @param seasonId - Season ID
 * @param carClassId - Optional car class ID filter
 */
export async function getSeasonStandings(
  seasonId: number,
  carClassId?: number
): Promise<{ standings: SeasonStanding[] }> {
  const params: Record<string, string> = {
    season_id: seasonId.toString(),
  };

  if (carClassId) {
    params.car_class_id = carClassId.toString();
  }

  return fetchFromApi<{ standings: SeasonStanding[] }>('/stats/season_driver_standings', params);
}

/**
 * Get season results for a specific series
 * @param seasonId - Season ID
 * @param eventType - Event type (5 = race)
 * @param raceWeekNum - Optional race week number (0-indexed)
 */
export async function getSeasonResults(
  seasonId: number,
  eventType: number = 5,
  raceWeekNum?: number
): Promise<{ results: Record<string, unknown>[] }> {
  const params: Record<string, string> = {
    season_id: seasonId.toString(),
    event_type: eventType.toString(),
  };

  if (raceWeekNum !== undefined) {
    params.race_week_num = raceWeekNum.toString();
  }

  return fetchFromApi<{ results: Record<string, unknown>[] }>('/results/season_results', params);
}

// ============================================================================
// Subsession Endpoints
// ============================================================================

/**
 * Get detailed results for a specific subsession (race)
 * @param subsessionId - Subsession ID
 */
export async function getSubsessionResults(subsessionId: number): Promise<SubsessionResult> {
  return fetchFromApi<SubsessionResult>('/results/get', {
    subsession_id: subsessionId.toString(),
  });
}

/**
 * Get lap chart data for a subsession
 * @param subsessionId - Subsession ID
 * @param simSessionNumber - Session number (usually 0)
 */
export async function getSubsessionLapChart(
  subsessionId: number,
  simSessionNumber: number = 0
): Promise<{ lapData: Record<string, unknown>[] }> {
  return fetchFromApi<{ lapData: Record<string, unknown>[] }>('/results/lap_chart_data', {
    subsession_id: subsessionId.toString(),
    simsession_number: simSessionNumber.toString(),
  });
}

// ============================================================================
// Track Endpoints
// ============================================================================

/**
 * Get all tracks
 */
export async function getTracks(): Promise<Record<string, unknown>[]> {
  return fetchFromApi<Record<string, unknown>[]>('/track/get');
}

/**
 * Get track assets (images, etc.)
 */
export async function getTrackAssets(): Promise<Record<string, { logo: string; map: string }>> {
  return fetchFromApi<Record<string, { logo: string; map: string }>>('/track/assets');
}

// ============================================================================
// Car Endpoints
// ============================================================================

/**
 * Get all cars
 */
export async function getCars(): Promise<Record<string, unknown>[]> {
  return fetchFromApi<Record<string, unknown>[]>('/car/get');
}

// ============================================================================
// Constants/Lookup Endpoints
// ============================================================================

/**
 * Get all constants (categories, event types, etc.)
 */
export async function getConstants(): Promise<Record<string, unknown>> {
  return fetchFromApi<Record<string, unknown>>('/constants/get');
}
