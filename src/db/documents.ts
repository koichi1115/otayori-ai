import { getDatabase } from './database';

export async function toggleTodoCompleted(id: number): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ is_completed: number }>('SELECT is_completed FROM todos WHERE id = ?', [id]);
  if (!row) return false;
  const newValue = row.is_completed ? 0 : 1;
  await db.runAsync('UPDATE todos SET is_completed = ? WHERE id = ?', [newValue, id]);
  return newValue === 1;
}

export async function toggleItemCompleted(id: number): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ is_completed: number }>('SELECT is_completed FROM items WHERE id = ?', [id]);
  if (!row) return false;
  const newValue = row.is_completed ? 0 : 1;
  await db.runAsync('UPDATE items SET is_completed = ? WHERE id = ?', [newValue, id]);
  return newValue === 1;
}

export async function updateTodo(id: number, fields: { title?: string; dueDate?: string | null; targetPerson?: string; description?: string }): Promise<void> {
  const db = await getDatabase();
  const parts: string[] = [];
  const values: any[] = [];
  if (fields.title !== undefined) { parts.push('title = ?'); values.push(fields.title); }
  if (fields.dueDate !== undefined) { parts.push('due_date = ?'); values.push(fields.dueDate); }
  if (fields.targetPerson !== undefined) { parts.push('target_person = ?'); values.push(fields.targetPerson); }
  if (fields.description !== undefined) { parts.push('description = ?'); values.push(fields.description); }
  if (parts.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE todos SET ${parts.join(', ')} WHERE id = ?`, values);
}

export async function updateItem(id: number, fields: { name?: string; dueDate?: string | null; targetPerson?: string; description?: string }): Promise<void> {
  const db = await getDatabase();
  const parts: string[] = [];
  const values: any[] = [];
  if (fields.name !== undefined) { parts.push('name = ?'); values.push(fields.name); }
  if (fields.dueDate !== undefined) { parts.push('due_date = ?'); values.push(fields.dueDate); }
  if (fields.targetPerson !== undefined) { parts.push('target_person = ?'); values.push(fields.targetPerson); }
  if (fields.description !== undefined) { parts.push('description = ?'); values.push(fields.description); }
  if (parts.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE items SET ${parts.join(', ')} WHERE id = ?`, values);
}

export async function updateEvent(id: number, fields: { title?: string; date?: string; startTime?: string | null; endTime?: string | null; location?: string | null; targetPerson?: string; description?: string }): Promise<void> {
  const db = await getDatabase();
  const parts: string[] = [];
  const values: any[] = [];
  if (fields.title !== undefined) { parts.push('title = ?'); values.push(fields.title); }
  if (fields.date !== undefined) { parts.push('date = ?'); values.push(fields.date); }
  if (fields.startTime !== undefined) { parts.push('start_time = ?'); values.push(fields.startTime); }
  if (fields.endTime !== undefined) { parts.push('end_time = ?'); values.push(fields.endTime); }
  if (fields.location !== undefined) { parts.push('location = ?'); values.push(fields.location); }
  if (fields.targetPerson !== undefined) { parts.push('target_person = ?'); values.push(fields.targetPerson); }
  if (fields.description !== undefined) { parts.push('description = ?'); values.push(fields.description); }
  if (parts.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE events SET ${parts.join(', ')} WHERE id = ?`, values);
}

export async function deleteTodo(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM todos WHERE id = ?', [id]);
}

export async function deleteItem(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
}

export async function deleteEvent(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
}

export async function deleteDocument(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM documents WHERE id = ?', [id]);
}

export async function updateDocumentCategory(id: number, category: 'notice' | 'action_required'): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE documents SET category = ?, updated_at = datetime('now') WHERE id = ?", [category, id]);
}
