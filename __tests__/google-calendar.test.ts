jest.mock('../src/db/settings', () => ({
  getSetting: jest.fn(),
}));

jest.mock('../src/services/google-drive', () => ({
  getDriveFileUrl: (id: string) => `https://drive.google.com/open?id=${id}`,
}));

import { createCalendarEvent, addHour } from '../src/services/google-calendar';
import { getSetting } from '../src/db/settings';

const mockGetSetting = getSetting as jest.Mock;
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSetting.mockImplementation((key: string) => {
    if (key === 'googleAccessToken') return Promise.resolve('token-abc');
    if (key === 'calendarId') return Promise.resolve(null);
    return Promise.resolve(null);
  });
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ id: 'event-123' }),
  });
});

describe('addHour', () => {
  it('adds one hour to a normal time', () => {
    expect(addHour('10:30')).toBe('11:30');
  });

  it('wraps around midnight', () => {
    expect(addHour('23:00')).toBe('00:00');
  });

  it('preserves minutes', () => {
    expect(addHour('14:45')).toBe('15:45');
  });

  it('handles midnight input', () => {
    expect(addHour('00:00')).toBe('01:00');
  });
});

describe('createCalendarEvent', () => {
  it('creates all-day event when no startTime', async () => {
    await createCalendarEvent({
      title: '保育参観',
      date: '2025-06-15',
      targetPerson: '太郎',
      description: '親子参加',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/calendars/primary/events');
    expect(options.headers.Authorization).toBe('Bearer token-abc');

    const body = JSON.parse(options.body);
    expect(body.summary).toBe('【太郎】保育参観');
    expect(body.start).toEqual({ date: '2025-06-15' });
    expect(body.end).toEqual({ date: '2025-06-15' });
  });

  it('creates timed event with startTime', async () => {
    await createCalendarEvent({
      title: 'お遊戯会',
      date: '2025-06-20',
      startTime: '10:00',
      endTime: '11:30',
      targetPerson: '花子',
      description: 'ホールにて',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.start).toEqual({
      dateTime: '2025-06-20T10:00:00',
      timeZone: 'Asia/Tokyo',
    });
    expect(body.end).toEqual({
      dateTime: '2025-06-20T11:30:00',
      timeZone: 'Asia/Tokyo',
    });
  });

  it('uses addHour for endTime when not provided', async () => {
    await createCalendarEvent({
      title: '面談',
      date: '2025-06-20',
      startTime: '14:00',
      targetPerson: '太郎',
      description: '',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.end.dateTime).toBe('2025-06-20T15:00:00');
  });

  it('includes description with targetPerson and drive link', async () => {
    await createCalendarEvent({
      title: 'テスト',
      date: '2025-06-20',
      targetPerson: '太郎',
      description: '詳細情報',
      driveFileId: 'drive-file-123',
      documentTitle: '6月園だより',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.description).toContain('対象: 太郎');
    expect(body.description).toContain('詳細情報');
    expect(body.description).toContain('https://drive.google.com/open?id=drive-file-123');
    expect(body.description).toContain('6月園だより');
    expect(body.description).toContain('ぷりかん！登録');
  });

  it('includes location when provided', async () => {
    await createCalendarEvent({
      title: 'テスト',
      date: '2025-06-20',
      location: '体育館',
      targetPerson: '太郎',
      description: '',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.location).toBe('体育館');
  });

  it('uses custom calendarId when configured', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'googleAccessToken') return Promise.resolve('token');
      if (key === 'calendarId') return Promise.resolve('my-calendar-id');
      return Promise.resolve(null);
    });

    await createCalendarEvent({
      title: 'テスト',
      date: '2025-06-20',
      targetPerson: '太郎',
      description: '',
    });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('my-calendar-id');
  });

  it('throws on 401 with re-auth message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    await expect(
      createCalendarEvent({
        title: 'テスト',
        date: '2025-06-20',
        targetPerson: '太郎',
        description: '',
      })
    ).rejects.toThrow('再認証');
  });

  it('throws when no access token', async () => {
    mockGetSetting.mockResolvedValue(null);

    await expect(
      createCalendarEvent({
        title: 'テスト',
        date: '2025-06-20',
        targetPerson: '太郎',
        description: '',
      })
    ).rejects.toThrow('Google');
  });
});
