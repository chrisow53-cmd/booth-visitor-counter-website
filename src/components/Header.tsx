import React from 'react';
import { RefreshCw, Sliders, Eye, EyeOff } from 'lucide-react';
import { StaffConfig } from '../types/telemetry';

interface HeaderProps {
  lastRefreshed: Date;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  onRefresh: () => void;
  staffConfig: StaffConfig;
  onOpenStaffModal: () => void;
  showDemographics: boolean;
  onToggleDemographics: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  autoRefresh,
  setAutoRefresh,
  onRefresh,
  staffConfig,
  onOpenStaffModal,
  showDemographics,
  onToggleDemographics
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-4 mb-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Clean Header Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900/90 border border-slate-700/60 p-1.5 flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <img src="/carching.png" alt="CARCHING" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-white">CARCHING</h1>
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Shift Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400">Visitor Occupancy & Demographics Analytics</p>
          </div>
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center gap-3">
          
          {/* Gender & Age Demographics Toggle */}
          <button
            onClick={onToggleDemographics}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition border ${
              !showDemographics
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
            title={showDemographics ? 'Hide gender and age demographics' : 'Show gender and age demographics'}
          >
            {showDemographics ? (
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Gender & Age:</span>
            <span className={`font-semibold ${showDemographics ? 'text-indigo-300' : 'text-amber-400'}`}>
              {showDemographics ? 'ON' : 'OFF'}
            </span>
          </button>

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

          {/* Refresh & Auto Poll */}
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
              {autoRefresh ? 'Auto Sync' : 'Paused'}
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
