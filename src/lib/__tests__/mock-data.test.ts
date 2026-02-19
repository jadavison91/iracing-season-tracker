import {
  mockRecentRaces,
  mockSeries,
  mockDriverProfile,
  getSeriesSummaryFromRaces,
  getActiveSeriesFromRaces,
} from '../mock-data';

describe('Mock Data', () => {
  describe('Mock data integrity', () => {
    it('should have valid mock driver profile', () => {
      expect(mockDriverProfile.custId).toBeDefined();
      expect(mockDriverProfile.displayName).toBeDefined();
      expect(mockDriverProfile.iRating).toBeGreaterThan(0);
    });

    it('should have multiple mock races', () => {
      expect(mockRecentRaces.length).toBeGreaterThan(0);
    });

    it('should have multiple mock series', () => {
      expect(mockSeries.length).toBeGreaterThan(0);
    });

    it('should have valid race data structure', () => {
      const race = mockRecentRaces[0];
      expect(race.subsessionId).toBeDefined();
      expect(race.seriesId).toBeDefined();
      expect(race.seriesName).toBeDefined();
      expect(race.trackName).toBeDefined();
      expect(race.startPosition).toBeGreaterThan(0);
      expect(race.finishPosition).toBeGreaterThan(0);
      expect(race.champPoints).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSeriesSummaryFromRaces', () => {
    it('should return null for empty races', () => {
      expect(getSeriesSummaryFromRaces([], 1)).toBeNull();
    });

    it('should return null for non-existent series', () => {
      expect(getSeriesSummaryFromRaces(mockRecentRaces, 99999)).toBeNull();
    });

    it('should calculate correct stats for a series', () => {
      const seriesId = mockRecentRaces[0].seriesId;
      const summary = getSeriesSummaryFromRaces(mockRecentRaces, seriesId);

      expect(summary).not.toBeNull();
      expect(summary!.seriesId).toBe(seriesId);
      expect(summary!.racesEntered).toBeGreaterThan(0);
      expect(summary!.totalPoints).toBeGreaterThan(0);
      expect(summary!.bestFinish).toBeLessThanOrEqual(summary!.worstFinish);
    });
  });

  describe('getActiveSeriesFromRaces', () => {
    it('should return empty array for empty races', () => {
      expect(getActiveSeriesFromRaces([])).toEqual([]);
    });

    it('should return unique series from races', () => {
      const activeSeries = getActiveSeriesFromRaces(mockRecentRaces);

      // Should have unique series IDs
      const seriesIds = activeSeries.map((s) => s.seriesId);
      const uniqueIds = [...new Set(seriesIds)];
      expect(seriesIds.length).toBe(uniqueIds.length);
    });

    it('should only include series that appear in races', () => {
      const activeSeries = getActiveSeriesFromRaces(mockRecentRaces);
      const raceSeriesIds = [...new Set(mockRecentRaces.map((r) => r.seriesId))];

      activeSeries.forEach((series) => {
        expect(raceSeriesIds).toContain(series.seriesId);
      });
    });
  });
});
