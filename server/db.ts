import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'visitor_tracking.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      campaign_name TEXT NOT NULL,
      location TEXT NOT NULL,
      space_size_sqm REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visitor_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      campaign_id INTEGER DEFAULT 1,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      dwell_time INTEGER NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('M', 'F')),
      age_group TEXT NOT NULL CHECK(age_group IN ('Adult', 'Kid')),
      shift_date TEXT NOT NULL,
      shift_id INTEGER NOT NULL CHECK(shift_id IN (1, 2)),
      is_staff INTEGER DEFAULT 0,
      evidence_image_url TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS cctv_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER DEFAULT 1,
      timestamp TEXT NOT NULL,
      image_url TEXT NOT NULL
    );
  `);

  // Check visitor_sessions columns and migrate legacy schema (e.g. session_id -> visitor_id)
  try {
    const sessionCols = db.prepare("PRAGMA table_info(visitor_sessions)").all() as { name: string; notnull: number }[];
    const colMap = new Set(sessionCols.map(c => c.name));

    if (colMap.has('session_id')) {
      console.log('[SQLite] Migrating legacy visitor_sessions schema (session_id -> visitor_id)...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS visitor_sessions_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          visitor_id TEXT NOT NULL,
          campaign_id INTEGER DEFAULT 1,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          dwell_time INTEGER NOT NULL,
          gender TEXT NOT NULL,
          age_group TEXT NOT NULL,
          shift_date TEXT NOT NULL,
          shift_id INTEGER NOT NULL,
          is_staff INTEGER DEFAULT 0,
          evidence_image_url TEXT DEFAULT NULL
        );
      `);

      const visIdExpr = colMap.has('visitor_id') ? "COALESCE(visitor_id, session_id, 'VIS-' || id)" : "COALESCE(session_id, 'VIS-' || id)";
      const campIdExpr = colMap.has('campaign_id') ? 'COALESCE(campaign_id, 1)' : '1';
      const staffExpr = colMap.has('is_staff') ? 'COALESCE(is_staff, 0)' : '0';
      const evExpr = colMap.has('evidence_image_url') ? 'evidence_image_url' : 'NULL';

      db.exec(`
        INSERT INTO visitor_sessions_v2 (id, visitor_id, campaign_id, start_time, end_time, dwell_time, gender, age_group, shift_date, shift_id, is_staff, evidence_image_url)
        SELECT id, ${visIdExpr}, ${campIdExpr}, start_time, end_time, dwell_time, gender, age_group, shift_date, shift_id, ${staffExpr}, ${evExpr}
        FROM visitor_sessions;
      `);

      db.exec(`DROP TABLE visitor_sessions;`);
      db.exec(`ALTER TABLE visitor_sessions_v2 RENAME TO visitor_sessions;`);
      console.log('[SQLite] Legacy visitor_sessions table successfully upgraded to modern schema!');
    }
  } catch (migErr) {
    console.error('[SQLite] Error migrating visitor_sessions table:', migErr);
  }

  // Migrate existing tables: add campaign_id, is_staff, and evidence_image_url if missing
  try {
    db.exec(`ALTER TABLE visitor_sessions ADD COLUMN campaign_id INTEGER DEFAULT 1;`);
    console.log('[SQLite] Migrated visitor_sessions: added campaign_id column.');
  } catch {}

  try {
    db.exec(`UPDATE visitor_sessions SET campaign_id = 1 WHERE campaign_id IS NULL;`);
  } catch {}

  try {
    db.exec(`ALTER TABLE visitor_sessions ADD COLUMN is_staff INTEGER DEFAULT 0;`);
    console.log('[SQLite] Migrated visitor_sessions: added is_staff column.');
  } catch {}

  try {
    db.exec(`UPDATE visitor_sessions SET is_staff = 0 WHERE is_staff IS NULL;`);
  } catch {}

  try {
    db.exec(`ALTER TABLE visitor_sessions ADD COLUMN evidence_image_url TEXT DEFAULT NULL;`);
  } catch {}

  try {
    db.exec(`ALTER TABLE cctv_snapshots ADD COLUMN campaign_id INTEGER DEFAULT 1;`);
    console.log('[SQLite] Migrated cctv_snapshots: added campaign_id column.');
  } catch {}

  try {
    db.exec(`UPDATE cctv_snapshots SET campaign_id = 1 WHERE campaign_id IS NULL;`);
  } catch {}

  // Migrate campaigns table: ensure newer columns exist on legacy databases
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN is_active INTEGER DEFAULT 1;`);
    console.log('[SQLite] Migrated campaigns: added is_active column.');
  } catch {}

  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN client_name TEXT DEFAULT '';`);
  } catch {}

  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN campaign_name TEXT DEFAULT '';`);
  } catch {}

  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN location TEXT DEFAULT '';`);
  } catch {}

  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN space_size_sqm REAL DEFAULT 250.0;`);
  } catch {}

  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN start_date TEXT DEFAULT '';`);
  } catch {}

  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN end_date TEXT DEFAULT '';`);
  } catch {}

  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN created_at TEXT DEFAULT '';`);
  } catch {}

  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN updated_at TEXT DEFAULT '';`);
  } catch {}

  try {
    db.exec(`UPDATE campaigns SET is_active = 1 WHERE is_active IS NULL;`);
  } catch {}

  // Create indexes after columns are guaranteed to exist
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON visitor_sessions(campaign_id, shift_date, shift_id);`);
  } catch (err) {
    console.warn('[SQLite] Index warning:', err);
  }

  // Migrate from legacy campaign_settings if present, or create default campaign
  try {
    const countCheck = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number };
    if (countCheck.count === 0) {
      let migrated = false;
      try {
        const legacy = db.prepare('SELECT * FROM campaign_settings WHERE id = 1').get() as any;
        if (legacy) {
          db.prepare(`
            INSERT INTO campaigns (id, client_name, campaign_name, location, space_size_sqm, start_date, end_date, is_active, created_at, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          `).run(
            legacy.client_name,
            legacy.campaign_name,
            legacy.location,
            legacy.space_size_sqm,
            legacy.start_date,
            legacy.end_date,
            legacy.updated_at || new Date().toISOString(),
            legacy.updated_at || new Date().toISOString()
          );
          migrated = true;
          console.log('[SQLite] Migrated campaign_settings to campaigns table.');
        }
      } catch {}

      if (!migrated) {
        db.prepare(`
          INSERT INTO campaigns (id, client_name, campaign_name, location, space_size_sqm, start_date, end_date, is_active, created_at, updated_at)
          VALUES (1, 'Traveloka', 'UOB Rewards You Carnival 2026', 'Mid Valley Exhibition Centre (Hall 1)', 250.0, '2026-10-15', '2026-10-18', 1, datetime('now'), datetime('now'))
        `).run();
        console.log('[SQLite] Seeded initial active campaign.');
      }
    }
  } catch (err) {
    console.error('[SQLite] Error ensuring initial campaign:', err);
  }

  console.log('[SQLite] Database initialized at:', DB_PATH);
}

export interface CampaignRecord {
  id: number;
  client_name: string;
  campaign_name: string;
  location: string;
  space_size_sqm: number;
  start_date: string;
  end_date: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export function getActiveCampaign(): CampaignRecord | null {
  try {
    const row = db.prepare(`
      SELECT * FROM campaigns WHERE is_active = 1 ORDER BY id DESC LIMIT 1
    `).get() as unknown as CampaignRecord | undefined;

    if (row) return row;
  } catch (err) {
    console.warn('[SQLite] Notice querying is_active:', err);
  }

  // Fallback to latest campaign if none marked active
  try {
    return (db.prepare(`SELECT * FROM campaigns ORDER BY id DESC LIMIT 1`).get() as unknown as CampaignRecord) || null;
  } catch {
    return null;
  }
}
