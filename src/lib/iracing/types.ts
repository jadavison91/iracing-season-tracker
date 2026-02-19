// ============================================================================
// Authentication Types
// ============================================================================

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

// ============================================================================
// Driver/Member Types
// ============================================================================

export interface DriverProfile {
  custId: number;
  displayName: string;
  iRating: number;
  safetyRating: number;
  licenseClass: string;
  licenseLevel: number;
  clubName?: string;
  lastViewed?: Date;
}

export interface MemberSummary {
  custId: number;
  displayName: string;
  clubId: number;
  clubName: string;
  licenses: License[];
  helmet?: {
    color1: string;
    color2: string;
    color3: string;
  };
}

export interface License {
  categoryId: number;
  category: string; // "oval", "road", "dirt_oval", "dirt_road"
  licenseLevel: number;
  safetyRating: number;
  iRating: number;
  color: string;
  groupName: string; // "A", "B", "C", "D", "R"
}

// ============================================================================
// Race Result Types
// ============================================================================

export interface RecentRace {
  subsessionId: number;
  seasonId: number;
  seriesId: number;
  seriesName: string;
  sessionStartTime: string; // ISO date string
  eventType: number; // 2 = practice, 3 = qualify, 5 = race
  eventTypeName: string;
  trackId: number;
  trackName: string;
  startPosition: number;
  finishPosition: number;
  startPositionInClass: number;
  finishPositionInClass: number;
  carClassId: number;
  carClassName: string;
  carClassShortName: string;
  carId: number;
  carName: string;
  champPoints: number;
  clubPoints: number;
  incidents: number;
  lapsComplete: number;
  lapsLed: number;
  averageLap: number; // in hundredths of seconds
  bestLapTime: number; // in hundredths of seconds
  bestNlapsTime: number;
  newIRating: number;
  oldIRating: number;
  newSafetyRating: number;
  oldSafetyRating: number;
  strengthOfField: number;
  numDrivers: number;
  winnerName?: string;
  winnerCustId?: number;
}

export interface RaceResult {
  subsessionId: number;
  custId: number;
  sessionDate: Date;
  trackName: string;
  seriesName: string;
  seriesId: number;
  raceWeekNum: number;
  startingPosition: number;
  finishPosition: number;
  champPoints: number;
  incidents: number;
  fastestLapTime: number; // milliseconds
  subsessionFastestLap: number; // milliseconds
  lapTimeGap: number; // calculated: my lap - fastest lap
}

// ============================================================================
// Series Types
// ============================================================================

export interface Series {
  seriesId: number;
  seriesName: string;
  seriesShortName: string;
  categoryId: number;
  category: string;
  active: boolean;
  official: boolean;
  fixedSetup: boolean;
  logo?: string;
  schedules?: SeriesSchedule[];
}

export interface SeriesSchedule {
  seasonId: number;
  raceWeekNum: number;
  trackId: number;
  trackName: string;
  configName?: string;
}

export interface SeriesSummary {
  seriesId: number;
  seriesName: string;
  seasonId: number;
  custId: number;
  racesEntered: number;
  avgFinish: number;
  totalPoints: number;
  bestFinish: number;
  worstFinish: number;
}

export interface SeasonStanding {
  position: number;
  custId: number;
  displayName: string;
  clubName: string;
  division: number;
  points: number;
  starts: number;
  wins: number;
  top5: number;
  avgFinish: number;
  avgStart: number;
  lapsLed: number;
}

// ============================================================================
// Subsession (Detailed Race) Types
// ============================================================================

export interface SubsessionResult {
  subsessionId: number;
  seasonId: number;
  seriesId: number;
  seriesName: string;
  sessionId: number;
  eventType: number;
  startTime: string;
  trackId: number;
  trackName: string;
  trackConfigName?: string;
  strengthOfField: number;
  sessionResults: SessionResultEntry[];
  weather?: WeatherInfo;
}

export interface SessionResultEntry {
  custId: number;
  displayName: string;
  finishPosition: number;
  finishPositionInClass: number;
  startPosition: number;
  carId: number;
  carName: string;
  carClassId: number;
  carClassName: string;
  lapsComplete: number;
  lapsLed: number;
  incidents: number;
  champPoints: number;
  clubPoints: number;
  bestLapTime: number;
  averageLap: number;
  interval: number;
  newIRating: number;
  oldIRating: number;
  newSafetyRating: number;
  oldSafetyRating: number;
  reasonOut: string;
}

export interface WeatherInfo {
  tempValue: number;
  tempUnit: string;
  humidity: number;
  windSpeed: number;
  windDir: number;
  skies: number; // 0 = clear, 1 = partly cloudy, etc.
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface IRacingApiResponse<T> {
  link: string; // iRacing returns a signed S3 URL to fetch actual data
}

export interface IRacingError {
  error: string;
  message?: string;
  code?: number;
}

// ============================================================================
// localStorage Types (for recent drivers)
// ============================================================================

export interface RecentDrivers {
  drivers: DriverProfile[];
  defaultCustId: number | null;
}

// ============================================================================
// Utility Types
// ============================================================================

export type CategoryType = 'oval' | 'road' | 'dirt_oval' | 'dirt_road';

export type EventType = 'practice' | 'qualify' | 'race' | 'time_trial';

export const EVENT_TYPE_MAP: Record<number, EventType> = {
  2: 'practice',
  3: 'qualify',
  4: 'time_trial',
  5: 'race',
};

export const CATEGORY_MAP: Record<number, CategoryType> = {
  1: 'oval',
  2: 'road',
  3: 'dirt_oval',
  4: 'dirt_road',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert lap time from hundredths of seconds to readable format
 */
export function formatLapTime(hundredths: number): string {
  if (hundredths <= 0) return '--';

  const totalSeconds = hundredths / 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  }
  return seconds.toFixed(3);
}

/**
 * Convert lap time from hundredths to milliseconds
 */
export function hundredthsToMs(hundredths: number): number {
  return hundredths * 10;
}

/**
 * Format iRating with thousands separator
 */
export function formatIRating(iRating: number): string {
  return iRating.toLocaleString();
}

/**
 * Format safety rating (e.g., 3.45)
 */
export function formatSafetyRating(sr: number): string {
  return (sr / 100).toFixed(2);
}
