import React, { useMemo } from 'react';
import { ShiftSummary } from '../types/telemetry';
import { formatDwellTime } from '../utils/aggregations';
import { Users, Clock, Loader2, Calendar, Check, Eye, Layers, Filter, X } from 'lucide-react';

interface TableGridProps {
  summaries: ShiftSummary[];
  loading?: boolean;
  selectedShiftKeys: string[];
  onToggleShiftSelection: (shiftDate: string, shiftId: number) => void;
  onSelectPreset?: (preset: 'all' | 'clear' | 'day1' | 'day2' | 'day3' | 'day4' | 'shift1' | 'shift2') => void;
  onInspectShift: (shiftDate: string, shiftId: number) => void;
  showDemographics?: boolean;
}

interface SliceInfo {
  label: string;
  value: number;
  color: string;
}

interface MiniPieChartProps {
  sliceA: SliceInfo;
  sliceB: SliceInfo;
  size?: number;
}

const MiniPieChart: React.FC<MiniPieChartProps> = ({ sliceA, sliceB, size = 54 }) => {
  const total = sliceA.value + sliceB.value;
  const pctA = total > 0 ? sliceA.value / total : 0.5;
  const pctADisplay = Math.round(pctA * 100);
  const pctBDisplay = 100 - pctADisplay;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <circle cx={cx} cy={cy} r={r} fill="#1e293b" />
      </svg>
    );
  }

  // Handle 100% / 0% single slice edge cases
  if (sliceA.value === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible drop-shadow-sm">
        <circle cx={cx} cy={cy} r={r} fill={sliceB.color} className="transition-all hover:opacity-90">
          <title>{`${sliceB.label}: ${sliceB.value.toLocaleString()} (100%)`}</title>
        </circle>
        <circle cx={cx} cy={cy} r={r * 0.42} fill="#090d16" stroke="#1e293b" strokeWidth="1" />
      </svg>
    );
  }

  if (sliceB.value === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible drop-shadow-sm">
        <circle cx={cx} cy={cy} r={r} fill={sliceA.color} className="transition-all hover:opacity-90">
          <title>{`${sliceA.label}: ${sliceA.value.toLocaleString()} (100%)`}</title>
        </circle>
        <circle cx={cx} cy={cy} r={r * 0.42} fill="#090d16" stroke="#1e293b" strokeWidth="1" />
      </svg>
    );
  }

  const angleA = Math.max(1, Math.min(359, (sliceA.value / total) * 360));

  const polarToCartesian = (angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180.0;
    return {
      x: +(cx + r * Math.cos(rad)).toFixed(2),
      y: +(cy + r * Math.sin(rad)).toFixed(2),
    };
  };

  const p0 = polarToCartesian(0);
  const pA = polarToCartesian(angleA);

  const largeArcA = angleA > 180 ? 1 : 0;
  const largeArcB = 360 - angleA > 180 ? 1 : 0;

  const pathA = `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArcA} 1 ${pA.x} ${pA.y} Z`;
  const pathB = `M ${cx} ${cy} L ${pA.x} ${pA.y} A ${r} ${r} 0 ${largeArcB} 1 ${p0.x} ${p0.y} Z`;

  return (
    <div className="relative group/pie flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible drop-shadow-sm">
        {/* Slice A */}
        <path
          d={pathA}
          fill={sliceA.color}
          stroke="#090d16"
          strokeWidth="1.5"
          className="transition-opacity hover:opacity-85 cursor-pointer"
        >
          <title>{`${sliceA.label}: ${sliceA.value.toLocaleString()} (${pctADisplay}%)`}</title>
        </path>
        {/* Slice B */}
        <path
          d={pathB}
          fill={sliceB.color}
          stroke="#090d16"
          strokeWidth="1.5"
          className="transition-opacity hover:opacity-85 cursor-pointer"
        >
          <title>{`${sliceB.label}: ${sliceB.value.toLocaleString()} (${pctBDisplay}%)`}</title>
        </path>
        {/* Center core cutout for modern gauge pie aesthetic */}
        <circle cx={cx} cy={cy} r={r * 0.42} fill="#090d16" stroke="#1e293b" strokeWidth="1" />
      </svg>
    </div>
  );
};

export const TableGrid: React.FC<TableGridProps> = ({
  summaries,
  loading,
  selectedShiftKeys,
  onToggleShiftSelection,
  onSelectPreset,
  onInspectShift,
  showDemographics = true
}) => {
  const shiftBlocks = useMemo(() => {
    const sorted = [...summaries].sort((a, b) => {
      const dateDiff = new Date(a.shift_date).getTime() - new Date(b.shift_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.shift_id - b.shift_id;
    });

    const uniqueDates = Array.from(new Set(sorted.map((s) => s.shift_date))).sort();

    return sorted.map((s) => {
      const dayIndex = uniqueDates.indexOf(s.shift_date) + 1;
      const key = `${s.shift_date}_${s.shift_id}`;
      return {
        ...s,
        key,
        dayNumber: dayIndex,
        dayLabel: dayIndex > 0 ? `Day ${dayIndex}` : 'Event Day',
      };
    });
  }, [summaries]);

  if (loading && shiftBlocks.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            4-Day Event Shift Occupancy (8 Shifts)
          </h2>
          <span className="flex items-center gap-1.5 text-xs text-indigo-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading shift data...
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="bg-slate-900/40 rounded-2xl p-5 border border-slate-800/60 animate-pulse flex flex-col justify-between min-h-[220px]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-24 bg-slate-800 rounded-md" />
                <div className="h-4 w-16 bg-slate-800 rounded-full" />
              </div>
              <div className="space-y-3 py-3">
                <div className="h-7 w-28 bg-slate-800 rounded-md" />
                <div className="h-3 w-20 bg-slate-800 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/40">
                <div className="h-24 bg-slate-800/40 rounded-xl" />
                <div className="h-24 bg-slate-800/40 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const selectedCount = selectedShiftKeys.length;

  return (
    <section className="mb-8">
      {/* Selection Control & Presets Toolbar */}
      <div className="mb-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-lg backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              4-Day Event Shift Occupancy
            </h2>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1.5 ${
                selectedCount > 0
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
              }`}
            >
              <Calendar className="w-3 h-3 text-indigo-400" />
              {selectedCount > 0
                ? `${selectedCount} of ${shiftBlocks.length} Shifts Selected`
                : `All ${shiftBlocks.length} Shifts in Default Total`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Click cards or toggle checkboxes to calculate a custom <strong className="text-slate-200">Selected Shifts Aggregate</strong> total below.
          </p>
        </div>

        {/* Quick Presets Bar */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Presets:
          </span>
          <button
            type="button"
            onClick={() => onSelectPreset?.('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
              selectedCount === shiftBlocks.length
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/60'
            }`}
          >
            All 8
          </button>
          {[1, 2, 3, 4].map((dayNum) => (
            <button
              key={dayNum}
              type="button"
              onClick={() => onSelectPreset?.(`day${dayNum}` as any)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 hover:text-white transition"
              title={`Select Day ${dayNum} Shift 1 and Shift 2`}
            >
              Day {dayNum}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSelectPreset?.('shift1')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition"
            title="Select all Shift 1s (09:00 - 15:00)"
          >
            Shift 1s
          </button>
          <button
            type="button"
            onClick={() => onSelectPreset?.('shift2')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition"
            title="Select all Shift 2s (15:00 - 21:00)"
          >
            Shift 2s
          </button>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={() => onSelectPreset?.('clear')}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition ml-1"
              title="Clear active selection"
            >
              <X className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 8-Card Grid (4 cols x 2 rows) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {shiftBlocks.map((block) => {
          const isSelected = selectedShiftKeys.includes(block.key);
          const male = block.total_male;
          const female = block.total_female;
          const totalGender = male + female;
          const malePct = totalGender > 0 ? Math.round((male / totalGender) * 100) : 0;
          const femalePct = totalGender > 0 ? 100 - malePct : 0;

          const adult = block.total_adult;
          const kid = block.total_kid;
          const totalAge = adult + kid;
          const adultPct = totalAge > 0 ? Math.round((adult / totalAge) * 100) : 0;
          const kidPct = totalAge > 0 ? 100 - adultPct : 0;

          const isShift1 = block.shift_id === 1;

          return (
            <div
              key={block.key}
              onClick={() => onToggleShiftSelection(block.shift_date, block.shift_id)}
              className={`group rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden select-none ${
                isSelected
                  ? 'bg-slate-900/95 border-2 border-indigo-500 shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-400/40'
                  : 'bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 shadow-lg'
              }`}
            >
              {/* Top Accent line when selected */}
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
              )}

              {/* Header: Day & Shift Badge + Select Checkbox */}
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-indigo-600/30 text-indigo-200 border-indigo-500/30'
                  }`}>
                    {block.dayLabel}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    isShift1
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                  }`}>
                    Shift {block.shift_id}
                  </span>
                </div>

                {/* Multi-Select Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleShiftSelection(block.shift_date, block.shift_id);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
                  }`}
                  title={isSelected ? 'Deselect from aggregate total' : 'Add to selected aggregate total'}
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                    isSelected ? 'bg-white text-indigo-700 border-white' : 'border-slate-400'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>{isSelected ? 'Selected' : 'Select'}</span>
                </button>
              </div>

              {/* Date string */}
              <div className="text-[11px] text-slate-400 font-mono mb-2">
                {block.shift_date}
              </div>

              {/* Metrics Row: Headcount & Avg Dwell Time */}
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3 text-indigo-400" /> HEADCOUNT
                  </div>
                  <div className="text-3xl font-extrabold text-white font-mono">
                    {block.total_visitors.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    avg {Math.round(block.total_visitors / 6).toLocaleString()}/hour
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> AVG DWELL
                  </div>
                  <div className="text-lg font-bold text-slate-200 font-mono">
                    {formatDwellTime(block.avg_dwell_seconds)}
                  </div>
                </div>
              </div>

              {/* Demographics Breakdown: Gender & Age Pie Charts */}
              {showDemographics && (
                <div className="pt-3 border-t border-slate-800/60">
                  <div className="grid grid-cols-2 gap-2.5">
                    
                    {/* Gender Pie Chart Box */}
                    <div className="bg-slate-950/40 rounded-xl p-2.5 border border-slate-800/50 flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Gender
                      </span>
                      <MiniPieChart
                        sliceA={{ label: 'Male', value: male, color: '#3b82f6' }}
                        sliceB={{ label: 'Female', value: female, color: '#ec4899' }}
                        size={52}
                      />
                      <div className="w-full space-y-1 text-[10px] font-mono mt-2 pt-1 border-t border-slate-800/40">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            M: {male.toLocaleString()}
                          </span>
                          <span className="text-slate-400">{malePct}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-pink-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                            F: {female.toLocaleString()}
                          </span>
                          <span className="text-slate-400">{femalePct}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Age Pie Chart Box */}
                    <div className="bg-slate-950/40 rounded-xl p-2.5 border border-slate-800/50 flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Age
                      </span>
                      <MiniPieChart
                        sliceA={{ label: 'Adult', value: adult, color: '#10b981' }}
                        sliceB={{ label: 'Kid', value: kid, color: '#f59e0b' }}
                        size={52}
                      />
                      <div className="w-full space-y-1 text-[10px] font-mono mt-2 pt-1 border-t border-slate-800/40">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Adult: {adult.toLocaleString()}
                          </span>
                          <span className="text-slate-400">{adultPct}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            Kid: {kid.toLocaleString()}
                          </span>
                          <span className="text-slate-400">{kidPct}%</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Explicit button to inspect individual sessions log */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectShift(block.shift_date, block.shift_id);
                }}
                className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700/60 hover:border-indigo-500/50 transition flex items-center justify-center gap-1.5 group/inspect"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-400 group-hover/inspect:text-indigo-300" />
                <span>Inspect Visitor Sessions</span>
              </button>

            </div>
          );
        })}
      </div>
    </section>
  );
};
