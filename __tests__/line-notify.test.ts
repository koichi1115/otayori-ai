jest.mock('../src/db/settings', () => ({
  getSetting: jest.fn(),
}));

import { sendLineNotification } from '../src/services/line-notify';
import { getSetting } from '../src/db/settings';
import type { AnalysisResult } from '../src/types';

const mockGetSetting = getSetting as jest.Mock;

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
});

const baseResult: AnalysisResult = {
  title: '6月園だより',
  source: 'さくら保育園',
  category: 'notice',
  summary: '要約テスト',
  suggestedFileName: 'test.pdf',
  events: [],
  todos: [],
  items: [],
};

describe('sendLineNotification', () => {
  it('skips silently when LINE is not configured', async () => {
    mockGetSetting.mockResolvedValue(null);
    await sendLineNotification(baseResult);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends notification with title and source', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'lineChannelAccessToken') return Promise.resolve('token-123');
      if (key === 'lineUserId') return Promise.resolve('user-456');
      return Promise.resolve(null);
    });

    await sendLineNotification(baseResult);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.line.me/v2/bot/message/push');
    expect(options.headers.Authorization).toBe('Bearer token-123');

    const body = JSON.parse(options.body);
    expect(body.to).toBe('user-456');
    const text = body.messages[0].text;
    expect(text).toContain('さくら保育園');
    expect(text).toContain('6月園だより');
  });

  it('includes events in message', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'lineChannelAccessToken') return Promise.resolve('token');
      if (key === 'lineUserId') return Promise.resolve('user');
      return Promise.resolve(null);
    });

    const result: AnalysisResult = {
      ...baseResult,
      events: [
        { title: '運動会', date: '2025-06-20', targetPerson: '太郎', description: '' },
      ],
    };

    await sendLineNotification(result);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const text = body.messages[0].text;
    expect(text).toContain('イベント');
    expect(text).toContain('運動会');
    expect(text).toContain('太郎');
    expect(text).toContain('2025-06-20');
  });

  it('includes todos with due dates', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'lineChannelAccessToken') return Promise.resolve('token');
      if (key === 'lineUserId') return Promise.resolve('user');
      return Promise.resolve(null);
    });

    const result: AnalysisResult = {
      ...baseResult,
      todos: [
        { title: '書類提出', dueDate: '2025-06-10', targetPerson: '太郎', description: '' },
      ],
    };

    await sendLineNotification(result);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const text = body.messages[0].text;
    expect(text).toContain('TODO');
    expect(text).toContain('書類提出');
    expect(text).toContain('期限: 2025-06-10');
  });

  it('includes items in message', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'lineChannelAccessToken') return Promise.resolve('token');
      if (key === 'lineUserId') return Promise.resolve('user');
      return Promise.resolve(null);
    });

    const result: AnalysisResult = {
      ...baseResult,
      items: [
        { name: '水筒', dueDate: '2025-06-15', targetPerson: '太郎', description: '' },
      ],
    };

    await sendLineNotification(result);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const text = body.messages[0].text;
    expect(text).toContain('持ち物');
    expect(text).toContain('水筒');
  });

  it('includes drive link when driveFileId provided', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'lineChannelAccessToken') return Promise.resolve('token');
      if (key === 'lineUserId') return Promise.resolve('user');
      return Promise.resolve(null);
    });

    await sendLineNotification(baseResult, 'file-id-789');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const text = body.messages[0].text;
    expect(text).toContain('https://drive.google.com/open?id=file-id-789');
  });

  it('splits long messages at 4500 chars', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'lineChannelAccessToken') return Promise.resolve('token');
      if (key === 'lineUserId') return Promise.resolve('user');
      return Promise.resolve(null);
    });

    const longResult: AnalysisResult = {
      ...baseResult,
      summary: 'x'.repeat(5000),
      todos: Array.from({ length: 100 }, (_, i) => ({
        title: `TODO-${i}-${'あ'.repeat(50)}`,
        dueDate: '2025-06-01',
        targetPerson: '太郎',
        description: 'description'.repeat(5),
      })),
    };

    await sendLineNotification(longResult);

    // Should have been called multiple times for split messages
    expect(mockFetch.mock.calls.length).toBeGreaterThan(1);
  });
});
