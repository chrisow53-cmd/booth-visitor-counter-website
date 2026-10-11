import React from 'react';
import { RefreshCw, Sliders, Users } from 'lucide-react';
import { StaffConfig } from '../types/telemetry';

interface HeaderProps {
  lastRefreshed: Date;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  onRefresh: () => void;
  staffConfig: StaffConfig;
  onOpenStaffModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  autoRefresh,
  setAutoRefresh,
  onRefresh,
  staffConfig,
  onOpenStaffModal
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-4 mb-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Clean Header Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-white">CARCHING</h1>
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Monitoring
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-time Visitor Occupancy & Demographics</p>
          </div>
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center gap-3">
          
          {/* Staff Filter Toggle */}
          <button
            onClick={onOpenStaffModal}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition border ${
              staffConfig.enabled
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Sliders className={`w-3.5 h-3.5 ${staffConfig.enabled ? 'text-indigo-400' : ''}`} />
            <span>Staff Filter:</span>
            <span className="font-semibold">
              {staffConfig.enabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Refresh & Live Poll */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={onRefresh}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Refresh telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2 py-1 text-[11px] font-medium rounded transition ${
                autoRefresh ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
