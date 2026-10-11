import React, { useMemo } from 'react';
import { ShiftSummary } from '../types/telemetry';
import { formatDwellTime } from '../utils/aggregations';
import { Users, Clock, Loader2, Calendar } from 'lucide-react';

interface TableGridProps {
  summaries: ShiftSummary[];
  loading?: boolean;
  onSelectShift: (shiftDate: string, shiftId: number) => void;
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

export const TableGrid: React.FC<TableGridProps> = ({ summaries, loading, onSelectShift }) => {
  const shiftBlocks = useMemo(() => {
    const sorted = [...summaries].sort((a, b) => {
      const dateDiff = new Date(a.shift_date).getTime() - new Date(b.shift_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.shift_id - b.shift_id;
    });

    const uniqueDates = Array.from(new Set(sorted.map((s) => s.shift_date))).sort();

    return sorted.map((s) => {
      const dayIndex = uniqueDates.indexOf(s.shift_date) + 1;
      return {
        ...s,
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

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            4-Day Event Shift Occupancy
          </h2>
          <p className="text-xs text-slate-500">Click any card to view detailed individual visitor sessions</p>
        </div>
        <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {shiftBlocks.length} / 8 Shifts Active
        </span>
      </div>

      {/* 8-Card Grid (4 cols x 2 rows) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {shiftBlocks.map((block) => {
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
              key={`${block.shift_date}-${block.shift_id}`}
              onClick={() => onSelectShift(block.shift_date, block.shift_id)}
              className="group bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/60 rounded-2xl p-5 transition-all duration-300 shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between cursor-pointer relative overflow-hidden"
            >
              {/* Header: Day & Shift Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white bg-indigo-600/40 border border-indigo-500/40 px-2.5 py-0.5 rounded-md">
                    {block.dayLabel}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {block.shift_date}
                  </span>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  isShift1
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                }`}>
                  Shift {block.shift_id}
                </span>
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

            </div>
          );
        })}
      </div>
    </section>
  );
};
