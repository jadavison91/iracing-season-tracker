import {
  formatLapTime,
  hundredthsToMs,
  formatIRating,
  formatSafetyRating,
  EVENT_TYPE_MAP,
  CATEGORY_MAP,
} from '../types';

describe('Type Utilities', () => {
  describe('formatLapTime', () => {
    it('should return -- for zero or negative values', () => {
      expect(formatLapTime(0)).toBe('--');
      expect(formatLapTime(-100)).toBe('--');
    });

    it('should format sub-minute lap times', () => {
      expect(formatLapTime(4567)).toBe('45.670'); // 45.67 seconds
      expect(formatLapTime(3000)).toBe('30.000');
    });

    it('should format lap times with minutes', () => {
      expect(formatLapTime(9712)).toBe('1:37.120'); // 1:37.12
      expect(formatLapTime(12345)).toBe('2:03.450'); // 2:03.45
    });
  });

  describe('hundredthsToMs', () => {
    it('should convert hundredths to milliseconds', () => {
      expect(hundredthsToMs(100)).toBe(1000);
      expect(hundredthsToMs(9712)).toBe(97120);
    });
  });

  describe('formatIRating', () => {
    it('should format with thousands separator', () => {
      expect(formatIRating(1847)).toBe('1,847');
      expect(formatIRating(12345)).toBe('12,345');
      expect(formatIRating(500)).toBe('500');
    });
  });

  describe('formatSafetyRating', () => {
    it('should format safety rating with decimal', () => {
      expect(formatSafetyRating(345)).toBe('3.45');
      expect(formatSafetyRating(299)).toBe('2.99');
      expect(formatSafetyRating(100)).toBe('1.00');
    });
  });

  describe('Constants', () => {
    it('should have correct event type mappings', () => {
      expect(EVENT_TYPE_MAP[2]).toBe('practice');
      expect(EVENT_TYPE_MAP[3]).toBe('qualify');
      expect(EVENT_TYPE_MAP[4]).toBe('time_trial');
      expect(EVENT_TYPE_MAP[5]).toBe('race');
    });

    it('should have correct category mappings', () => {
      expect(CATEGORY_MAP[1]).toBe('oval');
      expect(CATEGORY_MAP[2]).toBe('road');
      expect(CATEGORY_MAP[3]).toBe('dirt_oval');
      expect(CATEGORY_MAP[4]).toBe('dirt_road');
    });
  });
});
