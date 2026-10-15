export interface VisitorSession {
  id: number;
  visitor_id: string;
  start_time: string;
  end_time: string;
  dwell_time: number;
  gender: 'M' | 'F';
  age_group: 'Adult' | 'Kid';
  shift_date: string;
  shift_id: number;
  is_staff?: number;
  evidence_image_url?: string | null;
}

export interface CctvSnapshot {
  id: number;
  timestamp: string;
  image_url: string;
}

export interface ShiftSummary {
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

export interface StaffConfig {
  enabled: boolean;
  deductionPerZone: Record<string, number>;
}

export interface TelemetryRecord {
  id: number;
  timestamp: string;
  camera_id: string;
  zone_id: string;
  live_headcount: number;
  avg_dwell_time_seconds: number;
  adult_male: number;
  adult_female: number;
  kid_male: number;
  kid_female: number;
  confidence_score: number;
  created_at?: string;
}

export interface SummaryRecord {
  date_str: string;
  window_block: string;
  zone_id: string;
  total_intervals: number;
  total_raw_headcount: number;
  avg_headcount: number;
  avg_dwell_time_seconds: number;
  total_adult_male: number;
  total_adult_female: number;
  total_kid_male: number;
  total_kid_female: number;
  avg_confidence: number;
}

export interface AdjustedTelemetry extends TelemetryRecord {
  net_headcount: number;
  staff_deduction: number;
  adjusted_adult_male: number;
  adjusted_adult_female: number;
  adjusted_kid_male: number;
  adjusted_kid_female: number;
}

export interface AdjustedSummary extends SummaryRecord {
  net_avg_headcount: number;
  net_total_headcount: number;
}
