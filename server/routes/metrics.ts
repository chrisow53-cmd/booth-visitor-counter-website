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

// 4. POST /api/seed - Re-seed database
metricsRouter.post('/seed', (req: Request, res: Response) => {
  const count = seedDatabase(true);
  return res.json({ message: 'Database reset and re-seeded successfully for visitor_sessions', recordsInserted: count });
});
