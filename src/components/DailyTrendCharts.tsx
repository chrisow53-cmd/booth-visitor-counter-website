import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { ShiftSummary } from '../types/telemetry';
import { formatDwellTime } from '../utils/aggregations';
import { TrendingUp, Users, Clock, UserCheck, Baby, BarChart2 } from 'lucide-react';

interface DailyTrendChartsProps {
  summaries: ShiftSummary[];
  selectedShiftKeys?: string[];
  showDemographics?: boolean;
}

type MainVariable = 'headcount' | 'shifts' | 'dwell';
type DemoViewMode = 'count' | 'percent';

export const DailyTrendCharts: React.FC<DailyTrendChartsProps> = ({
  summaries,
  selectedShiftKeys = [],
  showDemographics = true,
}) => {
  const [mainVariable, setMainVariable] = useState<MainVariable>('headcount');
  const [chartStyle, setChartStyle] = useState<'area' | 'bar'>('area');
  const [genderMode, setGenderMode] = useState<DemoViewMode>('count');
  const [ageMode, setAgeMode] = useState<DemoViewMode>('count');

  // Compute daily aggregated dataset
  const dailyData = useMemo(() => {
    if (!summaries.length) return [];

    const uniqueDates = Array.from(new Set(summaries.map((s) => s.shift_date))).sort();

    return uniqueDates.map((dateStr, idx) => {
      const dayNum = idx + 1;
      const shift1 = summaries.find((s) => s.shift_date === dateStr && s.shift_id === 1);
      const shift2 = summaries.find((s) => s.shift_date === dateStr && s.shift_id === 2);

      const s1Visitors = shift1?.total_visitors || 0;
      const s2Visitors = shift2?.total_visitors || 0;
      const totalVisitors = s1Visitors + s2Visitors;

      const s1Dwell = shift1?.avg_dwell_seconds || 0;
      const s2Dwell = shift2?.avg_dwell_seconds || 0;
      const weightedDwell = totalVisitors > 0
        ? Math.round((s1Dwell * s1Visitors + s2Dwell * s2Visitors) / totalVisitors)
        : 0;

      const s1Male = shift1?.total_male || 0;
      const s2Male = shift2?.total_male || 0;
      const totalMale = s1Male + s2Male;

      const s1Female = shift1?.total_female || 0;
      const s2Female = shift2?.total_female || 0;
      const totalFemale = s1Female + s2Female;

      const totalGender = totalMale + totalFemale;
      const malePct = totalGender > 0 ? Math.round((totalMale / totalGender) * 100) : 0;
      const femalePct = totalGender > 0 ? 100 - malePct : 0;

      const s1Adult = shift1?.total_adult || 0;
      const s2Adult = shift2?.total_adult || 0;
      const totalAdult = s1Adult + s2Adult;

      const s1Kid = shift1?.total_kid || 0;
      const s2Kid = shift2?.total_kid || 0;
      const totalKid = s1Kid + s2Kid;

      const totalAge = totalAdult + totalKid;
      const adultPct = totalAge > 0 ? Math.round((totalAdult / totalAge) * 100) : 0;
      const kidPct = totalAge > 0 ? 100 - adultPct : 0;

      const isS1Selected = selectedShiftKeys.includes(`${dateStr}_1`);
      const isS2Selected = selectedShiftKeys.includes(`${dateStr}_2`);

      return {
        date: dateStr,
        day: `Day ${dayNum}`,
        dayNum,
        totalVisitors,
        s1Visitors,
        s2Visitors,
        avgDwellSeconds: weightedDwell,
        s1Dwell,
        s2Dwell,
        male: totalMale,
        female: totalFemale,
        malePct,
        femalePct,
        adult: totalAdult,
        kid: totalKid,
        adultPct,
        kidPct,
        hasSelectedShift: isS1Selected || isS2Selected,
      };
    });
  }, [summaries, selectedShiftKeys]);

  if (dailyData.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-slate-800/80">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Day-by-Day Event Trend Analysis
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              4 Days Comparison
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track trajectory and compare daily traffic volume, shift distributions, and audience demographics.
          </p>
        </div>

        {/* Chart View Toggle Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Variable Selector */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMainVariable('headcount')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                mainVariable === 'headcount'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Total Headcount</span>
            </button>
            <button
              onClick={() => setMainVariable('shifts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                mainVariable === 'shifts'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Shift 1 vs Shift 2</span>
            </button>
            <button
              onClick={() => setMainVariable('dwell')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                mainVariable === 'dwell'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Avg Dwell Time</span>
            </button>
          </div>

          {/* Chart Style Toggle (Area vs Bar) */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setChartStyle('area')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition ${
                chartStyle === 'area'
                  ? 'bg-slate-800 text-indigo-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Smooth Trendline View"
            >
              Trendline
            </button>
            <button
              onClick={() => setChartStyle('bar')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition ${
                chartStyle === 'bar'
                  ? 'bg-slate-800 text-indigo-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Bar Comparison View"
            >
              Bars
            </button>
          </div>
        </div>
      </div>

      {/* 1. Primary Full-Width Chart: Daily Variable Trend */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-800/80 shadow-lg mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              {mainVariable === 'headcount' && 'Daily Visitor Headcount Trend'}
              {mainVariable === 'shifts' && 'Shift 1 (09:00 - 15:00) vs Shift 2 (15:00 - 21:00) Headcount'}
              {mainVariable === 'dwell' && 'Daily Average Dwell Time Trend'}
            </h3>
            <p className="text-xs text-slate-400">
              {mainVariable === 'headcount' && 'Total visitor volume aggregated across 4 event days'}
              {mainVariable === 'shifts' && 'Morning vs Evening shift performance across days'}
              {mainVariable === 'dwell' && 'Average session length evolution in minutes and seconds'}
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono hidden sm:block">
            X-Axis: Day 1 - Day 4 • Y-Axis:{' '}
            {mainVariable === 'dwell' ? 'Duration (Seconds)' : 'Visitors'}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartStyle === 'area' ? (
              <AreaChart data={dailyData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorShift1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorShift2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorDwell" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) =>
                    mainVariable === 'dwell' ? formatDwellTime(val) : val.toLocaleString()
                  }
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#0b101b] border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs font-mono">
                        <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between gap-4">
                          <span>{label} ({d.date})</span>
                        </div>
                        {mainVariable === 'headcount' && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4 text-indigo-400 font-semibold">
                              <span>Total Day Headcount:</span>
                              <span>{d.totalVisitors.toLocaleString()}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex justify-between">
                              <span>Shift 1 (09:00-15:00):</span>
                              <span>{d.s1Visitors.toLocaleString()}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex justify-between">
                              <span>Shift 2 (15:00-21:00):</span>
                              <span>{d.s2Visitors.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                        {mainVariable === 'shifts' && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4 text-amber-400">
                              <span>Shift 1 (Morning):</span>
                              <span>{d.s1Visitors.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-blue-400">
                              <span>Shift 2 (Evening):</span>
                              <span>{d.s2Visitors.toLocaleString()}</span>
                            </div>
                            <div className="pt-1 border-t border-slate-800 text-slate-300 flex justify-between font-bold">
                              <span>Day Total:</span>
                              <span>{d.totalVisitors.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                        {mainVariable === 'dwell' && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4 text-emerald-400 font-semibold">
                              <span>Day Avg Dwell:</span>
                              <span>{formatDwellTime(d.avgDwellSeconds)}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex justify-between">
                              <span>Shift 1 Avg:</span>
                              <span>{formatDwellTime(d.s1Dwell)}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex justify-between">
                              <span>Shift 2 Avg:</span>
                              <span>{formatDwellTime(d.s2Dwell)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                {mainVariable === 'headcount' && (
                  <Area
                    type="monotone"
                    dataKey="totalVisitors"
                    name="Total Day Visitors"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                )}
                {mainVariable === 'shifts' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="s1Visitors"
                      name="Shift 1 (09:00 - 15:00)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorShift1)"
                      dot={{ fill: '#f59e0b', r: 4 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="s2Visitors"
                      name="Shift 2 (15:00 - 21:00)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorShift2)"
                      dot={{ fill: '#3b82f6', r: 4 }}
                    />
                  </>
                )}
                {mainVariable === 'dwell' && (
                  <Area
                    type="monotone"
                    dataKey="avgDwellSeconds"
                    name="Average Dwell Time"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorDwell)"
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                )}
              </AreaChart>
            ) : (
              <BarChart data={dailyData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} dy={6} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) =>
                    mainVariable === 'dwell' ? formatDwellTime(val) : val.toLocaleString()
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b101b',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any) =>
                    mainVariable === 'dwell' ? [formatDwellTime(value), 'Avg Dwell'] : [value.toLocaleString(), 'Visitors']
                  }
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                {mainVariable === 'headcount' && (
                  <Bar
                    dataKey="totalVisitors"
                    name="Total Day Visitors"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                )}
                {mainVariable === 'shifts' && (
                  <>
                    <Bar
                      dataKey="s1Visitors"
                      name="Shift 1 (09:00 - 15:00)"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="s2Visitors"
                      name="Shift 2 (15:00 - 21:00)"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </>
                )}
                {mainVariable === 'dwell' && (
                  <Bar
                    dataKey="avgDwellSeconds"
                    name="Average Dwell (s)"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                )}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Demographic Trends Row: Male vs Female & Adult vs Kid */}
      {showDemographics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card A: Gender Trend (Male vs Female) */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-800/80 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Gender Distribution Trend
                  </h3>
                  <p className="text-xs text-slate-400">Male vs Female across Day 1 to Day 4</p>
                </div>
              </div>

              {/* Count vs Percent toggle */}
              <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setGenderMode('count')}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition ${
                    genderMode === 'count'
                      ? 'bg-slate-800 text-blue-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Count
                </button>
                <button
                  onClick={() => setGenderMode('percent')}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition ${
                    genderMode === 'percent'
                      ? 'bg-slate-800 text-blue-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ratio (%)
                </button>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} dy={4} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => (genderMode === 'percent' ? `${v}%` : v.toLocaleString())}
                    domain={genderMode === 'percent' ? [0, 100] : ['auto', 'auto']}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0b101b] border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs font-mono">
                          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-2">
                            {label} ({d.date})
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4 text-blue-400">
                              <span>Male:</span>
                              <span className="font-bold">
                                {d.male.toLocaleString()} ({d.malePct}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-pink-400">
                              <span>Female:</span>
                              <span className="font-bold">
                                {d.female.toLocaleString()} ({d.femalePct}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey={genderMode === 'count' ? 'male' : 'malePct'}
                    name="Male"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={genderMode === 'count' ? 'female' : 'femalePct'}
                    name="Female"
                    stroke="#ec4899"
                    strokeWidth={2.5}
                    dot={{ fill: '#ec4899', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card B: Age Trend (Adult vs Kid) */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-800/80 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Baby className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Age Group Distribution Trend
                  </h3>
                  <p className="text-xs text-slate-400">Adult vs Kid across Day 1 to Day 4</p>
                </div>
              </div>

              {/* Count vs Percent toggle */}
              <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setAgeMode('count')}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition ${
                    ageMode === 'count'
                      ? 'bg-slate-800 text-emerald-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Count
                </button>
                <button
                  onClick={() => setAgeMode('percent')}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition ${
                    ageMode === 'percent'
                      ? 'bg-slate-800 text-emerald-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ratio (%)
                </button>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} dy={4} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => (ageMode === 'percent' ? `${v}%` : v.toLocaleString())}
                    domain={ageMode === 'percent' ? [0, 100] : ['auto', 'auto']}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0b101b] border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs font-mono">
                          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-2">
                            {label} ({d.date})
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4 text-emerald-400">
                              <span>Adult:</span>
                              <span className="font-bold">
                                {d.adult.toLocaleString()} ({d.adultPct}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-amber-400">
                              <span>Kid:</span>
                              <span className="font-bold">
                                {d.kid.toLocaleString()} ({d.kidPct}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey={ageMode === 'count' ? 'adult' : 'adultPct'}
                    name="Adult"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={ageMode === 'count' ? 'kid' : 'kidPct'}
                    name="Kid"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

    </section>
  );
};
