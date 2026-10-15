import { Router, Request, Response } from 'express';
import { db, getActiveCampaign, CampaignRecord } from '../db.js';

export const campaignRouter = Router();

// GET /api/campaign - Retrieve active campaign configuration (or by query ?id=)
campaignRouter.get('/campaign', (req: Request, res: Response) => {
  try {
    const id = req.query.id ? Number(req.query.id) : null;
    let row: CampaignRecord | null = null;

    if (id) {
      row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as unknown as CampaignRecord | null;
    } else {
      row = getActiveCampaign();
    }

    if (!row) {
      return res.status(404).json({ error: 'No active campaign found' });
    }

    return res.json({ data: row });
  } catch (err: any) {
    console.error('[GET /api/campaign error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns - List all campaigns with their total visitor counts
campaignRouter.get('/campaigns', (req: Request, res: Response) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        c.*,
        COUNT(v.id) as session_count
      FROM campaigns c
      LEFT JOIN visitor_sessions v ON v.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.is_active DESC, c.id DESC
    `);
    const rows = stmt.all();

    return res.json({ data: rows });
  } catch (err: any) {
    console.error('[GET /api/campaigns error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns - Create a new event/campaign and make it active
campaignRouter.post('/campaigns', (req: Request, res: Response) => {
  try {
    const {
      client_name,
      campaign_name,
      location,
      space_size_sqm,
      start_date,
      end_date,
    } = req.body;

    if (
      !client_name ||
      !campaign_name ||
      !location ||
      space_size_sqm === undefined ||
      !start_date ||
      !end_date
    ) {
      return res.status(400).json({
        error:
          'Missing required fields: client_name, campaign_name, location, space_size_sqm, start_date, end_date',
      });
    }

    const sizeNum = Number(space_size_sqm);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      return res.status(400).json({
        error: 'space_size_sqm must be a valid positive number',
      });
    }

    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION');
    try {
      // Deactivate all previous campaigns
      db.prepare('UPDATE campaigns SET is_active = 0').run();

      // Insert new active campaign
      const insertStmt = db.prepare(`
        INSERT INTO campaigns (
          client_name, campaign_name, location, space_size_sqm, start_date, end_date, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);

      const result = insertStmt.run(
        String(client_name).trim(),
        String(campaign_name).trim(),
        String(location).trim(),
        sizeNum,
        String(start_date).trim(),
        String(end_date).trim(),
        now,
        now
      );

      db.exec('COMMIT');

      const newId = Number(result.lastInsertRowid);
      const createdCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(newId);

      return res.status(201).json({
        success: true,
        message: 'New campaign event created successfully. Shift counters are fresh and waiting for telemetry.',
        data: createdCampaign,
      });
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  } catch (err: any) {
    console.error('[POST /api/campaigns error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/activate - Switch active campaign
campaignRouter.post('/campaigns/:id/activate', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const exists = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(id);
    if (!exists) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare('UPDATE campaigns SET is_active = 0').run();
      db.prepare('UPDATE campaigns SET is_active = 1 WHERE id = ?').run(id);
      db.exec('COMMIT');

      const active = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
      return res.json({
        success: true,
        message: 'Active campaign switched successfully',
        data: active,
      });
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  } catch (err: any) {
    console.error('[POST /api/campaigns/:id/activate error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/campaign - Update currently active campaign configuration
campaignRouter.put('/campaign', (req: Request, res: Response) => {
  try {
    const active = getActiveCampaign();
    if (!active) {
      return res.status(404).json({ error: 'No active campaign to update' });
    }
    return updateCampaignRecord(active.id, req, res);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/campaigns/:id - Update specific campaign configuration
campaignRouter.put('/campaigns/:id', (req: Request, res: Response) => {
  return updateCampaignRecord(Number(req.params.id), req, res);
});

function updateCampaignRecord(id: number, req: Request, res: Response) {
  try {
    const {
      client_name,
      campaign_name,
      location,
      space_size_sqm,
      start_date,
      end_date,
    } = req.body;

    if (
      !client_name ||
      !campaign_name ||
      !location ||
      space_size_sqm === undefined ||
      !start_date ||
      !end_date
    ) {
      return res.status(400).json({
        error:
          'Missing required fields: client_name, campaign_name, location, space_size_sqm, start_date, end_date',
      });
    }

    const sizeNum = Number(space_size_sqm);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      return res.status(400).json({
        error: 'space_size_sqm must be a valid positive number',
      });
    }

    const updatedAt = new Date().toISOString();

    const updateStmt = db.prepare(`
      UPDATE campaigns
      SET 
        client_name = ?,
        campaign_name = ?,
        location = ?,
        space_size_sqm = ?,
        start_date = ?,
        end_date = ?,
        updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      String(client_name).trim(),
      String(campaign_name).trim(),
      String(location).trim(),
      sizeNum,
      String(start_date).trim(),
      String(end_date).trim(),
      updatedAt,
      id
    );

    const updatedRow = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);

    return res.json({
      success: true,
      message: 'Campaign settings updated successfully',
      data: updatedRow,
    });
  } catch (err: any) {
    console.error('[Update campaign error]:', err);
    return res.status(500).json({ error: err.message });
  }
}

// DELETE /api/campaigns/:id - Delete an event with data protection
campaignRouter.delete('/campaigns/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as unknown as CampaignRecord | undefined;
    if (!campaign) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check how many campaigns exist total
    const totalCampaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number };
    if (totalCampaigns.count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only remaining event. At least one event must exist.' });
    }

    // Check if this campaign has visitor data
    const sessionCount = db.prepare('SELECT COUNT(*) as count FROM visitor_sessions WHERE campaign_id = ?').get(id) as { count: number };

    // If it has data, block deletion to protect connected data
    if (sessionCount.count > 0) {
      return res.status(400).json({
        error: `Cannot delete event "${campaign.campaign_name}" because it already has ${sessionCount.count.toLocaleString()} visitor records connected to it. Data is protected against accidental loss.`,
        session_count: sessionCount.count,
        protected: true,
      });
    }

    // If it has NO data, safe to delete!
    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);

      // If the deleted event was the active one, make the newest remaining event active
      if (campaign.is_active === 1) {
        const nextActive = db.prepare('SELECT id FROM campaigns ORDER BY id DESC LIMIT 1').get() as { id: number } | undefined;
        if (nextActive) {
          db.prepare('UPDATE campaigns SET is_active = 1 WHERE id = ?').run(nextActive.id);
        }
      }

      db.exec('COMMIT');

      const active = getActiveCampaign();
      return res.json({
        success: true,
        message: `Event "${campaign.campaign_name}" was safely deleted.`,
        active_campaign: active,
      });
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  } catch (err: any) {
    console.error('[DELETE /api/campaigns/:id error]:', err);
    return res.status(500).json({ error: err.message });
  }
});
