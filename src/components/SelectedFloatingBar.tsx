import React from 'react';
import { formatDwellTime } from '../utils/aggregations';
import { Layers, Users, Clock, X, ArrowDown } from 'lucide-react';

interface SelectedFloatingBarProps {
  selectedCount: number;
  totalShiftsCount: number;
  selectedVisitors: number;
  selectedAvgDwell: number;
  selectedLabels: string[];
  onClearSelection: () => void;
  onScrollToTotals: () => void;
}

export const SelectedFloatingBar: React.FC<SelectedFloatingBarProps> = ({
  selectedCount,
  totalShiftsCount,
  selectedVisitors,
  selectedAvgDwell,
  selectedLabels,
  onClearSelection,
  onScrollToTotals
}) => {
  if (selectedCount === 0) return null;

  return (
    <aside aria-label="Selected shifts summary" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[calc(100%-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-950/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-3.5 sm:px-5 sm:py-3.5 shadow-2xl shadow-indigo-950/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
        
        {/* Left: Selection summary badge & chips */}
        <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto py-0.5">
          <div className="flex items-center gap-2 shrink-0">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Selected Shifts Total
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {selectedCount} of {totalShiftsCount} shifts combined
              </div>
            </div>
          </div>

          {/* Shift tag pills preview */}
          <div className="hidden md:flex items-center gap-1.5 border-l border-slate-800 pl-3">
            {selectedLabels.slice(0, 3).map((lbl) => (
              <span
                key={lbl}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 whitespace-nowrap"
              >
                {lbl}
              </span>
            ))}
            {selectedLabels.length > 3 && (
              <span className="text-[11px] text-slate-500 font-mono">
                +{selectedLabels.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Center: Live Running Aggregated Numbers */}
        <div className="flex items-center justify-around sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Headcount</div>
              <div className="text-base font-extrabold font-mono text-white leading-tight">
                {selectedVisitors.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Avg Dwell</div>
              <div className="text-base font-extrabold font-mono text-amber-300 leading-tight">
                {formatDwellTime(selectedAvgDwell)}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <button
              onClick={onScrollToTotals}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-sm hover:shadow-indigo-500/20 whitespace-nowrap"
              title="Scroll to full breakdown"
            >
              <span>View Total</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClearSelection}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </aside>
  );
};
