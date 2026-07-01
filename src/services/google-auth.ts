import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { setSetting, getSetting } from '../db/settings';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks',
];

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export async function signInWithGoogle(clientId: string): Promise<string> {
  // iOS uses bundleId:/oauthredirect as redirect URI
  const redirectUri = `${Application.applicationId}:/oauthredirect`;

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: GOOGLE_SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Google認証がキャンセルされました');
  }

  // Exchange code for tokens
  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier! },
    },
    discovery
  );

  const accessToken = tokenResult.accessToken;
  await setSetting('googleAccessToken', accessToken);
  // Store expiration time (seconds since epoch)
  if (tokenResult.expiresIn) {
    const expiresAt = Math.floor(Date.now() / 1000) + tokenResult.expiresIn;
    await setSetting('googleTokenExpiresAt' as any, String(expiresAt));
  }

  if (tokenResult.refreshToken) {
    await setSetting('googleRefreshToken' as any, tokenResult.refreshToken);
  }

  return accessToken;
}

/**
 * Get a valid access token, refreshing if expired
 */
export async function getValidAccessToken(): Promise<string> {
  const token = await getSetting('googleAccessToken');
  if (!token) throw new Error('Googleアカウントと連携してください。');

  // Check if token is expired
  const expiresAtStr = await getSetting('googleTokenExpiresAt' as any);
  const expiresAt = expiresAtStr ? Number(expiresAtStr) : 0;
  const now = Math.floor(Date.now() / 1000);

  // Refresh if expired or expiring within 5 minutes
  if (expiresAt > 0 && now < expiresAt - 300) {
    return token;
  }

  // Try to refresh
  const refreshToken = await getSetting('googleRefreshToken' as any);
  if (!refreshToken) {
    // No refresh token — return existing token, it might still work
    return token;
  }

  const clientId = Constants.expoConfig?.extra?.googleOAuthClientId;
  if (!clientId) return token;

  try {
    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${encodeURIComponent(clientId)}&grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    });

    if (!response.ok) {
      console.warn('Token refresh failed:', response.status);
      return token;
    }

    const data = await response.json();
    if (data.access_token) {
      await setSetting('googleAccessToken', data.access_token);
      if (data.expires_in) {
        const newExpiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
        await setSetting('googleTokenExpiresAt' as any, String(newExpiresAt));
      }
      return data.access_token;
    }
  } catch (e) {
    console.warn('Token refresh error:', e);
  }

  return token;
}

export async function isGoogleConnected(): Promise<boolean> {
  const token = await getSetting('googleAccessToken');
  return !!token;
}

export async function disconnectGoogle(): Promise<void> {
  await setSetting('googleAccessToken', '');
  await setSetting('googleTokenExpiresAt' as any, '');
  await setSetting('googleRefreshToken' as any, '');
}
