import { getSetting } from '../db/settings';
import { getDriveFileUrl } from './google-drive';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

async function getAccessToken(): Promise<string> {
  const token = await getSetting('googleAccessToken');
  if (!token) throw new Error('Googleアカウントと連携してください。');
  return token;
}

async function getCalendarId(): Promise<string> {
  return (await getSetting('calendarId')) || 'primary';
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
}

/**
 * Create a calendar event from an extracted event
 */
export async function createCalendarEvent(event: {
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  targetPerson: string;
  description: string;
  driveFileId?: string | null;
  documentTitle?: string;
}): Promise<string> {
  const token = await getAccessToken();
  const calendarId = await getCalendarId();

  let descriptionText = `📋 対象: ${event.targetPerson}\n`;
  if (event.description) descriptionText += `📝 ${event.description}\n`;
  if (event.driveFileId) {
    descriptionText += `\n📎 元資料: ${getDriveFileUrl(event.driveFileId)}`;
  }
  if (event.documentTitle) {
    descriptionText += `\n📄 ${event.documentTitle}`;
  }
  descriptionText += '\n\n📄 ぷりかん！登録';

  const eventTitle = `【${event.targetPerson}】${event.title}`;

  let start: any;
  let end: any;

  if (event.startTime) {
    const startDateTime = `${event.date}T${event.startTime}:00`;
    const endTime = event.endTime || addHour(event.startTime);
    const endDateTime = `${event.date}T${endTime}:00`;
    start = { dateTime: startDateTime, timeZone: 'Asia/Tokyo' };
    end = { dateTime: endDateTime, timeZone: 'Asia/Tokyo' };
  } else {
    start = { date: event.date };
    end = { date: event.date };
  }

  const response = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: eventTitle,
      description: descriptionText,
      start,
      end,
      location: event.location || undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) throw new Error('Google認証が期限切れです。再認証してください。');
    throw new Error(`カレンダー登録に失敗しました (${response.status}): ${error}`);
  }

  const result = await response.json();
  return result.id;
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const token = await getAccessToken();
  const calendarId = await getCalendarId();
  await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const newH = (h + 1) % 24;
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
