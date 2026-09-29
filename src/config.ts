import Constants from 'expo-constants';
import { DEFAULT_CLAUDE_MODEL } from './constants/llm';

export const config = {
  claudeApiKey: Constants.expoConfig?.extra?.claudeApiKey || '',
  claudeModel: Constants.expoConfig?.extra?.claudeModel || DEFAULT_CLAUDE_MODEL,
  googleOAuthClientId: Constants.expoConfig?.extra?.googleOAuthClientId || '',
};
