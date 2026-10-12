import React, { useMemo } from 'react';
import { ShiftSummary } from '../types/telemetry';
import { formatDwellTime } from '../utils/aggregations';
import { Users, Clock, UserCheck, Baby, Loader2, Layers, Sparkles, X, CheckSquare, RotateCcw } from 'lucide-react';

interface GlobalTotalsHeaderProps {
  summaries: ShiftSummary[];
  selectedShiftKeys: string[];
  onClearSelection: () => void;
  onRemoveShift: (key: string) => void;
  onSelectAll: () => void;
  loading?: boolean;
  showDemographics?: boolean;
}

export const GlobalTotalsHeader: React.FC<GlobalTotalsHeaderProps> = ({
  summaries,
  selectedShiftKeys,
  onClearSelection,
  onRemoveShift,
  onSelectAll,
  loading,
  showDemographics = true
}) => {
  // Compute unique sorted dates for human-friendly "Day X" labels
  const uniqueDates = useMemo(() => {
    return Array.from(new Set(summaries.map((s) => s.shift_date))).sort();
  }, [summaries]);

  const getShiftLabel = (shiftDate: string, shiftId: number) => {
    const dayIdx = uniqueDates.indexOf(shiftDate) + 1;
    return `Day ${dayIdx > 0 ? dayIdx : 'Event'} • Shift ${shiftId}`;
  };

  if (loading && summaries.length === 0) {
    return (
      <section id="totals-section" className="mt-8 pt-8 border-t border-slate-800/80">
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
      <section id="totals-section" className="mt-8 pt-8 border-t border-slate-800/80">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Overall Event Totals
        </h2>
        <div className="bg-slate-900/40 rounded-2xl p-8 border border-slate-800/60 text-center text-slate-400">
          <p className="text-xs text-slate-400">No shift summary records available.</p>
        </div>
      </section>
    );
  }

  // Determine active subset vs full event
  const isFiltered = selectedShiftKeys.length > 0 && selectedShiftKeys.length < summaries.length;
  const isAllExplicitlySelected = selectedShiftKeys.length === summaries.length;

  const activeSummaries = selectedShiftKeys.length > 0
    ? summaries.filter((s) => selectedShiftKeys.includes(`${s.shift_date}_${s.shift_id}`))
    : summaries;

  // Compute active totals
  let totalVisitors = 0;
  let totalDwellWeighted = 0;
  let totalMale = 0;
  let totalFemale = 0;
  let totalAdult = 0;
  let totalKid = 0;
  const activeShiftCount = activeSummaries.length;

  activeSummaries.forEach((s) => {
    totalVisitors += s.total_visitors;
    totalDwellWeighted += s.avg_dwell_seconds * s.total_visitors;
    totalMale += s.total_male;
    totalFemale += s.total_female;
    totalAdult += s.total_adult;
    totalKid += s.total_kid;
  });

  const avgDwellSeconds = totalVisitors > 0 ? Math.round(totalDwellWeighted / totalVisitors) : 0;
  
  const totalGender = totalMale + totalFemale;
  const malePct = totalGender > 0 ? Math.round((totalMale / totalGender) * 100) : 0;
  const femalePct = totalGender > 0 ? 100 - malePct : 0;

  const totalAge = totalAdult + totalKid;
  const adultPct = totalAge > 0 ? Math.round((totalAdult / totalAge) * 100) : 0;
  const kidPct = totalAge > 0 ? 100 - adultPct : 0;

  // Compute overall benchmarks for comparison
  let allVisitors = 0;
  let allDwellWeighted = 0;
  summaries.forEach((s) => {
    allVisitors += s.total_visitors;
    allDwellWeighted += s.avg_dwell_seconds * s.total_visitors;
  });
  const allAvgDwell = allVisitors > 0 ? Math.round(allDwellWeighted / allVisitors) : 0;
  const pctOfTotal = allVisitors > 0 ? Math.round((totalVisitors / allVisitors) * 1000) / 10 : 0;

  return (
    <section id="totals-section" className="mt-8 pt-8 border-t border-slate-800/80 scroll-mt-20">
      
      {/* Header section with dynamic title and contextual badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              {isFiltered ? 'Selected Shifts Aggregate' : 'Overall Event Totals'}
            </h2>
            {isFiltered ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Custom Selection Total ({activeShiftCount} Shifts)
              </span>
            ) : isAllExplicitlySelected ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                All 8 Shifts Combined
              </span>
            ) : (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                Default: All 8 Shifts
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isFiltered
              ? `Dynamic real-time sum of ${activeShiftCount} selected shifts (${pctOfTotal}% of total event volume)`
              : `Comprehensive baseline summary aggregated across all 4 event days (8 shifts)`}
          </p>
        </div>

        {/* Status indicator or action */}
        <div className="flex items-center gap-2">
          {isFiltered ? (
            <button
              onClick={onClearSelection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white border border-slate-700/60 transition shadow-sm"
              title="Reset to all shifts"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Reset to All Shifts</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Click cards above to aggregate any shifts
            </span>
          )}
        </div>
      </div>

      {/* Active Shift Chips Toolbar (shown when filtering) */}
      {isFiltered && (
        <div className="mb-5 p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex flex-wrap items-center gap-2">
          <span className="text-xs text-indigo-300 font-medium">Included in Total:</span>
          {activeSummaries.map((s) => {
            const key = `${s.shift_date}_${s.shift_id}`;
            return (
              <button
                key={key}
                onClick={() => onRemoveShift(key)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-slate-900/90 text-slate-200 border border-indigo-500/40 hover:border-rose-500/60 hover:text-rose-300 transition group shadow-sm"
                title={`Click to remove ${getShiftLabel(s.shift_date, s.shift_id)} from aggregate`}
              >
                <span>{getShiftLabel(s.shift_date, s.shift_id)}</span>
                <X className="w-3 h-3 text-slate-400 group-hover:text-rose-400 transition" />
              </button>
            );
          })}
          <button
            onClick={onSelectAll}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 ml-2 transition"
          >
            Select All 8
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className={`grid grid-cols-1 ${showDemographics ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'} gap-5`}>
        
        {/* 1. Total Visitors */}
        <div className={`rounded-2xl p-6 border shadow-sm transition-all ${
          isFiltered
            ? 'bg-slate-900/80 border-indigo-500/40 shadow-indigo-950/20 ring-1 ring-indigo-500/20'
            : 'bg-slate-900/50 backdrop-blur-md border-slate-800/80 hover:border-slate-700/80'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isFiltered ? 'Selected Headcount' : 'Total Visitor Sessions'}
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight font-mono">
            {totalVisitors.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-2">sessions</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
            <span>
              {isFiltered
                ? `${pctOfTotal}% of total event (${allVisitors.toLocaleString()})`
                : `Tracked across 4 days (${activeShiftCount} shifts)`}
            </span>
            {isFiltered && (
              <span className="text-indigo-400 font-mono font-medium">{activeShiftCount} shifts</span>
            )}
          </div>
        </div>

        {/* 2. Overall / Selected Average Dwell Time */}
        <div className={`rounded-2xl p-6 border shadow-sm transition-all ${
          isFiltered
            ? 'bg-slate-900/80 border-amber-500/40 shadow-amber-950/20 ring-1 ring-amber-500/20'
            : 'bg-slate-900/50 backdrop-blur-md border-slate-800/80 hover:border-slate-700/80'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isFiltered ? 'Selected Avg Dwell' : 'Overall Avg Dwell Time'}
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-amber-300 tracking-tight font-mono">
            {formatDwellTime(avgDwellSeconds)}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {isFiltered ? (
              <span>
                Benchmark: <strong className="text-slate-300 font-mono">{formatDwellTime(allAvgDwell)}</strong> across full event
              </span>
            ) : (
              <span>Average visitor session duration</span>
            )}
          </div>
        </div>

        {showDemographics && (
          <>
            {/* 3. Male vs. Female Ratio */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-slate-800/80 shadow-sm hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {isFiltered ? 'Selected Gender Split' : 'Male vs Female'}
                </span>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-2xl font-bold text-slate-100">
                  {malePct}% <span className="text-xs text-blue-400 font-normal">({totalMale.toLocaleString()})</span>
                </span>
                <span className="text-2xl font-bold text-slate-100">
                  {femalePct}% <span className="text-xs text-pink-400 font-normal">({totalFemale.toLocaleString()})</span>
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${malePct}%` }} />
                <div className="bg-pink-500 h-full transition-all duration-500" style={{ width: `${femalePct}%` }} />
              </div>
            </div>

            {/* 4. Adult vs. Kid Ratio */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-slate-800/80 shadow-sm hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {isFiltered ? 'Selected Age Split' : 'Adult vs Kid'}
                </span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Baby className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-2xl font-bold text-slate-100">
                  {adultPct}% <span className="text-xs text-emerald-400 font-normal">({totalAdult.toLocaleString()})</span>
                </span>
                <span className="text-2xl font-bold text-slate-100">
                  {kidPct}% <span className="text-xs text-amber-400 font-normal">({totalKid.toLocaleString()})</span>
                </span>
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
