jest.mock('../src/db/database', () => ({
  getDatabase: jest.fn(),
}));

import { getSetting, setSetting, getAllSettings, getLLMConfig } from '../src/db/settings';
import { getDatabase } from '../src/db/database';

const mockDb = {
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
};

(getDatabase as jest.Mock).mockResolvedValue(mockDb);

beforeEach(() => {
  jest.clearAllMocks();
  (getDatabase as jest.Mock).mockResolvedValue(mockDb);
});

describe('getSetting', () => {
  it('returns stored value when found', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: 'my-api-key' });
    const result = await getSetting('claudeApiKey');
    expect(result).toBe('my-api-key');
  });

  it('returns default when no stored value', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getSetting('llmProvider');
    expect(result).toBe('claude');
  });

  it('returns null default for nullable settings', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getSetting('googleAccessToken');
    expect(result).toBeNull();
  });
});

describe('getAllSettings', () => {
  it('merges stored values with defaults', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { key: 'llmProvider', value: 'gemini' },
      { key: 'geminiApiKey', value: 'gemini-key-123' },
    ]);
    const settings = await getAllSettings();
    expect(settings.llmProvider).toBe('gemini');
    expect(settings.geminiApiKey).toBe('gemini-key-123');
    // Defaults should still be present
    expect(settings.claudeModel).toBe('claude-haiku-4-5-20251001');
  });

  it('returns all defaults when nothing stored', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const settings = await getAllSettings();
    expect(settings.llmProvider).toBe('claude');
    expect(settings.claudeApiKey).toBe('');
    expect(settings.googleAccessToken).toBeNull();
  });
});

describe('getLLMConfig', () => {
  it('returns claude config by default', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { key: 'claudeApiKey', value: 'sk-test' },
    ]);
    const config = await getLLMConfig();
    expect(config.provider).toBe('claude');
    expect(config.apiKey).toBe('sk-test');
    expect(config.model).toBe('claude-haiku-4-5-20251001');
  });

  it('returns gemini config when provider is gemini', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { key: 'llmProvider', value: 'gemini' },
      { key: 'geminiApiKey', value: 'gemini-key' },
    ]);
    const config = await getLLMConfig();
    expect(config.provider).toBe('gemini');
    expect(config.apiKey).toBe('gemini-key');
    expect(config.model).toBe('gemini-2.5-flash');
  });

  it('returns openai config when provider is openai', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { key: 'llmProvider', value: 'openai' },
      { key: 'openaiApiKey', value: 'openai-key' },
      { key: 'openaiModel', value: 'gpt-4o' },
    ]);
    const config = await getLLMConfig();
    expect(config.provider).toBe('openai');
    expect(config.apiKey).toBe('openai-key');
    expect(config.model).toBe('gpt-4o');
  });

  it('returns empty apiKey when none configured', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const config = await getLLMConfig();
    expect(config.apiKey).toBe('');
  });
});
