import React, { useState } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { Header } from './components/Header';
import { GlobalTotalsHeader } from './components/GlobalTotalsHeader';
import { TableGrid } from './components/TableGrid';
import { StaffNoiseModal } from './components/StaffNoiseModal';
import { VisitorDetailModal } from './components/VisitorDetailModal';
import { StaffConfig } from './types/telemetry';
import { AlertTriangle } from 'lucide-react';

export function App() {
  const {
    summaries,
    loading,
    error,
    lastRefreshed,
    autoRefresh,
    setAutoRefresh,
    fetchData,
  } = useTelemetry();

  // Baseline staff noise reduction configuration
  const [staffConfig, setStaffConfig] = useState<StaffConfig>({
    enabled: true,
    deductionPerZone: {
      'Main Zone': 4,
    }
  });

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<{ date: string; shiftId: number } | null>(null);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Sleek Uncluttered Navigation Header */}
      <Header
        lastRefreshed={lastRefreshed}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onRefresh={fetchData}
        staffConfig={staffConfig}
        onOpenStaffModal={() => setIsStaffModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-6">
        
        {/* Error Alert Banner if connection fails */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold">Server Connection Issue</h4>
                <p className="text-xs text-red-300/80">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 text-xs font-semibold bg-red-800 hover:bg-red-700 text-white rounded-lg transition"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* 1. 4-Day Event Shift Occupancy Grid (8 Shift Cards) */}
        <TableGrid
          summaries={summaries}
          loading={loading}
          onSelectShift={(date, shiftId) => setSelectedShift({ date, shiftId })}
        />

        {/* 2. Global Totals Summary Cards */}
        <GlobalTotalsHeader
          summaries={summaries}
          loading={loading}
        />

      </main>

      {/* Sleek Minimalist Footer */}
      <footer className="border-t border-slate-900 bg-[#05080f] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-slate-400 font-medium">CARCHING Visitor Analytics Platform</span>
          <span className="text-slate-500 font-mono">1 Camera • 4 Days • 2 Shifts/Day (8 Shifts)</span>
        </div>
      </footer>

      {/* Staff Baseline Noise Modal */}
      <StaffNoiseModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffConfig={staffConfig}
        setStaffConfig={setStaffConfig}
      />

      {/* Click-to-Detail Visitor Session Modal */}
      <VisitorDetailModal
        isOpen={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        shiftDate={selectedShift?.date ?? null}
        shiftId={selectedShift?.shiftId ?? null}
        staffConfig={staffConfig}
      />

    </div>
  );
}

export default App;
