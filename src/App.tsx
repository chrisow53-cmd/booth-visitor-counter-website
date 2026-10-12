import React, { useState } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { Header } from './components/Header';
import { GlobalTotalsHeader } from './components/GlobalTotalsHeader';
import { TableGrid } from './components/TableGrid';
import { StaffNoiseModal } from './components/StaffNoiseModal';
import { VisitorDetailModal } from './components/VisitorDetailModal';
import { ErrorPage } from './components/ErrorPage';
import { StaffConfig } from './types/telemetry';

export function App() {
  const {
    summaries,
    loading,
    error,
    setError,
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
  const [showDemographics, setShowDemographics] = useState<boolean>(true);
  const [viewCachedData, setViewCachedData] = useState<boolean>(false);

  // Dedicated Error Page when an issue/connection failure occurs
  if (error && !viewCachedData) {
    const errorWithActions = {
      ...error,
      retryAction: error.retryAction || (async () => {
        setViewCachedData(false);
        await fetchData();
      }),
      recoverAction: error.recoverAction || (summaries.length > 0 ? () => setViewCachedData(true) : undefined),
      recoverLabel: error.recoverLabel || (summaries.length > 0 ? 'View Cached Shift Data' : undefined),
    };

    return (
      <ErrorPage
        error={errorWithActions}
        onClearError={() => {
          setError(null);
          setViewCachedData(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Sleek Uncluttered Navigation Header */}
      <Header
        lastRefreshed={lastRefreshed}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onRefresh={() => {
          setViewCachedData(false);
          fetchData();
        }}
        staffConfig={staffConfig}
        onOpenStaffModal={() => setIsStaffModalOpen(true)}
        showDemographics={showDemographics}
        onToggleDemographics={() => setShowDemographics((prev) => !prev)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-6">

        {/* 1. 4-Day Event Shift Occupancy Grid (8 Shift Cards) */}
        <TableGrid
          summaries={summaries}
          loading={loading}
          onSelectShift={(date, shiftId) => setSelectedShift({ date, shiftId })}
          showDemographics={showDemographics}
        />

        {/* 2. Global Totals Summary Cards */}
        <GlobalTotalsHeader
          summaries={summaries}
          loading={loading}
          showDemographics={showDemographics}
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
        showDemographics={showDemographics}
        onError={setError}
      />

    </div>
  );
}

export default App;
