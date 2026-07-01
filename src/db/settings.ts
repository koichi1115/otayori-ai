import { getDatabase } from './database';
import type { AppSettings, LLMProvider } from '../types';

const DEFAULTS: AppSettings = {
  llmProvider: 'claude',
  claudeApiKey: '',
  geminiApiKey: '',
  openaiApiKey: '',
  claudeModel: 'claude-haiku-4-5-20251001',
  geminiModel: 'gemini-2.5-flash',
  openaiModel: 'gpt-4o-mini',
  googleAccessToken: null,
  driveFolderId: null,
  calendarId: null,
  lineChannelAccessToken: null,
  lineUserId: null,
  reminderDaysBefore: '1',
};

export async function getSetting(key: keyof AppSettings): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? (DEFAULTS[key] as string | null);
}

export async function setSetting(key: keyof AppSettings, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function getAllSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored: Record<string, string> = {};
  for (const row of rows) {
    stored[row.key] = row.value;
  }
  return { ...DEFAULTS, ...stored } as unknown as AppSettings;
}

export async function getLLMConfig() {
  const settings = await getAllSettings();
  const provider = settings.llmProvider;
  const apiKeyMap: Record<LLMProvider, string> = {
    claude: settings.claudeApiKey,
    gemini: settings.geminiApiKey,
    openai: settings.openaiApiKey,
  };
  const modelMap: Record<LLMProvider, string> = {
    claude: settings.claudeModel,
    gemini: settings.geminiModel,
    openai: settings.openaiModel,
  };
  return {
    provider,
    apiKey: apiKeyMap[provider],
    model: modelMap[provider],
  };
}
