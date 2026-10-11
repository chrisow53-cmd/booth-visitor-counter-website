import { db } from './db.js';

export function seedDatabase(force = false) {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM visitor_sessions');
  const result = countStmt.get() as { count: number };

  if (result.count > 0 && !force) {
    console.log(`[Seeder] Database already contains ${result.count} visitor sessions. Skipping seed.`);
    return result.count;
  }

  if (force) {
    db.exec('DELETE FROM visitor_sessions');
    console.log('[Seeder] Cleared existing visitor sessions data.');
  }

  const insertStmt = db.prepare(`
    INSERT INTO visitor_sessions (
      visitor_id, start_time, end_time, dwell_time, gender, age_group, shift_date, shift_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const dates = ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06'];
  const shifts = [
    { id: 1, startHour: 9, endHour: 15 },  // Shift 1: 09:00:00 to 14:59:59
    { id: 2, startHour: 15, endHour: 21 } // Shift 2: 15:00:00 to 20:59:59
  ];

  let totalInserted = 0;
  let visitorCounter = 10001;

  db.exec('BEGIN TRANSACTION');

  try {
    for (const dateStr of dates) {
      for (const shift of shifts) {
        // Generate ~1850-1950 visitor sessions per shift to achieve ~22.5 avg headcount per slot & ~255-265s dwell time
        const sessionCount = 1850 + Math.floor(Math.random() * 100);
        const shiftStartMs = new Date(`${dateStr}T${shift.startHour.toString().padStart(2, '0')}:00:00Z`).getTime();
        const shiftDurationMs = 6 * 60 * 60 * 1000; // 6 hours = 21,600,000 ms

        for (let i = 0; i < sessionCount; i++) {
          const visId = `VIS-${visitorCounter++}`;
          
          // Random start time within shift (leave room for dwell time near the end)
          const offsetMs = Math.floor(Math.random() * (shiftDurationMs - 300000));
          const startTime = new Date(shiftStartMs + offsetMs);

          // Dwell time between 180s and 340s (mean ~260s)
          const dwellSec = Math.floor(180 + Math.random() * 160);
          const endTime = new Date(startTime.getTime() + dwellSec * 1000);

          // Demographics: ~51% Male, ~81% Adult
          const gender = Math.random() < 0.51 ? 'M' : 'F';
          const ageGroup = Math.random() < 0.81 ? 'Adult' : 'Kid';

          insertStmt.run(
            visId,
            startTime.toISOString(),
            endTime.toISOString(),
            dwellSec,
            gender,
            ageGroup,
            dateStr,
            shift.id
          );

          totalInserted++;
        }
      }
    }
    db.exec('COMMIT');
    console.log(`[Seeder] Successfully seeded ${totalInserted} visitor sessions across 4 days & 8 shifts.`);
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[Seeder] Seeding error:', err);
  }

  return totalInserted;
}
