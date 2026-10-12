import React from 'react';
import { TelemetryRecord, StaffConfig } from '../types/telemetry';
import { processTelemetryRecord, formatDwellTime } from '../utils/aggregations';
import { Users, Clock, Camera, ShieldCheck, UserCheck, Baby } from 'lucide-react';

interface ZoneOverviewProps {
  latestZones: TelemetryRecord[];
  staffConfig: StaffConfig;
  onOpenStaffModal: () => void;
}

const ZONE_METADATA: Record<string, { name: string; description: string; color: string; border: string }> = {
  'Zone-1': { name: 'Zone 1: Main Display', description: 'Entrance & Vehicle Showcase', color: 'from-blue-500/20 to-indigo-500/10', border: 'border-blue-500/30' },
  'Zone-2': { name: 'Zone 2: Interactive Booth', description: 'VR & Driving Simulator', color: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/30' },
  'Zone-3': { name: 'Zone 3: VIP Lounge', description: 'Consultation & Refreshments', color: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/30' },
  'Zone-4': { name: 'Zone 4: Merch & Checkout', description: 'Gift Station & Payment', color: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/30' },
};

export const ZoneOverview: React.FC<ZoneOverviewProps> = ({ latestZones, staffConfig, onOpenStaffModal }) => {
  const defaultZones = ['Zone-1', 'Zone-2', 'Zone-3', 'Zone-4'];

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Physical Table Zones (Occupancy Overview)
          </h2>
          <p className="text-xs text-slate-400">15-minute edge telemetry across 4 physical zones</p>
        </div>
        <button
          onClick={onOpenStaffModal}
          className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
        >
          {staffConfig.enabled ? `Baseline Noise Filter Active (Staff Deduction)` : 'Deduct Baseline Staff Noise'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {defaultZones.map((zoneId) => {
          const rawRecord = latestZones.find((z) => z.zone_id === zoneId);
          const meta = ZONE_METADATA[zoneId] || { name: zoneId, description: 'Table Zone', color: 'from-slate-800 to-slate-900', border: 'border-slate-700' };
          
          if (!rawRecord) {
            return (
              <div key={zoneId} className="glass-card rounded-2xl p-5 border border-slate-800 opacity-60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-400">{meta.name}</span>
                  <span className="text-xs text-slate-500">Waiting data...</span>
                </div>
                <div className="h-16 flex items-center justify-center text-xs text-slate-500">No telemetry yet</div>
              </div>
            );
          }

          const adjRecord = processTelemetryRecord(rawRecord, staffConfig);

          return (
            <div
              key={zoneId}
              className={`glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden bg-gradient-to-br ${meta.color} border ${meta.border}`}
            >
              {/* Header: Zone Name & Camera ID */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{meta.name}</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[170px]">{meta.description}</p>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-mono bg-slate-900/80 px-2 py-0.5 rounded text-slate-400 border border-slate-700/50">
                  <Camera className="w-3 h-3 text-indigo-400" />
                  {rawRecord.camera_id}
                </span>
              </div>

              {/* Headcount Numbers */}
              <div className="flex items-baseline justify-between my-3">
                <div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">
                    {staffConfig.enabled ? adjRecord.net_headcount : rawRecord.live_headcount}
                    <span className="text-xs font-normal text-slate-400 ml-1.5">visitors</span>
                  </div>
                  {staffConfig.enabled && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <span>Raw Edge: <strong className="text-slate-300">{rawRecord.live_headcount}</strong></span>
                      <span className="text-indigo-400">(-{adjRecord.staff_deduction} staff)</span>
                    </div>
                  )}
                </div>

                {/* Avg Dwell Time Pill */}
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Avg Dwell</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5">
                    {formatDwellTime(rawRecord.avg_dwell_time_seconds)}
                  </div>
                </div>
              </div>

              {/* GPT-4V Demographics Breakdown */}
              <div className="mt-4 pt-3 border-t border-slate-700/40">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                    GPT-4V Demographics
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">{(rawRecord.confidence_score * 100).toFixed(0)}% conf</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="bg-slate-900/60 rounded px-2 py-1 flex items-center justify-between border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-blue-400" /> Adults:
                    </span>
                    <span className="font-semibold text-slate-200">
                      {staffConfig.enabled
                        ? adjRecord.adjusted_adult_male + adjRecord.adjusted_adult_female
                        : rawRecord.adult_male + rawRecord.adult_female}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 rounded px-2 py-1 flex items-center justify-between border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Baby className="w-3 h-3 text-pink-400" /> Kids:
                    </span>
                    <span className="font-semibold text-slate-200">
                      {staffConfig.enabled
                        ? adjRecord.adjusted_kid_male + adjRecord.adjusted_kid_female
                        : rawRecord.kid_male + rawRecord.kid_female}
                    </span>
                  </div>
                </div>

                <div className="mt-1.5 text-[10px] text-slate-400 flex justify-between px-1">
                  <span>M: {staffConfig.enabled ? adjRecord.adjusted_adult_male + adjRecord.adjusted_kid_male : rawRecord.adult_male + rawRecord.kid_male}</span>
                  <span>F: {staffConfig.enabled ? adjRecord.adjusted_adult_female + adjRecord.adjusted_kid_female : rawRecord.adult_female + rawRecord.kid_female}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
};
