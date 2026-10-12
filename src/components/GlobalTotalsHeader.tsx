import React from 'react';
import { ShiftSummary } from '../types/telemetry';
import { formatDwellTime } from '../utils/aggregations';
import { Users, Clock, UserCheck, Baby, Loader2 } from 'lucide-react';

interface GlobalTotalsHeaderProps {
  summaries: ShiftSummary[];
  loading?: boolean;
  showDemographics?: boolean;
}

export const GlobalTotalsHeader: React.FC<GlobalTotalsHeaderProps> = ({
  summaries,
  loading,
  showDemographics = true
}) => {
  if (loading && summaries.length === 0) {
    return (
      <section className="mt-8 pt-8 border-t border-slate-800/80">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Overall Event Totals
        </h2>
        <div className="bg-slate-900/40 rounded-2xl p-8 border border-slate-800/60 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
          <p className="text-xs font-medium text-slate-300">Computing global event totals...</p>
        </div>
      </section>
    );
  }

  if (summaries.length === 0) {
    return (
      <section className="mt-8 pt-8 border-t border-slate-800/80">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Overall Event Totals
        </h2>
        <div className="bg-slate-900/40 rounded-2xl p-8 border border-slate-800/60 text-center text-slate-400">
          <p className="text-xs text-slate-400">No shift summary records available.</p>
        </div>
      </section>
    );
  }

  let totalVisitors = 0;
  let totalDwellWeighted = 0;
  let totalMale = 0;
  let totalFemale = 0;
  let totalAdult = 0;
  let totalKid = 0;
  let shiftCount = 0;

  summaries.forEach((s) => {
    totalVisitors += s.total_visitors;
    totalDwellWeighted += s.avg_dwell_seconds * s.total_visitors;
    totalMale += s.total_male;
    totalFemale += s.total_female;
    totalAdult += s.total_adult;
    totalKid += s.total_kid;
    shiftCount++;
  });

  const avgDwellSeconds = totalVisitors > 0 ? Math.round(totalDwellWeighted / totalVisitors) : 0;
  
  const totalGender = totalMale + totalFemale;
  const malePct = totalGender > 0 ? Math.round((totalMale / totalGender) * 100) : 0;
  const femalePct = totalGender > 0 ? 100 - malePct : 0;

  const totalAge = totalAdult + totalKid;
  const adultPct = totalAge > 0 ? Math.round((totalAdult / totalAge) * 100) : 0;
  const kidPct = totalAge > 0 ? 100 - adultPct : 0;

  return (
    <section className="mt-8 pt-8 border-t border-slate-800/80">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Overall Event Totals
        </h2>
        <span className="text-xs text-slate-500 font-mono">Aggregated from {shiftCount} active shifts</span>
      </div>

      <div className={`grid grid-cols-1 ${showDemographics ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'} gap-5`}>
        
        {/* Total Visitors */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-slate-800/80 shadow-sm hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Visitor Sessions</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight font-mono">
            {totalVisitors.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-2">sessions</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Tracked across 4 days ({shiftCount} shifts)</p>
        </div>

        {/* Overall Average Dwell Time */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-slate-800/80 shadow-sm hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Avg Dwell Time</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight font-mono">
            {formatDwellTime(avgDwellSeconds)}
          </div>
          <p className="text-xs text-slate-500 mt-2">Average visitor duration</p>
        </div>

        {showDemographics && (
          <>
            {/* Male vs. Female Ratio */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-slate-800/80 shadow-sm hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Male vs Female</span>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-2xl font-bold text-slate-100">{malePct}% <span className="text-xs text-blue-400 font-normal">({totalMale.toLocaleString()})</span></span>
                <span className="text-2xl font-bold text-slate-100">{femalePct}% <span className="text-xs text-pink-400 font-normal">({totalFemale.toLocaleString()})</span></span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${malePct}%` }} />
                <div className="bg-pink-500 h-full transition-all duration-500" style={{ width: `${femalePct}%` }} />
              </div>
            </div>

            {/* Adult vs. Kid Ratio */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-slate-800/80 shadow-sm hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Adult vs Kid</span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Baby className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-2xl font-bold text-slate-100">{adultPct}% <span className="text-xs text-emerald-400 font-normal">({totalAdult.toLocaleString()})</span></span>
                <span className="text-2xl font-bold text-slate-100">{kidPct}% <span className="text-xs text-amber-400 font-normal">({totalKid.toLocaleString()})</span></span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${adultPct}%` }} />
                <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${kidPct}%` }} />
              </div>
            </div>
          </>
        )}

      </div>
    </section>
  );
};
