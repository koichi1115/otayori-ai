import { getDatabase } from './database';
import type { Facility } from '../types';

export async function getFacilities(): Promise<Facility[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM facilities ORDER BY created_at');
  return rows.map(mapFacility);
}

export async function getFacility(id: number): Promise<Facility | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM facilities WHERE id = ?', [id]);
  return row ? mapFacility(row) : null;
}

export async function createFacility(facility: Omit<Facility, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO facilities (name, type, address, notes) VALUES (?, ?, ?, ?)',
    [facility.name, facility.type, facility.address, facility.notes]
  );
  return result.lastInsertRowId;
}

export async function updateFacility(id: number, facility: Partial<Omit<Facility, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (facility.name !== undefined) { fields.push('name = ?'); values.push(facility.name); }
  if (facility.type !== undefined) { fields.push('type = ?'); values.push(facility.type); }
  if (facility.address !== undefined) { fields.push('address = ?'); values.push(facility.address); }
  if (facility.notes !== undefined) { fields.push('notes = ?'); values.push(facility.notes); }

  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.runAsync(`UPDATE facilities SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteFacility(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM facilities WHERE id = ?', [id]);
}

function mapFacility(row: any): Facility {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
