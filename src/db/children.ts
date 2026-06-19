import { getDatabase } from './database';
import type { Child } from '../types';

export async function getChildren(): Promise<Child[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM children ORDER BY created_at');
  return rows.map(mapChild);
}

export async function getChild(id: number): Promise<Child | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM children WHERE id = ?', [id]);
  return row ? mapChild(row) : null;
}

export async function createChild(child: Omit<Child, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO children (name, gender, birthdate, class_name, facility_id) VALUES (?, ?, ?, ?, ?)',
    [child.name, child.gender, child.birthdate, child.className, child.facilityId]
  );
  return result.lastInsertRowId;
}

export async function updateChild(id: number, child: Partial<Omit<Child, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (child.name !== undefined) { fields.push('name = ?'); values.push(child.name); }
  if (child.gender !== undefined) { fields.push('gender = ?'); values.push(child.gender); }
  if (child.birthdate !== undefined) { fields.push('birthdate = ?'); values.push(child.birthdate); }
  if (child.className !== undefined) { fields.push('class_name = ?'); values.push(child.className); }
  if (child.facilityId !== undefined) { fields.push('facility_id = ?'); values.push(child.facilityId); }

  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.runAsync(`UPDATE children SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteChild(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM children WHERE id = ?', [id]);
}

function mapChild(row: any): Child {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    birthdate: row.birthdate,
    className: row.class_name,
    facilityId: row.facility_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
