import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { TelemetryRecord, StaffConfig } from '../types/telemetry';
import { formatIsoTime } from '../utils/aggregations';
import { LineChart } from 'lucide-react';

interface AnalyticsChartProps {
  telemetry: TelemetryRecord[];
  staffConfig: StaffConfig;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ telemetry, staffConfig }) => {
  // Aggregate recent intervals into chart data points
  const { chartData, detectedZones } = useMemo(() => {
    const sorted = [...telemetry].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const slotMap: Record<string, Record<string, number>> = {};
    const zonesSet = new Set<string>();

    sorted.forEach((rec) => {
      const timeKey = formatIsoTime(rec.timestamp);
      const zId = rec.zone_id || 'Main Zone';
      zonesSet.add(zId);

      if (!slotMap[timeKey]) {
        slotMap[timeKey] = {};
      }
      const deduction = staffConfig.enabled ? (staffConfig.deductionPerZone[zId] ?? 4) : 0;
      const count = Math.max(0, rec.live_headcount - deduction);
      slotMap[timeKey][zId] = count;
    });

    const data = Object.entries(slotMap)
      .slice(-24) // Show last 24 15-minute slots
      .map(([time, zones]) => ({
        time,
        ...zones
      }));

    return { chartData: data, detectedZones: Array.from(zonesSet) };
  }, [telemetry, staffConfig]);

  if (chartData.length === 0) return null;

  const colorPalette = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 mb-8 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-indigo-400" />
            Occupancy Trend (15-Min Telemetry)
          </h3>
          <p className="text-xs text-slate-400">
            {staffConfig.enabled ? 'Net Visitor Traffic (Staff Noise Filtered)' : 'Raw Edge Headcount'}
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {detectedZones.map((zone, idx) => (
                <linearGradient key={zone} id={`colorZone-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorPalette[idx % colorPalette.length]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={colorPalette[idx % colorPalette.length]} stopOpacity={0.0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#f8fafc'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            {detectedZones.map((zone, idx) => (
              <Area
                key={zone}
                type="monotone"
                dataKey={zone}
                name={zone}
                stroke={colorPalette[idx % colorPalette.length]}
                fillOpacity={1}
                fill={`url(#colorZone-${idx})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
