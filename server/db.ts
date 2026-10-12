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

    CREATE TABLE IF NOT EXISTS campaign_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      client_name TEXT NOT NULL,
      campaign_name TEXT NOT NULL,
      location TEXT NOT NULL,
      space_size_sqm REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    INSERT OR IGNORE INTO campaign_settings (
      id, client_name, campaign_name, location, space_size_sqm, start_date, end_date, updated_at
    ) VALUES (
      1,
      'CARCHING Global',
      '4-Day Automotive Offline Exhibition',
      'Mid Valley Exhibition Centre (Hall 1)',
      250.0,
      '2026-10-03',
      '2026-10-06',
      datetime('now')
    );
  `);

  console.log('[SQLite] Database initialized at:', DB_PATH);
}
