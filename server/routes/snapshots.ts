import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db, getActiveCampaign } from '../db.js';
import { uploadToStorage, getActiveStorageInfo } from '../storage.js';

export const snapshotsRouter = Router();

// Use memory storage — no files ever touch the local disk
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/snapshots
 * Accepts a multipart/form-data image upload, streams the buffer to Cloud Storage (GCP or Supabase),
 * logs the resulting public URL in the cctv_snapshots table, and returns the record.
 *
 * Form fields:
 *   - image  (file, required)  — the CCTV snapshot image
 *   - timestamp (string, optional) — ISO timestamp; defaults to now
 */
snapshotsRouter.post('/snapshots', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided. Send a multipart/form-data request with an "image" field.' });
    }

    const timestamp = (typeof req.body?.timestamp === 'string' && req.body.timestamp.trim())
      ? req.body.timestamp.trim()
      : new Date().toISOString();

    // Build a unique, date-partitioned storage path — no local file I/O
    const datePart = timestamp.split('T')[0]; // "YYYY-MM-DD"
    const ext = req.file.mimetype.split('/')[1] || 'jpg';
    const storagePath = `snapshots/${datePart}/${Date.now()}-${req.file.originalname || `snapshot.${ext}`}`;

    // Upload the in-memory buffer to Cloud Storage (GCP or Supabase)
    const { url: imageUrl, provider } = await uploadToStorage(
      req.file.buffer,
      storagePath,
      req.file.mimetype
    );

    const campaignId = req.body?.campaign_id ? Number(req.body.campaign_id) : (getActiveCampaign()?.id || 1);

    // Persist the snapshot record in SQLite
    const stmt = db.prepare(`
      INSERT INTO cctv_snapshots (campaign_id, timestamp, image_url) VALUES (?, ?, ?)
    `);
    const result = stmt.run(campaignId, timestamp, imageUrl);

    return res.status(201).json({
      success: true,
      provider,
      snapshot: {
        id: Number(result.lastInsertRowid),
        campaign_id: campaignId,
        timestamp,
        image_url: imageUrl,
      },
    });
  } catch (err: any) {
    console.error('[Snapshots] Storage upload error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/snapshots
 * Returns the most recent CCTV snapshots (default: last 20) for the active campaign.
 * Query params:
 *   - limit (number, optional) — max records to return, default 20, max 100
 *   - campaign_id (number, optional)
 */
snapshotsRouter.get('/snapshots', (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const campaignId = req.query.campaign_id ? Number(req.query.campaign_id) : (getActiveCampaign()?.id || 1);

    const stmt = db.prepare(`
      SELECT id, campaign_id, timestamp, image_url
      FROM cctv_snapshots
      WHERE campaign_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(campaignId, limit);

    return res.json({
      count: rows.length,
      campaign_id: campaignId,
      data: rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
