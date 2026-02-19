/**
 * @jest-environment node
 */

// Mock fetch globally before importing the module
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Set environment variables before importing the module
process.env.IRACING_CLIENT_ID = 'test-client-id';
process.env.IRACING_CLIENT_SECRET = 'test-client-secret';
process.env.IRACING_USERNAME = 'test@example.com';
process.env.IRACING_PASSWORD = 'test-password';

import {
  authenticate,
  refreshAccessToken,
  getValidAccessToken,
  isTokenValid,
  hasRefreshToken,
  clearTokenState,
  setTokenState,
  getTokenState,
  IRacingAuthError,
} from '../auth';

describe('IRacing Auth', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    clearTokenState();
  });

  describe('Token State Management', () => {
    it('should start with no token state', () => {
      expect(getTokenState()).toBeNull();
      expect(isTokenValid()).toBe(false);
      expect(hasRefreshToken()).toBe(false);
    });

    it('should set and get token state', () => {
      const tokenState = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      setTokenState(tokenState);

      expect(getTokenState()).toEqual(tokenState);
      expect(isTokenValid()).toBe(true);
      expect(hasRefreshToken()).toBe(true);
    });

    it('should clear token state', () => {
      setTokenState({
        accessToken: 'test',
        refreshToken: 'test',
        expiresAt: Date.now() + 3600000,
      });

      clearTokenState();

      expect(getTokenState()).toBeNull();
      expect(isTokenValid()).toBe(false);
    });

    it('should report token as invalid when expired', () => {
      setTokenState({
        accessToken: 'test',
        refreshToken: 'test',
        expiresAt: Date.now() - 1000, // Already expired
      });

      expect(isTokenValid()).toBe(false);
    });

    it('should report token as invalid when within refresh buffer', () => {
      setTokenState({
        accessToken: 'test',
        refreshToken: 'test',
        expiresAt: Date.now() + 60000, // Expires in 1 minute (within 5 min buffer)
      });

      expect(isTokenValid()).toBe(false);
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate and store token', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const result = await authenticate();

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      expect(getTokenState()).toEqual(result);

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/oauth2/token'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should throw IRacingAuthError on authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ error: 'invalid_grant' })),
      });

      await expect(authenticate()).rejects.toThrow(IRacingAuthError);
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh token', async () => {
      // Set up existing token state
      setTokenState({
        accessToken: 'old-access-token',
        refreshToken: 'existing-refresh-token',
        expiresAt: Date.now() - 1000, // Expired
      });

      const mockTokenResponse = {
        access_token: 'refreshed-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const result = await refreshAccessToken();

      expect(result.accessToken).toBe('refreshed-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw error when no refresh token available', async () => {
      await expect(refreshAccessToken()).rejects.toThrow('No refresh token available');
    });

    it('should clear token state on refresh failure', async () => {
      setTokenState({
        accessToken: 'old',
        refreshToken: 'old-refresh',
        expiresAt: Date.now() - 1000,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"error": "invalid_token"}'),
      });

      await expect(refreshAccessToken()).rejects.toThrow(IRacingAuthError);
      expect(getTokenState()).toBeNull();
    });
  });

  describe('getValidAccessToken', () => {
    it('should return existing token if valid', async () => {
      setTokenState({
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      });

      const token = await getValidAccessToken();

      expect(token).toBe('valid-token');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should refresh token if expired but refresh token available', async () => {
      setTokenState({
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: Date.now() - 1000, // Expired
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-token',
            refresh_token: 'new-refresh',
            expires_in: 3600,
          }),
      });

      const token = await getValidAccessToken();

      expect(token).toBe('new-token');
    });

    it('should authenticate from scratch if no token state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'fresh-token',
            refresh_token: 'fresh-refresh',
            expires_in: 3600,
          }),
      });

      const token = await getValidAccessToken();

      expect(token).toBe('fresh-token');
    });

    it('should re-authenticate if refresh fails', async () => {
      // Suppress console.warn for this test
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      setTokenState({
        accessToken: 'expired',
        refreshToken: 'bad-refresh',
        expiresAt: Date.now() - 1000,
      });

      // First call: refresh fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"error": "invalid_token"}'),
      });

      // Second call: authenticate succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-auth-token',
            refresh_token: 'new-refresh',
            expires_in: 3600,
          }),
      });

      const token = await getValidAccessToken();

      expect(token).toBe('new-auth-token');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      warnSpy.mockRestore();
    });
  });
});
