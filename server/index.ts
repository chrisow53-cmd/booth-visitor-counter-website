import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import { seedDatabase } from './seeder.js';
import { metricsRouter } from './routes/metrics.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite Database and seed initial event dataset if empty
initDatabase();
seedDatabase(false);

// API Routes
app.use('/api', metricsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString(), event: 'Carching 4-Day Offline Event' });
});

app.listen(PORT, () => {
  console.log(`[Express Backend] Visitor tracking API server running at http://localhost:${PORT}`);
});
