import { TokenResponse, TokenState } from './types';
import crypto from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

// iRacing OAuth2 token endpoint
// See: https://oauth.iracing.com/oauth2/book/token_endpoint.html
const OAUTH_BASE_URL =
  process.env.IRACING_OAUTH_BASE_URL || 'https://oauth.iracing.com/oauth2';
const TOKEN_ENDPOINT = `${OAUTH_BASE_URL}/token`;

// Buffer time before expiry to refresh token (5 minutes)
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Encode password/secret for iRacing OAuth
 * iRacing expects: Base64(SHA256(value + lowercase(key)))
 *
 * For password: encodeCredential(password, username)
 * For client_secret: encodeCredential(clientSecret, clientId)
 */
function encodeCredential(value: string, key: string): string {
  const combined = value + key.toLowerCase();
  const hash = crypto.createHash('sha256').update(combined, 'utf8').digest();
  return hash.toString('base64');
}

// ============================================================================
// Token Storage (In-memory singleton for serverless)
// ============================================================================

let tokenState: TokenState | null = null;

/**
 * Get the current token state
 */
export function getTokenState(): TokenState | null {
  return tokenState;
}

/**
 * Set the token state
 */
export function setTokenState(state: TokenState | null): void {
  tokenState = state;
}

/**
 * Clear the token state
 */
export function clearTokenState(): void {
  tokenState = null;
}

// ============================================================================
// OAuth2 Client
// ============================================================================

export class IRacingAuthError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'IRacingAuthError';
  }
}

/**
 * Check if the current token is valid and not expired
 */
export function isTokenValid(): boolean {
  if (!tokenState) return false;
  // Check if token expires within the buffer time
  return Date.now() < tokenState.expiresAt - TOKEN_REFRESH_BUFFER_MS;
}

/**
 * Check if we have a refresh token available
 */
export function hasRefreshToken(): boolean {
  return !!tokenState?.refreshToken;
}

/**
 * Get required environment variables
 */
function getCredentials(): {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
} {
  const clientId = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET;
  const username = process.env.IRACING_USERNAME;
  const password = process.env.IRACING_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    throw new IRacingAuthError(
      'Missing required environment variables: IRACING_CLIENT_ID, IRACING_CLIENT_SECRET, IRACING_USERNAME, IRACING_PASSWORD'
    );
  }

  return { clientId, clientSecret, username, password };
}

/**
 * Authenticate using Password Limited Grant
 * See: https://oauth.iracing.com/oauth2/book/password_limited_flow.html
 *
 * The Password Limited flow puts all credentials in the form body (not Basic Auth).
 * Response includes access_token (600s lifetime) and refresh_token (7 day lifetime).
 */
export async function authenticate(): Promise<TokenState> {
  const { clientId, clientSecret, username, password } = getCredentials();

  // iRacing expects credentials to be encoded as: Base64(SHA256(value + lowercase(key)))
  const encodedSecret = encodeCredential(clientSecret, clientId);
  const encodedPassword = encodeCredential(password, username);

  // All parameters go in the form body for password_limited grant
  const body = new URLSearchParams({
    grant_type: 'password_limited',
    client_id: clientId,
    client_secret: encodedSecret,
    username,
    password: encodedPassword,
    scope: 'iracing.auth iracing.profile',
  });

  console.log('[iRacing Auth] Authenticating with Password Limited grant...');

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Authentication failed: ${response.status}`;
    let errorCode: string | undefined;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error_description || errorJson.error || errorMessage;
      errorCode = errorJson.error;
      console.error('[iRacing Auth] Error response:', errorJson);
    } catch {
      console.error('[iRacing Auth] Error text:', errorText);
    }

    throw new IRacingAuthError(errorMessage, response.status, errorCode);
  }

  const data: TokenResponse = await response.json();

  console.log('[iRacing Auth] Authentication successful, token expires in', data.expires_in, 'seconds');

  const newTokenState: TokenState = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  setTokenState(newTokenState);
  return newTokenState;
}

/**
 * Refresh the access token using the refresh token
 * See: https://oauth.iracing.com/oauth2/book/token_endpoint.html
 */
export async function refreshAccessToken(): Promise<TokenState> {
  if (!tokenState?.refreshToken) {
    throw new IRacingAuthError('No refresh token available');
  }

  const { clientId, clientSecret } = getCredentials();

  // All parameters go in the form body
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: tokenState.refreshToken,
  });

  console.log('[iRacing Auth] Refreshing access token...');

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    // If refresh fails, clear token state and throw
    clearTokenState();

    const errorText = await response.text();
    let errorMessage = `Token refresh failed: ${response.status}`;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error_description || errorJson.error || errorMessage;
    } catch {
      // Use default error message
    }

    throw new IRacingAuthError(errorMessage, response.status, 'refresh_failed');
  }

  const data: TokenResponse = await response.json();

  const newTokenState: TokenState = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokenState.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  setTokenState(newTokenState);
  return newTokenState;
}

/**
 * Get a valid access token, refreshing or re-authenticating if necessary
 */
export async function getValidAccessToken(): Promise<string> {
  // If token is valid, return it
  if (isTokenValid() && tokenState) {
    return tokenState.accessToken;
  }

  // Try to refresh if we have a refresh token
  if (hasRefreshToken()) {
    try {
      const newState = await refreshAccessToken();
      return newState.accessToken;
    } catch (error) {
      // If refresh fails, fall through to re-authenticate
      console.warn('Token refresh failed, re-authenticating:', error);
    }
  }

  // Authenticate from scratch
  const newState = await authenticate();
  return newState.accessToken;
}

/**
 * Ensure we have valid authentication before making API calls
 * This is the main entry point for getting auth headers
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const accessToken = await getValidAccessToken();
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}
