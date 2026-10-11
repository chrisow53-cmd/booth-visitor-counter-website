import { TelemetryRecord, SummaryRecord, StaffConfig, AdjustedTelemetry, AdjustedSummary } from '../types/telemetry';

export function formatDwellTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function formatIsoTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    return isoString;
  }
}

export function processTelemetryRecord(rec: TelemetryRecord, staffConfig: StaffConfig): AdjustedTelemetry {
  const zoneDeduction = staffConfig.enabled ? (staffConfig.deductionPerZone[rec.zone_id] ?? 4) : 0;
  const rawHeadcount = rec.live_headcount;
  const netHeadcount = Math.max(0, rawHeadcount - zoneDeduction);
  
  const ratio = rawHeadcount > 0 ? netHeadcount / rawHeadcount : 0;

  const adjAdultMale = Math.round(rec.adult_male * ratio);
  const adjAdultFemale = Math.round(rec.adult_female * ratio);
  const adjKidMale = Math.round(rec.kid_male * ratio);
  const adjKidFemale = Math.round(rec.kid_female * ratio);

  return {
    ...rec,
    net_headcount: netHeadcount,
    staff_deduction: zoneDeduction,
    adjusted_adult_male: adjAdultMale,
    adjusted_adult_female: adjAdultFemale,
    adjusted_kid_male: adjKidMale,
    adjusted_kid_female: adjKidFemale,
  };
}

export function processSummaryRecord(summary: SummaryRecord, staffConfig: StaffConfig): AdjustedSummary {
  const zoneDeduction = staffConfig.enabled ? (staffConfig.deductionPerZone[summary.zone_id] ?? 4) : 0;
  const netAvg = Math.max(0, Math.round((summary.avg_headcount - zoneDeduction) * 10) / 10);
  const netTotal = Math.max(0, summary.total_raw_headcount - (zoneDeduction * summary.total_intervals));

  return {
    ...summary,
    net_avg_headcount: netAvg,
    net_total_headcount: netTotal
  };
}
