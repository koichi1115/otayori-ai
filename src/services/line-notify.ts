import { getSetting } from '../db/settings';
import type { AnalysisResult } from '../types';

const LINE_API = 'https://api.line.me/v2/bot/message/push';

/**
 * Send LINE notification with analysis results
 */
export async function sendLineNotification(result: AnalysisResult, driveFileId?: string | null): Promise<void> {
  const channelAccessToken = await getSetting('lineChannelAccessToken');
  const userId = await getSetting('lineUserId');

  if (!channelAccessToken || !userId) return; // LINE not configured, skip silently

  let message = `✅ ${result.source}\n📄 ${result.title}`;

  if (result.events.length > 0) {
    message += '\n\n📅 イベント:';
    result.events.forEach((e) => {
      message += `\n  - 【${e.targetPerson}】${e.title} (${e.date})`;
    });
  }

  if (result.todos.length > 0) {
    message += '\n\n✔️ TODO:';
    result.todos.forEach((t) => {
      message += `\n  - ${t.title}${t.dueDate ? ` (期限: ${t.dueDate})` : ''}`;
    });
  }

  if (result.items.length > 0) {
    message += '\n\n🎒 持ち物:';
    result.items.forEach((i) => {
      message += `\n  - ${i.name}${i.dueDate ? ` (期限: ${i.dueDate})` : ''}`;
    });
  }

  if (driveFileId) {
    message += `\n\n📎 元資料: https://drive.google.com/open?id=${driveFileId}`;
  }

  // Split long messages (LINE limit is 5000 chars)
  const maxLength = 4500;
  const parts: string[] = [];
  for (let i = 0; i < message.length; i += maxLength) {
    parts.push(message.substring(i, i + maxLength));
  }

  for (const part of parts) {
    const response = await fetch(LINE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text: part }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn(`LINE通知送信失敗 (${response.status}): ${error}`);
    }
  }
}
