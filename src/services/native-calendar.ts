import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

/**
 * iOSネイティブ連携（EventKit）
 * - イベント → iOSカレンダー（書き込み専用アクセス, iOS 17+）
 * - TODO・持ち物 → iOSリマインダー（専用リスト「ぷりかん！」を作成）
 *
 * 権限はOSダイアログを直接出す（事前カスタム画面は置かない。Guideline 5.1.1対応）。
 */

const REMINDER_LIST_NAME = 'ぷりかん！';

export class PermissionDeniedError extends Error {
  constructor(public entity: 'calendar' | 'reminders') {
    super(entity === 'calendar' ? 'カレンダーへのアクセスが許可されていません' : 'リマインダーへのアクセスが許可されていません');
    this.name = 'PermissionDeniedError';
  }
}

async function ensureCalendarPermission(): Promise<void> {
  // writeOnly: 追加だけならiOS 17の書き込み専用アクセスで足りる（最小権限）
  const { status } = await Calendar.requestCalendarPermissions(true);
  if (status !== 'granted') throw new PermissionDeniedError('calendar');
}

async function ensureRemindersPermission(): Promise<void> {
  const { status } = await Calendar.requestRemindersPermissions();
  if (status !== 'granted') throw new PermissionDeniedError('reminders');
}

async function getWritableCalendarId(): Promise<string> {
  // 書き込み専用アクセスでは getDefaultCalendarSync が使えない場合があるため、
  // まずdefaultを試し、ダメなら書き込み可能なカレンダーを探す
  try {
    const def = Calendar.getDefaultCalendarSync();
    if (def?.id) return def.id;
  } catch { /* write-only では取れないことがある */ }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((c) => c.allowsModifications);
  if (!writable) throw new Error('書き込み可能なカレンダーが見つかりません');
  return writable.id;
}

async function getReminderListId(): Promise<string> {
  const lists = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER);
  const existing = lists.find((l) => l.title === REMINDER_LIST_NAME && l.allowsModifications);
  if (existing) return existing.id;

  const fallbackSource = lists.find((l) => l.allowsModifications)?.source;
  if (!fallbackSource) throw new Error('リマインダーリストを作成できるアカウントが見つかりません');
  return Calendar.createCalendarAsync({
    title: REMINDER_LIST_NAME,
    color: '#4A90D9',
    entityType: Calendar.EntityTypes.REMINDER,
    sourceId: fallbackSource.id,
    name: REMINDER_LIST_NAME,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
    ownerAccount: 'local',
  });
}

/** YYYY-MM-DD (+ HH:MM) から開始/終了Dateを組み立てる */
function buildEventDates(date: string, startTime: string | null, endTime: string | null): { start: Date; end: Date; allDay: boolean } {
  if (startTime) {
    const start = new Date(`${date}T${startTime}:00`);
    const end = endTime
      ? new Date(`${date}T${endTime}:00`)
      : new Date(start.getTime() + 60 * 60 * 1000); // 終了未指定は1時間
    return { start, end, allDay: false };
  }
  // 時刻なしは終日イベント
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59`);
  return { start, end, allDay: true };
}

export interface NativeEventInput {
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  endTime: string | null;
  location: string | null;
  targetPerson: string;
  description: string;
}

/** イベントをiOSカレンダーに登録し、イベントIDを返す */
export async function registerEventToIOSCalendar(event: NativeEventInput): Promise<string> {
  if (Platform.OS !== 'ios') throw new Error('iOSでのみ利用できます');
  await ensureCalendarPermission();
  const calendarId = await getWritableCalendarId();

  const { start, end, allDay } = buildEventDates(event.date, event.startTime, event.endTime);
  const notes = [event.targetPerson ? `対象: ${event.targetPerson}` : '', event.description]
    .filter(Boolean).join('\n');

  return Calendar.createEventAsync(calendarId, {
    title: event.title,
    startDate: start,
    endDate: end,
    allDay,
    location: event.location ?? undefined,
    notes: notes || undefined,
    timeZone: 'Asia/Tokyo',
  });
}

export interface NativeReminderInput {
  title: string;
  dueDate: string | null; // YYYY-MM-DD
  targetPerson: string;
  description: string;
}

/** TODO・持ち物をiOSリマインダーに登録し、リマインダーIDを返す */
export async function registerReminderToIOS(reminder: NativeReminderInput): Promise<string> {
  if (Platform.OS !== 'ios') throw new Error('iOSでのみ利用できます');
  await ensureRemindersPermission();
  const listId = await getReminderListId();

  const notes = [reminder.targetPerson ? `対象: ${reminder.targetPerson}` : '', reminder.description]
    .filter(Boolean).join('\n');

  return Calendar.createReminderAsync(listId, {
    title: reminder.title,
    dueDate: reminder.dueDate ? new Date(`${reminder.dueDate}T09:00:00`) : undefined,
    notes: notes || undefined,
  });
}
