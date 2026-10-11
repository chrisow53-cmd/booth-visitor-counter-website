import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'visitor_tracking.db');

export const db = new DatabaseSync(DB_PATH);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS visitor_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      dwell_time INTEGER NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('M', 'F')),
      age_group TEXT NOT NULL CHECK(age_group IN ('Adult', 'Kid')),
      shift_date TEXT NOT NULL,
      shift_id INTEGER NOT NULL CHECK(shift_id IN (1, 2))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_shift ON visitor_sessions(shift_date, shift_id);
  `);

  console.log('[SQLite] Database initialized at:', DB_PATH);
}
