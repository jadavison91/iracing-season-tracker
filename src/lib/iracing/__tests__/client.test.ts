/**
 * @jest-environment node
 */

// Mock fetch globally before importing the module
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Set environment variables before importing
process.env.IRACING_CLIENT_ID = 'test-client-id';
process.env.IRACING_CLIENT_SECRET = 'test-client-secret';
process.env.IRACING_USERNAME = 'test@example.com';
process.env.IRACING_PASSWORD = 'test-password';

import {
  getMemberSummary,
  getMemberRecentRaces,
  getSeries,
  getSubsessionResults,
  IRacingApiError,
} from '../client';
import { setTokenState, clearTokenState } from '../auth';

describe('IRacing API Client', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    clearTokenState();

    // Set up valid token state to skip authentication
    setTokenState({
      accessToken: 'valid-test-token',
      refreshToken: 'valid-refresh-token',
      expiresAt: Date.now() + 3600000,
    });
  });

  describe('Two-step fetch process', () => {
    it('should follow the link and fetch actual data', async () => {
      const mockSignedUrl = 'https://s3.example.com/signed-data-url';
      const mockMemberData = {
        custId: 123456,
        displayName: 'Test Driver',
        clubId: 1,
        clubName: 'Test Club',
        licenses: [],
      };

      // First call: returns link
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ link: mockSignedUrl }),
      });

      // Second call: returns actual data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMemberData),
      });

      const result = await getMemberSummary(123456);

      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call should be to API endpoint with auth
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/stats/member_summary'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-test-token',
          }),
        })
      );

      // Second call should be to signed URL
      expect(mockFetch).toHaveBeenNthCalledWith(2, mockSignedUrl);

      expect(result).toEqual(mockMemberData);
    });

    it('should throw error if link is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // No link
      });

      await expect(getMemberSummary(123456)).rejects.toThrow('API response missing data link');
    });
  });

  describe('getMemberSummary', () => {
    it('should pass customer ID as query parameter', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ link: 'https://example.com/data' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ custId: 99999 }),
        });

      await getMemberSummary(99999);

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('cust_id=99999'),
        expect.any(Object)
      );
    });
  });

  describe('getMemberRecentRaces', () => {
    it('should fetch recent races for a customer', async () => {
      const mockRaces = {
        races: [
          {
            subsessionId: 12345,
            seriesName: 'Test Series',
            trackName: 'Test Track',
            finishPosition: 5,
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ link: 'https://example.com/races' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRaces),
        });

      const result = await getMemberRecentRaces(123456);

      expect(result.races).toHaveLength(1);
      expect(result.races[0].seriesName).toBe('Test Series');
    });
  });

  describe('getSeries', () => {
    it('should fetch all series', async () => {
      const mockSeries = [
        { seriesId: 1, seriesName: 'Series A' },
        { seriesId: 2, seriesName: 'Series B' },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ link: 'https://example.com/series' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSeries),
        });

      const result = await getSeries();

      expect(result).toHaveLength(2);
    });
  });

  describe('getSubsessionResults', () => {
    it('should fetch subsession details', async () => {
      const mockSubsession = {
        subsessionId: 55555,
        seriesName: 'Test Race',
        sessionResults: [],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ link: 'https://example.com/subsession' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSubsession),
        });

      const result = await getSubsessionResults(55555);

      expect(result.subsessionId).toBe(55555);
    });
  });

  describe('Error handling', () => {
    it('should throw IRacingApiError on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('{"message": "Not found"}'),
      });

      await expect(getMemberSummary(123456)).rejects.toThrow(IRacingApiError);
    });

    it('should throw IRacingApiError on rate limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      await expect(getMemberSummary(123456)).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw error when signed URL fetch fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ link: 'https://example.com/bad-link' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
        });

      await expect(getMemberSummary(123456)).rejects.toThrow(
        'Failed to fetch data from signed URL'
      );
    });
  });
});
