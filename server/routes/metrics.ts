import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { seedDatabase } from '../seeder.js';

export const metricsRouter = Router();

// 1. GET /api/shifts/summary - Aggregated metrics for 8 shift blocks
metricsRouter.get('/shifts/summary', (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        shift_date,
        shift_id,
        COUNT(*) as total_visitors,
        ROUND(SUM(dwell_time) / 21600.0, 1) as avg_headcount_per_slot,
        ROUND(AVG(dwell_time), 0) as avg_dwell_seconds,
        SUM(CASE WHEN gender = 'M' AND age_group = 'Adult' THEN 1 ELSE 0 END) as total_adult_male,
        SUM(CASE WHEN gender = 'F' AND age_group = 'Adult' THEN 1 ELSE 0 END) as total_adult_female,
        SUM(CASE WHEN gender = 'M' AND age_group = 'Kid' THEN 1 ELSE 0 END) as total_kid_male,
        SUM(CASE WHEN gender = 'F' AND age_group = 'Kid' THEN 1 ELSE 0 END) as total_kid_female,
        SUM(CASE WHEN gender = 'M' THEN 1 ELSE 0 END) as total_male,
        SUM(CASE WHEN gender = 'F' THEN 1 ELSE 0 END) as total_female,
        SUM(CASE WHEN age_group = 'Adult' THEN 1 ELSE 0 END) as total_adult,
        SUM(CASE WHEN age_group = 'Kid' THEN 1 ELSE 0 END) as total_kid
      FROM visitor_sessions
      GROUP BY shift_date, shift_id
      ORDER BY shift_date ASC, shift_id ASC
    `;

    const stmt = db.prepare(query);
    const rows = stmt.all();

    return res.json({ data: rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/shifts/:date/:shiftId/visitors - Detailed visitor session records for a shift
metricsRouter.get('/shifts/:date/:shiftId/visitors', (req: Request, res: Response) => {
  try {
    const { date, shiftId } = req.params;

    const stmt = db.prepare(`
      SELECT 
        id, visitor_id, start_time, end_time, dwell_time, gender, age_group, shift_date, shift_id
      FROM visitor_sessions
      WHERE shift_date = ? AND shift_id = ?
      ORDER BY start_time ASC
    `);

    const rows = stmt.all(date, Number(shiftId));

    return res.json({
      count: rows.length,
      shift_date: date,
      shift_id: Number(shiftId),
      data: rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Backward compatibility /api/summary & /api/latest
metricsRouter.get('/summary', (req: Request, res: Response) => {
  return res.redirect('/api/shifts/summary');
});

// Core helper to insert an array of visitor session records within a transaction
function insertVisitorSessions(rawRecords: any[]) {
  const insertStmt = db.prepare(`
    INSERT INTO visitor_sessions (
      visitor_id, start_time, end_time, dwell_time, gender, age_group, shift_date, shift_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let insertedCount = 0;
  const insertedIds: string[] = [];

  db.exec('BEGIN TRANSACTION');

  try {
    for (let i = 0; i < rawRecords.length; i++) {
      const item = rawRecords[i];
      if (!item || typeof item !== 'object') continue;

      // Auto-generate or sanitize visitor ID
      const visitorId = (typeof item.visitor_id === 'string' && item.visitor_id.trim())
        ? item.visitor_id.trim()
        : `VIS-${Date.now()}-${i + 1}`;

      // Parse and validate start time
      const nowIso = new Date().toISOString();
      const startTimeStr = (typeof item.start_time === 'string' && item.start_time.trim())
        ? item.start_time.trim()
        : nowIso;
      const startDate = new Date(startTimeStr);
      const validStartDate = !isNaN(startDate.getTime()) ? startDate : new Date();

      // Calculate or validate dwell time & end time
      let dwellSec = typeof item.dwell_time === 'number' && !isNaN(item.dwell_time)
        ? Math.max(0, Math.round(item.dwell_time))
        : null;

      let endTimeStr = (typeof item.end_time === 'string' && item.end_time.trim())
        ? item.end_time.trim()
        : null;

      if (dwellSec !== null && !endTimeStr) {
        endTimeStr = new Date(validStartDate.getTime() + dwellSec * 1000).toISOString();
      } else if (endTimeStr && dwellSec === null) {
        const endDate = new Date(endTimeStr);
        const validEndDate = !isNaN(endDate.getTime()) ? endDate : validStartDate;
        dwellSec = Math.max(0, Math.round((validEndDate.getTime() - validStartDate.getTime()) / 1000));
      } else if (dwellSec === null && !endTimeStr) {
        dwellSec = 0;
        endTimeStr = validStartDate.toISOString();
      }

      // Normalize Gender ('M' | 'F')
      const rawGender = String(item.gender || '').trim().toUpperCase();
      const gender: 'M' | 'F' = (rawGender === 'F' || rawGender === 'FEMALE') ? 'F' : 'M';

      // Normalize Age Group ('Adult' | 'Kid')
      const rawAge = String(item.age_group || '').trim().toLowerCase();
      const ageGroup: 'Adult' | 'Kid' = (rawAge === 'kid' || rawAge === 'child' || rawAge === 'children') ? 'Kid' : 'Adult';

      // Derive Shift Date (YYYY-MM-DD) if missing
      let shiftDate = (typeof item.shift_date === 'string' && item.shift_date.trim())
        ? item.shift_date.trim()
        : validStartDate.toISOString().split('T')[0];

      // Derive Shift ID (1: 09:00-14:59, 2: 15:00-20:59) if missing
      let shiftId = Number(item.shift_id);
      if (shiftId !== 1 && shiftId !== 2) {
        const hour = validStartDate.getHours();
        shiftId = (hour >= 15 && hour < 21) ? 2 : 1;
      }

      insertStmt.run(
        visitorId,
        validStartDate.toISOString(),
        endTimeStr || validStartDate.toISOString(),
        dwellSec ?? 0,
        gender,
        ageGroup,
        shiftDate,
        shiftId
      );

      insertedCount++;
      insertedIds.push(visitorId);
    }

    db.exec('COMMIT');
  } catch (dbErr: any) {
    db.exec('ROLLBACK');
    console.error('[Metrics Router] Transaction rolled back due to error:', dbErr);
    throw dbErr;
  }

  return { insertedCount, insertedIds };
}

// 4. POST /api/sessions/batch - Batch insert visitor session records from counters/cameras
metricsRouter.post('/sessions/batch', (req: Request, res: Response) => {
  try {
    const rawRecords = Array.isArray(req.body)
      ? req.body
      : (req.body?.sessions || req.body?.records || req.body?.data || (req.body?.visitor_id ? [req.body] : []));

    if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
      return res.status(400).json({
        error: 'Invalid or empty payload. Provide an array of session records directly or within { sessions: [...] }.',
      });
    }

    const { insertedCount, insertedIds } = insertVisitorSessions(rawRecords);

    return res.status(201).json({
      success: true,
      message: `Successfully inserted ${insertedCount} visitor session(s).`,
      count: insertedCount,
      inserted_ids: insertedIds,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. POST /api/sessions - Single record convenience endpoint
metricsRouter.post('/sessions', (req: Request, res: Response) => {
  try {
    if (!req.body || (typeof req.body !== 'object')) {
      return res.status(400).json({ error: 'Payload body must be a valid visitor session object.' });
    }

    const records = Array.isArray(req.body) ? req.body : [req.body];
    const { insertedCount, insertedIds } = insertVisitorSessions(records);

    return res.status(201).json({
      success: true,
      message: `Successfully inserted visitor session.`,
      count: insertedCount,
      inserted_ids: insertedIds,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. POST /api/seed - Re-seed database
metricsRouter.post('/seed', (req: Request, res: Response) => {
  const count = seedDatabase(true);
  return res.json({ message: 'Database reset and re-seeded successfully for visitor_sessions', recordsInserted: count });
});

