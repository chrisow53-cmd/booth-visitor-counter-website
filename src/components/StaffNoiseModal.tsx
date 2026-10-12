import React, { useEffect } from 'react';
import { Sliders, X, Info } from 'lucide-react';
import { StaffConfig } from '../types/telemetry';

interface StaffNoiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffConfig: StaffConfig;
  setStaffConfig: React.Dispatch<React.SetStateAction<StaffConfig>>;
}

export const StaffNoiseModal: React.FC<StaffNoiseModalProps> = ({
  isOpen,
  onClose,
  staffConfig,
  setStaffConfig
}) => {
  // Listen for Escape key to exit modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const zones = ['Zone-1', 'Zone-2', 'Zone-3', 'Zone-4', 'Zone-5', 'Zone-6', 'Zone-7', 'Zone-8'];

  const handleToggle = () => {
    setStaffConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleZoneDeductionChange = (zoneId: string, val: number) => {
    setStaffConfig((prev) => ({
      ...prev,
      deductionPerZone: {
        ...prev.deductionPerZone,
        [zoneId]: Math.max(0, Math.min(15, val))
      }
    }));
  };

  const setAllDeduction = (val: number) => {
    setStaffConfig((prev) => ({
      ...prev,
      deductionPerZone: {
        'Zone-1': val,
        'Zone-2': val,
        'Zone-3': val,
        'Zone-4': val,
        'Zone-5': val,
        'Zone-6': val,
        'Zone-7': val,
        'Zone-8': val
      }
    }));
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-[#0f172a] w-full max-w-2xl max-h-[85vh] rounded-2xl border border-indigo-500/30 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Staff Baseline Noise Filter</h3>
              <p className="text-xs text-slate-400">Deduct baseline staff counts from table metrics</p>
            </div>
          </div>
          
          {/* Top Exit / Close Button */}
          <button
            onClick={onClose}
            title="Close filter modal (Esc)"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          
          {/* Info Banner */}
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-start gap-3 text-xs text-indigo-200">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              Stationed staff (e.g. 4-5 per table) can skew headcount metrics.
              Adjust deductions below to subtract staff counts from visitor data.
            </span>
          </div>

          {/* Master Filter Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <div className="text-sm font-semibold text-white">Enable Staff Noise Reduction</div>
              <div className="text-xs text-slate-400">Substract staff count from headcount & demographic calculations</div>
            </div>
            <button
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                staffConfig.enabled ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  staffConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-400 font-medium">Quick Presets:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setAllDeduction(0)}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-indigo-600/30 hover:text-indigo-200 transition border border-slate-700"
              >
                Reset (0)
              </button>
              <button
                onClick={() => setAllDeduction(4)}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-indigo-600/30 hover:text-indigo-200 transition border border-slate-700"
              >
                -4 per Table
              </button>
              <button
                onClick={() => setAllDeduction(5)}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-indigo-600/30 hover:text-indigo-200 transition border border-slate-700"
              >
                -5 per Table
              </button>
            </div>
          </div>

          {/* 8 Tables Grid Sliders (2 Columns layout for compact fit) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {zones.map((zoneId, idx) => {
              const currentVal = staffConfig.deductionPerZone[zoneId] ?? 4;
              const tableNum = idx + 1;
              return (
                <div key={zoneId} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-200">Table {tableNum} Staff</span>
                    <span className="font-mono text-indigo-400 font-bold">{currentVal} staff</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={currentVal}
                    onChange={(e) => handleZoneDeductionChange(zoneId, parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              );
            })}
          </div>

        </div>

        {/* Fixed Footer with Close / Apply Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/80 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
          >
            Exit / Close
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-500/20"
          >
            Apply & Save
          </button>
        </div>

      </div>
    </div>
  );
};
