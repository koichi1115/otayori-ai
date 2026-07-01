import Constants from 'expo-constants';

export const config = {
  claudeApiKey: Constants.expoConfig?.extra?.claudeApiKey || '',
  claudeModel: Constants.expoConfig?.extra?.claudeModel || 'claude-haiku-4-5-20251001',
  googleOAuthClientId: Constants.expoConfig?.extra?.googleOAuthClientId || '',
};
