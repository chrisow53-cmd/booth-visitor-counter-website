import { db, getActiveCampaign } from './db.js';

/**
 * Generate a list of YYYY-MM-DD date strings between startDate and endDate (inclusive).
 */
export function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startDateStr);
  const end = new Date(endDateStr);

  // Fallback if invalid
  if (isNaN(curr.getTime()) || isNaN(end.getTime())) {
    return [startDateStr];
  }

  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  return dates;
}

export function seedDatabase(force = false, targetCampaignId?: number) {
  const activeCampaign = getActiveCampaign();
  const campaignId = targetCampaignId || activeCampaign?.id || 1;

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM visitor_sessions WHERE campaign_id = ?');
  const result = countStmt.get(campaignId) as { count: number };

  if (result.count > 0 && !force) {
    console.log(`[Seeder] Campaign #${campaignId} already contains ${result.count} visitor sessions. Skipping seed.`);
    return result.count;
  }

  if (force) {
    db.prepare('DELETE FROM visitor_sessions WHERE campaign_id = ?').run(campaignId);
    console.log(`[Seeder] Cleared existing visitor sessions data for campaign #${campaignId}.`);
  }

  const insertStmt = db.prepare(`
    INSERT INTO visitor_sessions (
      visitor_id, campaign_id, start_time, end_time, dwell_time, gender, age_group, shift_date, shift_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Use campaign dates or fallback
  const startDate = activeCampaign?.start_date || '2026-10-15';
  const endDate = activeCampaign?.end_date || '2026-10-18';
  const dates = getDatesInRange(startDate, endDate);

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
        // Generate ~1850-1950 visitor sessions per shift
        const sessionCount = 1850 + Math.floor(Math.random() * 100);
        const shiftStartMs = new Date(`${dateStr}T${shift.startHour.toString().padStart(2, '0')}:00:00Z`).getTime();
        const shiftDurationMs = 6 * 60 * 60 * 1000; // 6 hours = 21,600,000 ms

        for (let i = 0; i < sessionCount; i++) {
          const visId = `VIS-${visitorCounter++}`;
          
          const offsetMs = Math.floor(Math.random() * (shiftDurationMs - 300000));
          const startTime = new Date(shiftStartMs + offsetMs);

          const dwellSec = Math.floor(180 + Math.random() * 160);
          const endTime = new Date(startTime.getTime() + dwellSec * 1000);

          const gender = Math.random() < 0.51 ? 'M' : 'F';
          const ageGroup = Math.random() < 0.81 ? 'Adult' : 'Kid';

          insertStmt.run(
            visId,
            campaignId,
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
    console.log(`[Seeder] Successfully seeded ${totalInserted} visitor sessions across ${dates.length} days for Campaign #${campaignId}.`);
    return totalInserted;
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('[Seeder] Error seeding database:', error);
    throw error;
  }
}
