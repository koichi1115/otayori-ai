import { getSetting } from '../db/settings';
import { getDriveFileUrl } from './google-drive';

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1';

async function getAccessToken(): Promise<string> {
  const token = await getSetting('googleAccessToken');
  if (!token) throw new Error('Googleアカウントと連携してください。');
  return token;
}

/**
 * Get the default task list ID
 */
async function getDefaultTaskListId(): Promise<string> {
  const token = await getAccessToken();
  const response = await fetch(`${TASKS_API}/users/@me/lists`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('タスクリストの取得に失敗しました');
  const data = await response.json();
  if (!data.items?.length) throw new Error('タスクリストが見つかりません');
  return data.items[0].id;
}

/**
 * Create a Google Task from an extracted TODO or item
 */
export async function createTask(task: {
  title: string;
  dueDate?: string | null;
  targetPerson: string;
  description: string;
  isItem?: boolean;
  driveFileId?: string | null;
}): Promise<string> {
  const token = await getAccessToken();
  const taskListId = await getDefaultTaskListId();

  const prefix = task.isItem ? '【持ち物】' : '';
  const taskTitle = `${prefix}【${task.targetPerson}】${task.title}`;

  let notes = task.description || '';
  if (task.driveFileId) {
    notes += `\n\n📎 元資料: ${getDriveFileUrl(task.driveFileId)}`;
  }
  notes += '\n📄 おたよりAI登録';

  const body: any = {
    title: taskTitle,
    notes,
  };

  if (task.dueDate) {
    body.due = `${task.dueDate}T00:00:00.000Z`;
  }

  const response = await fetch(`${TASKS_API}/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) throw new Error('Google認証が期限切れです。再認証してください。');
    throw new Error(`タスク登録に失敗しました (${response.status}): ${error}`);
  }

  const result = await response.json();
  return result.id;
}

/**
 * Complete a task
 */
export async function completeTask(taskId: string): Promise<void> {
  const token = await getAccessToken();
  const taskListId = await getDefaultTaskListId();

  await fetch(`${TASKS_API}/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'completed' }),
  });
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const token = await getAccessToken();
  const taskListId = await getDefaultTaskListId();

  await fetch(`${TASKS_API}/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
