// Re-export all types
export * from './types';

// Re-export auth functions
export {
  authenticate,
  refreshAccessToken,
  getValidAccessToken,
  getAuthHeaders,
  isTokenValid,
  hasRefreshToken,
  clearTokenState,
  IRacingAuthError,
} from './auth';

// Re-export API client functions
export {
  getMemberSummary,
  getMemberRecentRaces,
  getMemberCareerStats,
  getMemberChartData,
  searchMemberResults,
  getSeries,
  getSeriesAssets,
  getSeriesSeasons,
  getSeasonStandings,
  getSeasonResults,
  getSubsessionResults,
  getSubsessionLapChart,
  getTracks,
  getTrackAssets,
  getCars,
  getConstants,
  IRacingApiError,
} from './client';

// Re-export chart data types
export type { IRatingChartDataPoint, MemberChartData } from './client';
