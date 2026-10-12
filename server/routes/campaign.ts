import { Router, Request, Response } from 'express';
import { db } from '../db.js';

export const campaignRouter = Router();

// GET /api/campaign - Retrieve active campaign configuration
campaignRouter.get('/campaign', (req: Request, res: Response) => {
  try {
    const stmt = db.prepare(`
      SELECT id, client_name, campaign_name, location, space_size_sqm, start_date, end_date, updated_at
      FROM campaign_settings
      WHERE id = 1
    `);
    const row = stmt.get();

    if (!row) {
      return res.status(404).json({ error: 'Campaign settings not found' });
    }

    return res.json({ data: row });
  } catch (err: any) {
    console.error('[GET /api/campaign error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/campaign - Update active campaign configuration
campaignRouter.put('/campaign', (req: Request, res: Response) => {
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
      UPDATE campaign_settings
      SET 
        client_name = ?,
        campaign_name = ?,
        location = ?,
        space_size_sqm = ?,
        start_date = ?,
        end_date = ?,
        updated_at = ?
      WHERE id = 1
    `);

    updateStmt.run(
      String(client_name).trim(),
      String(campaign_name).trim(),
      String(location).trim(),
      sizeNum,
      String(start_date).trim(),
      String(end_date).trim(),
      updatedAt
    );

    const getStmt = db.prepare(`
      SELECT id, client_name, campaign_name, location, space_size_sqm, start_date, end_date, updated_at
      FROM campaign_settings
      WHERE id = 1
    `);
    const updatedRow = getStmt.get();

    return res.json({
      success: true,
      message: 'Campaign settings updated successfully',
      data: updatedRow,
    });
  } catch (err: any) {
    console.error('[PUT /api/campaign error]:', err);
    return res.status(500).json({ error: err.message });
  }
});
