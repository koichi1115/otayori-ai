import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { setSetting, getSetting } from '../db/settings';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks',
].join(' ');

// Users need to set their own Google OAuth Client ID in settings
// This can be obtained from Google Cloud Console

export async function signInWithGoogle(clientId: string): Promise<string> {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'otayori-ai' });

  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  };

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: GOOGLE_SCOPES.split(' '),
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
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

  if (tokenResult.refreshToken) {
    await setSetting('googleRefreshToken' as any, tokenResult.refreshToken);
  }

  return accessToken;
}

export async function isGoogleConnected(): Promise<boolean> {
  const token = await getSetting('googleAccessToken');
  return !!token;
}

export async function disconnectGoogle(): Promise<void> {
  await setSetting('googleAccessToken', '');
}
