import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { initDatabase } from './db.js';
import { seedDatabase } from './seeder.js';
import { metricsRouter } from './routes/metrics.js';
import { campaignRouter } from './routes/campaign.js';
import { snapshotsRouter } from './routes/snapshots.js';
import { getActiveStorageInfo, UPLOADS_DIR } from './storage.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// Initialize SQLite Database and seed initial event dataset if empty
initDatabase();
try {
  seedDatabase(false);
} catch (seedErr: any) {
  console.warn('[Seeder] Notice: Seeding completed or skipped:', seedErr.message);
}

// API Routes
app.use('/api', metricsRouter);
app.use('/api', campaignRouter);
app.use('/api', snapshotsRouter);

// Serve locally stored uploads (CCTV snapshots) if directory exists
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch {}
if (fs.existsSync(UPLOADS_DIR)) {
  app.use('/uploads', express.static(UPLOADS_DIR));
}

// Health check endpoint (reports storage configuration & status)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    event: 'Carching 4-Day Offline Event',
    storage: getActiveStorageInfo(),
  });
});

// In production (e.g. deployed to GCP Cloud Run / App Engine), serve compiled Vite frontend
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(PORT, HOST, () => {
  const storageInfo = getActiveStorageInfo();
  console.log(`[Express Backend] Visitor tracking API server running at http://${HOST}:${PORT}`);
  console.log(`[Express Backend] Active cloud storage provider: ${storageInfo.provider.toUpperCase()} (bucket: ${storageInfo.bucket})`);
});

// Production Error & Signal Guards
process.on('uncaughtException', (err) => {
  console.error('[Process Error] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process Error] Unhandled rejection:', reason);
});

process.on('SIGTERM', () => {
  console.log('[Express Backend] Received SIGTERM signal. Gracefully shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Express Backend] Received SIGINT signal. Closing...');
  server.close(() => {
    process.exit(0);
  });
});
