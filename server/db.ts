import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'visitor_tracking.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (err: any) {
    console.warn(`[SQLite] Warning: Could not create directory for database (${err.message})`);
  }
}

export const db = new DatabaseSync(DB_PATH);

/**
 * Utility to inspect a table and ensure all expected columns exist.
 * If a column is missing from an older database schema, it dynamically adds it with a default value.
 */
function ensureTableColumns(tableName: string, expectedColumns: Record<string, string>) {
  try {
    const existingCols = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
    const existingSet = new Set(existingCols.map(c => c.name));

    for (const [colName, colDef] of Object.entries(expectedColumns)) {
      if (!existingSet.has(colName)) {
        try {
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDef};`);
          console.log(`[SQLite Migration] Added missing column "${colName}" to table "${tableName}".`);
        } catch (addErr: any) {
          console.warn(`[SQLite Migration] Notice adding ${colName} to ${tableName}:`, addErr.message);
        }
      }
    }
  } catch (err: any) {
    console.warn(`[SQLite Migration] Notice inspecting ${tableName}:`, err.message);
  }
}

/**
 * Ensures visitor_sessions matches the unified modern schema.
 * If a legacy database has "session_id NOT NULL" or lacks "visitor_id", this cleanly
 * rebuilds the table to eliminate constraint failures without losing any existing data.
 */
function migrateVisitorSessionsTable() {
  try {
    const cols = db.prepare("PRAGMA table_info(visitor_sessions)").all() as { name: string; notnull: number }[];
    const colMap = new Set(cols.map(c => c.name));

    // Check if legacy session_id exists or visitor_id is missing
    if (colMap.has('session_id') || !colMap.has('visitor_id')) {
      console.log('[SQLite Migration] Upgrading visitor_sessions schema to standardized unified format...');

      db.exec('PRAGMA foreign_keys = OFF;');
      db.exec('DROP TABLE IF EXISTS visitor_sessions_temp_upgrade;');

      db.exec(`
        CREATE TABLE visitor_sessions_temp_upgrade (
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

      const visIdExpr = (colMap.has('visitor_id') && colMap.has('session_id'))
        ? "COALESCE(visitor_id, session_id, 'VIS-' || id)"
        : colMap.has('visitor_id')
          ? "COALESCE(visitor_id, 'VIS-' || id)"
          : "COALESCE(session_id, 'VIS-' || id)";

      const campIdExpr = colMap.has('campaign_id') ? "COALESCE(campaign_id, 1)" : "1";
      const startTimeExpr = colMap.has('start_time') ? "COALESCE(start_time, datetime('now'))" : "datetime('now')";
      const endTimeExpr = colMap.has('end_time') ? "COALESCE(end_time, datetime('now'))" : "datetime('now')";
      const dwellExpr = colMap.has('dwell_time') ? "COALESCE(dwell_time, 0)" : "0";
      const genderExpr = colMap.has('gender') ? "COALESCE(gender, 'M')" : "'M'";
      const ageExpr = colMap.has('age_group') ? "COALESCE(age_group, 'Adult')" : "'Adult'";
      const dateExpr = colMap.has('shift_date') ? "COALESCE(shift_date, date('now'))" : "date('now')";
      const shiftExpr = colMap.has('shift_id') ? "COALESCE(shift_id, 1)" : "1";
      const staffExpr = colMap.has('is_staff') ? "COALESCE(is_staff, 0)" : "0";
      const evExpr = colMap.has('evidence_image_url') ? "evidence_image_url" : "NULL";

      db.exec(`
        INSERT INTO visitor_sessions_temp_upgrade (
          id, visitor_id, campaign_id, start_time, end_time, dwell_time, gender, age_group, shift_date, shift_id, is_staff, evidence_image_url
        )
        SELECT 
          id, ${visIdExpr}, ${campIdExpr}, ${startTimeExpr}, ${endTimeExpr}, ${dwellExpr}, ${genderExpr}, ${ageExpr}, ${dateExpr}, ${shiftExpr}, ${staffExpr}, ${evExpr}
        FROM visitor_sessions;
      `);

      db.exec(`DROP TABLE visitor_sessions;`);
      db.exec(`ALTER TABLE visitor_sessions_temp_upgrade RENAME TO visitor_sessions;`);
      db.exec('PRAGMA foreign_keys = ON;');
      console.log('[SQLite Migration] visitor_sessions table successfully upgraded to modern schema!');
    }
  } catch (err: any) {
    console.warn('[SQLite Migration] Note during visitor_sessions check:', err.message);
  }
}

export function initDatabase() {
  // 1. Ensure baseline tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL DEFAULT '',
      campaign_name TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      space_size_sqm REAL NOT NULL DEFAULT 250.0,
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
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

  // 2. Perform dynamic schema alignment across all tables
  migrateVisitorSessionsTable();

  ensureTableColumns('campaigns', {
    client_name: "TEXT DEFAULT ''",
    campaign_name: "TEXT DEFAULT ''",
    location: "TEXT DEFAULT ''",
    space_size_sqm: "REAL DEFAULT 250.0",
    start_date: "TEXT DEFAULT ''",
    end_date: "TEXT DEFAULT ''",
    is_active: "INTEGER DEFAULT 1",
    created_at: "TEXT DEFAULT ''",
    updated_at: "TEXT DEFAULT ''"
  });

  ensureTableColumns('visitor_sessions', {
    campaign_id: "INTEGER DEFAULT 1",
    is_staff: "INTEGER DEFAULT 0",
    evidence_image_url: "TEXT DEFAULT NULL"
  });

  ensureTableColumns('cctv_snapshots', {
    campaign_id: "INTEGER DEFAULT 1",
    shift_id: "INTEGER DEFAULT NULL",
    camera_id: "TEXT DEFAULT NULL"
  });

  // Ensure is_active values are non-null
  try {
    db.exec(`UPDATE campaigns SET is_active = 1 WHERE is_active IS NULL;`);
    db.exec(`UPDATE visitor_sessions SET is_staff = 0 WHERE is_staff IS NULL;`);
    db.exec(`UPDATE visitor_sessions SET campaign_id = 1 WHERE campaign_id IS NULL;`);
    db.exec(`UPDATE cctv_snapshots SET campaign_id = 1 WHERE campaign_id IS NULL;`);
  } catch {}

  // 3. Create performance indexes
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON visitor_sessions(campaign_id, shift_date, shift_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_snapshots_campaign_ts ON cctv_snapshots(campaign_id, timestamp);`);
  } catch (err: any) {
    console.warn('[SQLite] Index notice:', err.message);
  }

  // 4. Ensure an active campaign exists
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
            legacy.client_name || 'Traveloka',
            legacy.campaign_name || 'UOB Rewards You Carnival 2026',
            legacy.location || 'Mid Valley Exhibition Centre (Hall 1)',
            legacy.space_size_sqm || 250.0,
            legacy.start_date || '2026-10-15',
            legacy.end_date || '2026-10-18',
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
  } catch (err: any) {
    console.error('[SQLite] Error ensuring initial campaign:', err.message);
  }

  console.log('[SQLite] Database successfully initialized and verified at:', DB_PATH);
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
  } catch (err: any) {
    console.warn('[SQLite] Notice querying is_active:', err.message);
  }

  // Fallback to latest campaign if none marked active
  try {
    return (db.prepare(`SELECT * FROM campaigns ORDER BY id DESC LIMIT 1`).get() as unknown as CampaignRecord) || null;
  } catch {
    return null;
  }
}
