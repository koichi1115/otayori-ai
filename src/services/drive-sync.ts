import { getDatabase } from '../db/database';
import { listFilesInFolder, downloadFileAsBase64, getOrCreateAppFolder } from './google-drive';
import { registerReminder } from './reminder';
import { analyzePDF } from './llm';
import { sendLineNotification } from './line-notify';
import { createCalendarEvent } from './google-calendar';
import { createTask } from './google-tasks';

export interface SyncResult {
  processed: number;
  skipped: number;
  errors: number;
  details: string[];
}

/**
 * Sync files from Google Drive folder.
 * Detects new files, analyzes them, saves results, and optionally registers to Calendar/Tasks.
 */
export async function syncDriveFolder(autoRegister: boolean = false): Promise<SyncResult> {
  const folderId = await getOrCreateAppFolder();

  const db = await getDatabase();
  const result: SyncResult = { processed: 0, skipped: 0, errors: 0, details: [] };

  // Get files from Drive
  const files = await listFilesInFolder(folderId);

  for (const file of files) {
    try {
      // Check if already processed
      const existing = await db.getFirstAsync<any>(
        'SELECT id FROM documents WHERE drive_file_id = ?',
        [file.id]
      );

      if (existing) {
        result.skipped++;
        continue;
      }

      // Download and analyze
      const { base64, mimeType } = await downloadFileAsBase64(file.id);
      const analysis = await analyzePDF(base64, mimeType);

      // Save to DB
      const docResult = await db.runAsync(
        `INSERT INTO documents (file_name, original_file_name, file_path, drive_file_id, status, category, source, title, summary, raw_json)
         VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
        [
          analysis.suggestedFileName || file.name,
          file.name,
          file.webViewLink || '',
          file.id,
          analysis.category,
          analysis.source,
          analysis.title,
          analysis.summary,
          JSON.stringify(analysis),
        ]
      );

      const docId = docResult.lastInsertRowId;

      // Save events
      for (const event of analysis.events) {
        const eventResult = await db.runAsync(
          'INSERT INTO events (document_id, title, date, start_time, end_time, location, target_person, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [docId, event.title, event.date, event.startTime || null, event.endTime || null, event.location || null, event.targetPerson, event.description]
        );

        // Auto-register to Google Calendar
        if (autoRegister) {
          try {
            const calEventId = await createCalendarEvent({
              title: event.title,
              date: event.date,
              startTime: event.startTime,
              endTime: event.endTime,
              location: event.location,
              targetPerson: event.targetPerson,
              description: event.description,
              driveFileId: file.id,
              documentTitle: analysis.title,
            });
            await db.runAsync('UPDATE events SET calendar_event_id = ? WHERE id = ?', [calEventId, eventResult.lastInsertRowId]);
          } catch { /* Calendar registration is best-effort */ }
        }
      }

      // Save todos
      for (const todo of analysis.todos) {
        const todoResult = await db.runAsync(
          'INSERT INTO todos (document_id, title, due_date, target_person, description) VALUES (?, ?, ?, ?, ?)',
          [docId, todo.title, todo.dueDate || null, todo.targetPerson, todo.description]
        );

        if (autoRegister) {
          try {
            const taskId = await createTask({
              title: todo.title,
              dueDate: todo.dueDate,
              targetPerson: todo.targetPerson,
              description: todo.description,
              driveFileId: file.id,
            });
            await db.runAsync('UPDATE todos SET task_id = ? WHERE id = ?', [taskId, todoResult.lastInsertRowId]);
            if (todo.dueDate) {
              registerReminder({ title: todo.title, dueDate: todo.dueDate, targetPerson: todo.targetPerson, type: 'todo', documentTitle: analysis.title, driveFileId: file.id }).catch(() => {});
            }
          } catch { /* Task registration is best-effort */ }
        }
      }

      // Save items
      for (const item of analysis.items) {
        await db.runAsync(
          'INSERT INTO items (document_id, name, due_date, target_person, description) VALUES (?, ?, ?, ?, ?)',
          [docId, item.name, item.dueDate || null, item.targetPerson, item.description]
        );

        if (autoRegister) {
          try {
            await createTask({
              title: item.name,
              dueDate: item.dueDate,
              targetPerson: item.targetPerson,
              description: item.description,
              isItem: true,
              driveFileId: file.id,
            });
            if (item.dueDate) {
              registerReminder({ title: item.name, dueDate: item.dueDate, targetPerson: item.targetPerson, type: 'item' }).catch(() => {});
            }
          } catch { /* Task registration is best-effort */ }
        }
      }

      // Send LINE notification
      sendLineNotification(analysis, file.id).catch(() => {});

      result.processed++;
      result.details.push(`✅ ${analysis.title}`);
    } catch (e: any) {
      result.errors++;
      result.details.push(`❌ ${file.name}: ${e.message}`);
    }
  }

  return result;
}
