import { Router, Request, Response } from 'express';
import { db, getActiveCampaign, CampaignRecord } from '../db.js';
import { seedDatabase, getDatesInRange } from '../seeder.js';

export const metricsRouter = Router();

interface ShiftRow {
  shift_date: string;
  shift_id: number;
  total_visitors: number;
  avg_headcount_per_slot: number;
  avg_dwell_seconds: number;
  total_adult_male: number;
  total_adult_female: number;
  total_kid_male: number;
  total_kid_female: number;
  total_male: number;
  total_female: number;
  total_adult: number;
  total_kid: number;
}

// 1. GET /api/shifts/summary - Aggregated metrics for shifts of the active campaign
metricsRouter.get('/shifts/summary', (req: Request, res: Response) => {
  try {
    const campaignIdParam = req.query.campaign_id ? Number(req.query.campaign_id) : null;
    let campaign: CampaignRecord | null = null;

    if (campaignIdParam) {
      campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignIdParam) as unknown as CampaignRecord | null;
    } else {
      campaign = getActiveCampaign();
    }

    const campaignId = campaign ? campaign.id : 1;

    // Fetch existing records grouped by shift_date and shift_id (Staff is excluded from totals)
    const query = `
      SELECT 
        shift_date,
        shift_id,
        COUNT(CASE WHEN is_staff = 0 OR is_staff IS NULL THEN 1 END) as total_visitors,
        ROUND(SUM(CASE WHEN is_staff = 0 OR is_staff IS NULL THEN dwell_time ELSE 0 END) / 21600.0, 1) as avg_headcount_per_slot,
        ROUND(AVG(CASE WHEN is_staff = 0 OR is_staff IS NULL THEN dwell_time END), 0) as avg_dwell_seconds,
        SUM(CASE WHEN (is_staff = 0 OR is_staff IS NULL) AND gender = 'M' AND age_group = 'Adult' THEN 1 ELSE 0 END) as total_adult_male,
        SUM(CASE WHEN (is_staff = 0 OR is_staff IS NULL) AND gender = 'F' AND age_group = 'Adult' THEN 1 ELSE 0 END) as total_adult_female,
        SUM(CASE WHEN (is_staff = 0 OR is_staff IS NULL) AND gender = 'M' AND age_group = 'Kid' THEN 1 ELSE 0 END) as total_kid_male,
        SUM(CASE WHEN (is_staff = 0 OR is_staff IS NULL) AND gender = 'F' AND age_group = 'Kid' THEN 1 ELSE 0 END) as total_kid_female,
        SUM(CASE WHEN (is_staff = 0 OR is_staff IS NULL) AND gender = 'M' THEN 1 ELSE 0 END) as total_male,
        SUM(CASE WHEN (is_staff = 0 OR is_staff IS NULL) AND gender = 'F' THEN 1 ELSE 0 END) as total_female,
        SUM(CASE WHEN (is_staff = 0 OR is_staff IS NULL) AND age_group = 'Adult' THEN 1 ELSE 0 END) as total_adult,
        SUM(CASE WHEN (is_staff = 0 OR is_staff IS NULL) AND age_group = 'Kid' THEN 1 ELSE 0 END) as total_kid
      FROM visitor_sessions
      WHERE campaign_id = ?
      GROUP BY shift_date, shift_id
      ORDER BY shift_date ASC, shift_id ASC
    `;

    const stmt = db.prepare(query);
    const existingRows = stmt.all(campaignId) as unknown as ShiftRow[];

    // Create a lookup map for existing shift data: key = "YYYY-MM-DD_shiftId"
    const shiftMap = new Map<string, ShiftRow>();
    for (const row of existingRows) {
      shiftMap.set(`${row.shift_date}_${row.shift_id}`, row);
    }

    let finalRows: ShiftRow[] = [];

    // If campaign has defined start_date and end_date, dynamically generate all slots for this event!
    if (campaign?.start_date && campaign?.end_date) {
      const dates = getDatesInRange(campaign.start_date, campaign.end_date);
      for (const d of dates) {
        for (const shiftId of [1, 2]) {
          const key = `${d}_${shiftId}`;
          if (shiftMap.has(key)) {
            finalRows.push(shiftMap.get(key)!);
          } else {
            // Empty placeholder slot waiting for data
            finalRows.push({
              shift_date: d,
              shift_id: shiftId,
              total_visitors: 0,
              avg_headcount_per_slot: 0,
              avg_dwell_seconds: 0,
              total_adult_male: 0,
              total_adult_female: 0,
              total_kid_male: 0,
              total_kid_female: 0,
              total_male: 0,
              total_female: 0,
              total_adult: 0,
              total_kid: 0,
            });
          }
        }
      }
    } else {
      finalRows = existingRows;
    }

    return res.json({
      campaign_id: campaignId,
      campaign_name: campaign?.campaign_name || 'Active Campaign',
      data: finalRows,
    });
  } catch (err: any) {
    console.error('[GET /api/shifts/summary error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/shifts/:date/:shiftId/visitors - Detailed visitor session records for a shift
metricsRouter.get('/shifts/:date/:shiftId/visitors', (req: Request, res: Response) => {
  try {
    const { date, shiftId } = req.params;
    const campaignId = req.query.campaign_id ? Number(req.query.campaign_id) : (getActiveCampaign()?.id || 1);

    const stmt = db.prepare(`
      SELECT 
        id, visitor_id, campaign_id, start_time, end_time, dwell_time, gender, age_group, shift_date, shift_id,
        is_staff, evidence_image_url
      FROM visitor_sessions
      WHERE campaign_id = ? AND shift_date = ? AND shift_id = ?
      ORDER BY start_time ASC
    `);

    const rows = stmt.all(campaignId, date, Number(shiftId));

    return res.json({
      count: rows.length,
      campaign_id: campaignId,
      shift_date: date,
      shift_id: Number(shiftId),
      data: rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2b. PATCH /api/sessions/staff-status - Batch mark visitor sessions as Staff or Visitor
metricsRouter.patch('/sessions/staff-status', (req: Request, res: Response) => {
  try {
    const { session_ids, is_staff } = req.body;
    if (!Array.isArray(session_ids) || session_ids.length === 0) {
      return res.status(400).json({ error: 'session_ids must be a non-empty array of session IDs.' });
    }

    const staffVal = is_staff ? 1 : 0;
    const placeholders = session_ids.map(() => '?').join(',');
    const stmt = db.prepare(`UPDATE visitor_sessions SET is_staff = ? WHERE id IN (${placeholders})`);
    stmt.run(staffVal, ...session_ids);

    return res.json({
      success: true,
      updated_count: session_ids.length,
      is_staff: staffVal,
      message: `Successfully marked ${session_ids.length} session(s) as ${staffVal === 1 ? 'Staff' : 'Visitor'}.`,
    });
  } catch (err: any) {
    console.error('[PATCH /api/sessions/staff-status error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Backward compatibility /api/summary
metricsRouter.get('/summary', (req: Request, res: Response) => {
  return res.redirect('/api/shifts/summary');
});

// Core helper to insert an array of visitor session records within a transaction
function insertVisitorSessions(rawRecords: any[]) {
  const activeCampaign = getActiveCampaign();
  const defaultCampaignId = activeCampaign?.id || 1;

  const insertStmt = db.prepare(`
    INSERT INTO visitor_sessions (
      visitor_id, campaign_id, start_time, end_time, dwell_time, gender, age_group, shift_date, shift_id,
      evidence_image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let insertedCount = 0;
  const insertedIds: string[] = [];

  db.exec('BEGIN TRANSACTION');

  try {
    for (let i = 0; i < rawRecords.length; i++) {
      const item = rawRecords[i];
      if (!item || typeof item !== 'object') continue;

      const visitorId = (typeof item.visitor_id === 'string' && item.visitor_id.trim())
        ? item.visitor_id.trim()
        : `VIS-${Date.now()}-${i + 1}`;

      const campaignId = item.campaign_id ? Number(item.campaign_id) : defaultCampaignId;

      const nowIso = new Date().toISOString();
      const startTimeStr = (typeof item.start_time === 'string' && item.start_time.trim())
        ? item.start_time.trim()
        : nowIso;
      const startDate = new Date(startTimeStr);
      const validStartDate = !isNaN(startDate.getTime()) ? startDate : new Date();

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

      const rawGender = String(item.gender || '').trim().toUpperCase();
      const gender: 'M' | 'F' = (rawGender === 'F' || rawGender === 'FEMALE') ? 'F' : 'M';

      const rawAge = String(item.age_group || '').trim().toLowerCase();
      const ageGroup: 'Adult' | 'Kid' = (rawAge === 'kid' || rawAge === 'child' || rawAge === 'children') ? 'Kid' : 'Adult';

      let shiftDate = (typeof item.shift_date === 'string' && item.shift_date.trim())
        ? item.shift_date.trim()
        : validStartDate.toISOString().split('T')[0];

      let shiftId = Number(item.shift_id);
      if (shiftId !== 1 && shiftId !== 2) {
        const hour = validStartDate.getHours();
        shiftId = (hour >= 15 && hour < 21) ? 2 : 1;
      }

      const evidenceImageUrl = (typeof item.evidence_image_url === 'string' && item.evidence_image_url.trim())
        ? item.evidence_image_url.trim()
        : null;

      insertStmt.run(
        visitorId,
        campaignId,
        validStartDate.toISOString(),
        endTimeStr || validStartDate.toISOString(),
        dwellSec ?? 0,
        gender,
        ageGroup,
        shiftDate,
        shiftId,
        evidenceImageUrl
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

// 6. POST /api/seed - Re-seed database for a specific campaign or active campaign
metricsRouter.post('/seed', (req: Request, res: Response) => {
  const targetCampaignId = req.body?.campaign_id || req.query.campaign_id ? Number(req.body?.campaign_id || req.query.campaign_id) : undefined;
  const count = seedDatabase(true, targetCampaignId);
  return res.json({ message: 'Database reset and re-seeded successfully for visitor_sessions', recordsInserted: count });
});
