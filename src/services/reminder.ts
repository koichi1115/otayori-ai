import { getSetting } from '../db/settings';

const WEBHOOK_BASE = 'https://purikan-line-webhook.vercel.app';

interface ReminderData {
  title: string;
  dueDate: string;
  targetPerson: string;
  type: 'todo' | 'item';
  documentTitle?: string;
  driveFileId?: string | null;
}

/**
 * Register a reminder on the server for LINE push notification.
 * Called when a TODO or item is registered to Google Tasks.
 */
export async function registerReminder(data: ReminderData): Promise<void> {
  const lineUserId = await getSetting('lineUserId');
  const daysBefore = await getSetting('reminderDaysBefore') || '1';

  if (!lineUserId || !data.dueDate) return;

  try {
    await fetch(`${WEBHOOK_BASE}/api/reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineUserId,
        title: data.title,
        dueDate: data.dueDate,
        targetPerson: data.targetPerson,
        type: data.type,
        daysBefore: Number(daysBefore),
        documentTitle: data.documentTitle,
        driveFileId: data.driveFileId,
      }),
    });
  } catch {
    // Reminder registration is best-effort
  }
}
