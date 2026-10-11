import React, { useState } from 'react';
import { TelemetryRecord, SummaryRecord, StaffConfig } from '../types/telemetry';
import { IntervalTable } from './IntervalTable';
import { SummaryTable } from './SummaryTable';
import { Table, BarChart3, Clock, CalendarDays } from 'lucide-react';

interface TableSectionProps {
  telemetry: TelemetryRecord[];
  summaries: SummaryRecord[];
  staffConfig: StaffConfig;
}

export const TableSection: React.FC<TableSectionProps> = ({ telemetry, summaries, staffConfig }) => {
  const [activeTab, setActiveTab] = useState<'interval' | 'summary'>('interval');

  return (
    <section>
      {/* View Switcher Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Table className="w-5 h-5 text-indigo-400" />
            Visitor Metrics & TanStack Telemetry Log
          </h2>
          <p className="text-xs text-slate-400">Switch between 15-minute Raspberry Pi edge intervals and 6-hour half-day aggregates</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('interval')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'interval'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            15-Min Interval Logs
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'summary'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            6-Hour (Half-Day) Summary
          </button>
        </div>
      </div>

      {/* Render Active Table View */}
      {activeTab === 'interval' ? (
        <IntervalTable telemetry={telemetry} staffConfig={staffConfig} />
      ) : (
        <SummaryTable summaries={summaries} staffConfig={staffConfig} />
      )}
    </section>
  );
};
