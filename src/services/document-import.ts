// 解析結果を DB に保存し、保存後の通知（LINE・リマインダー）を出す。
// 取込方法（ファイル選択・共有・カメラ）に関係なく共通で使う。
import { getDatabase } from '../db/database';
import { registerReminder } from './reminder';
import { sendLineNotification } from './line-notify';
import type { AnalysisResult } from '../types';

export interface SaveAnalysisInput {
  analysis: AnalysisResult;
  fileName: string;
  uri: string;
}

export async function saveAnalysisResult({ analysis, fileName, uri }: SaveAnalysisInput): Promise<number> {
  const db = await getDatabase();
  const docResult = await db.runAsync(
    `INSERT INTO documents (file_name, original_file_name, file_path, drive_file_id, status, category, source, title, summary, raw_json)
     VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
    [
      analysis.suggestedFileName || fileName,
      fileName,
      uri,
      null,
      analysis.category,
      analysis.source,
      analysis.title,
      analysis.summary,
      JSON.stringify(analysis),
    ],
  );
  const docId = docResult.lastInsertRowId;

  for (const event of analysis.events) {
    await db.runAsync(
      'INSERT INTO events (document_id, title, date, start_time, end_time, location, target_person, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [docId, event.title, event.date, event.startTime || null, event.endTime || null, event.location || null, event.targetPerson, event.description],
    );
  }
  for (const todo of analysis.todos) {
    await db.runAsync(
      'INSERT INTO todos (document_id, title, due_date, target_person, description) VALUES (?, ?, ?, ?, ?)',
      [docId, todo.title, todo.dueDate || null, todo.targetPerson, todo.description],
    );
  }
  for (const item of analysis.items) {
    await db.runAsync(
      'INSERT INTO items (document_id, name, due_date, target_person, description) VALUES (?, ?, ?, ?, ?)',
      [docId, item.name, item.dueDate || null, item.targetPerson, item.description],
    );
  }
  return docId;
}

/** 保存後の通知。どれも失敗してもよい（best-effort） */
export function notifyAfterSave(analysis: AnalysisResult): void {
  for (const todo of analysis.todos) {
    if (todo.dueDate) {
      registerReminder({ title: todo.title, dueDate: todo.dueDate, targetPerson: todo.targetPerson, type: 'todo', documentTitle: analysis.title }).catch(() => {});
    }
  }
  for (const item of analysis.items) {
    if (item.dueDate) {
      registerReminder({ title: item.name, dueDate: item.dueDate, targetPerson: item.targetPerson, type: 'item', documentTitle: analysis.title }).catch(() => {});
    }
  }
  sendLineNotification(analysis).catch(() => {});
}
