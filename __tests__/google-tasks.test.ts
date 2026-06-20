jest.mock('../src/db/settings', () => ({
  getSetting: jest.fn(),
}));

jest.mock('../src/services/google-drive', () => ({
  getDriveFileUrl: (id: string) => `https://drive.google.com/open?id=${id}`,
}));

import { createTask } from '../src/services/google-tasks';
import { getSetting } from '../src/db/settings';

const mockGetSetting = getSetting as jest.Mock;
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSetting.mockImplementation((key: string) => {
    if (key === 'googleAccessToken') return Promise.resolve('token-abc');
    return Promise.resolve(null);
  });
  // First call: getDefaultTaskListId, second call: createTask
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [{ id: 'tasklist-1' }] }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'task-id-123' }),
    });
});

describe('createTask', () => {
  it('creates a TODO task with correct title format', async () => {
    const id = await createTask({
      title: '書類提出',
      dueDate: '2025-06-10',
      targetPerson: '太郎',
      description: '担任に提出',
    });

    expect(id).toBe('task-id-123');

    // Second fetch call is the actual task creation
    const [url, options] = mockFetch.mock.calls[1];
    expect(url).toContain('/lists/tasklist-1/tasks');
    const body = JSON.parse(options.body);
    expect(body.title).toBe('【太郎】書類提出');
    expect(body.due).toBe('2025-06-10T00:00:00.000Z');
    expect(body.notes).toContain('担任に提出');
    expect(body.notes).toContain('ぷりかん！登録');
  });

  it('prefixes item tasks with 【持ち物】', async () => {
    mockFetch
      .mockReset()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [{ id: 'tasklist-1' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'task-456' }),
      });

    await createTask({
      title: '水筒',
      targetPerson: '花子',
      description: 'プール用',
      isItem: true,
    });

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.title).toBe('【持ち物】【花子】水筒');
  });

  it('omits due field when no dueDate', async () => {
    mockFetch
      .mockReset()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [{ id: 'tasklist-1' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'task-789' }),
      });

    await createTask({
      title: 'テスト',
      targetPerson: '太郎',
      description: '',
    });

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.due).toBeUndefined();
  });

  it('includes drive file link in notes', async () => {
    mockFetch
      .mockReset()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [{ id: 'tasklist-1' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'task-abc' }),
      });

    await createTask({
      title: 'テスト',
      targetPerson: '太郎',
      description: '説明文',
      driveFileId: 'drive-999',
    });

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.notes).toContain('https://drive.google.com/open?id=drive-999');
  });

  it('throws on 401 with re-auth message', async () => {
    mockFetch
      .mockReset()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [{ id: 'tasklist-1' }] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

    await expect(
      createTask({
        title: 'テスト',
        targetPerson: '太郎',
        description: '',
      })
    ).rejects.toThrow('再認証');
  });

  it('throws when no access token', async () => {
    mockGetSetting.mockResolvedValue(null);

    await expect(
      createTask({
        title: 'テスト',
        targetPerson: '太郎',
        description: '',
      })
    ).rejects.toThrow('Google');
  });
});
