import React, { useState, useMemo, useCallback } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { Header } from './components/Header';
import { GlobalTotalsHeader } from './components/GlobalTotalsHeader';
import { TableGrid } from './components/TableGrid';
import { SelectedFloatingBar } from './components/SelectedFloatingBar';
import { StaffNoiseModal } from './components/StaffNoiseModal';
import { VisitorDetailModal } from './components/VisitorDetailModal';
import { ErrorPage } from './components/ErrorPage';
import { DailyTrendCharts } from './components/DailyTrendCharts';
import { CampaignOverview } from './components/CampaignOverview';
import { CampaignEditModal } from './components/CampaignEditModal';
import { CampaignCreateModal } from './components/CampaignCreateModal';
import { useCampaign } from './hooks/useCampaign';
import { StaffConfig } from './types/telemetry';
import { DashboardSnapshots } from './components/DashboardSnapshots';

export function App() {
  // Campaign settings state & modal
  const {
    campaign,
    campaigns,
    loading: campaignLoading,
    updateCampaign,
    createCampaign,
    activateCampaign,
    deleteCampaign,
  } = useCampaign();

  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isCampaignCreateModalOpen, setIsCampaignCreateModalOpen] = useState(false);

  // Baseline staff noise reduction configuration
  const [staffConfig, setStaffConfig] = useState<StaffConfig>({
    enabled: true,
    deductionPerZone: {
      'Main Zone': 4,
    }
  });

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<{ date: string; shiftId: number } | null>(null);
  const [showDemographics, setShowDemographics] = useState<boolean>(false);
  const [viewCachedData, setViewCachedData] = useState<boolean>(false);

  const {
    summaries,
    loading,
    error,
    setError,
    lastRefreshed,
    autoRefresh,
    setAutoRefresh,
    fetchData,
  } = useTelemetry(campaign?.id);

  // Dynamic multi-shift selection state (e.g. Day 1 Shift 1 + Day 2 Shift 2)
  const [selectedShiftKeys, setSelectedShiftKeys] = useState<string[]>([]);

  // Unique sorted dates mapping
  const uniqueDates = useMemo(() => {
    return Array.from(new Set(summaries.map((s) => s.shift_date))).sort();
  }, [summaries]);

  // Toggle individual shift in/out of the selected total set
  const toggleShiftSelection = useCallback((shiftDate: string, shiftId: number) => {
    const key = `${shiftDate}_${shiftId}`;
    setSelectedShiftKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  // Remove specific shift from selection
  const removeShiftSelection = useCallback((key: string) => {
    setSelectedShiftKeys((prev) => prev.filter((k) => k !== key));
  }, []);

  // Clear all selections (reverting back to baseline overall event totals)
  const clearShiftSelection = useCallback(() => {
    setSelectedShiftKeys([]);
  }, []);

  // Select all 8 shifts explicitly
  const selectAllShifts = useCallback(() => {
    const allKeys = summaries.map((s) => `${s.shift_date}_${s.shift_id}`);
    setSelectedShiftKeys(allKeys);
  }, [summaries]);

  // Quick preset handler
  const handleSelectPreset = useCallback((preset: 'all' | 'clear' | 'day1' | 'day2' | 'day3' | 'day4' | 'shift1' | 'shift2') => {
    if (preset === 'all') {
      selectAllShifts();
      return;
    }
    if (preset === 'clear') {
      clearShiftSelection();
      return;
    }

    if (preset === 'shift1') {
      const shift1Keys = summaries.filter((s) => s.shift_id === 1).map((s) => `${s.shift_date}_${s.shift_id}`);
      setSelectedShiftKeys(shift1Keys);
      return;
    }

    if (preset === 'shift2') {
      const shift2Keys = summaries.filter((s) => s.shift_id === 2).map((s) => `${s.shift_date}_${s.shift_id}`);
      setSelectedShiftKeys(shift2Keys);
      return;
    }

    // Day presets: day1, day2, day3, day4
    const dayIndexMap: Record<string, number> = { day1: 0, day2: 1, day3: 2, day4: 3 };
    const targetDayIndex = dayIndexMap[preset];
    if (targetDayIndex !== undefined && uniqueDates[targetDayIndex]) {
      const targetDate = uniqueDates[targetDayIndex];
      const dayKeys = summaries.filter((s) => s.shift_date === targetDate).map((s) => `${s.shift_date}_${s.shift_id}`);
      setSelectedShiftKeys(dayKeys);
    }
  }, [summaries, uniqueDates, selectAllShifts, clearShiftSelection]);

  // Derived metrics for the floating bar
  const selectedSummaries = useMemo(() => {
    if (selectedShiftKeys.length === 0) return [];
    return summaries.filter((s) => selectedShiftKeys.includes(`${s.shift_date}_${s.shift_id}`));
  }, [summaries, selectedShiftKeys]);

  const { selectedVisitors, selectedAvgDwell, selectedLabels } = useMemo(() => {
    if (selectedSummaries.length === 0) {
      return { selectedVisitors: 0, selectedAvgDwell: 0, selectedLabels: [] };
    }

    let visitors = 0;
    let dwellWeighted = 0;
    const labels: string[] = [];

    selectedSummaries.forEach((s) => {
      visitors += s.total_visitors;
      dwellWeighted += s.avg_dwell_seconds * s.total_visitors;
      const dayIdx = uniqueDates.indexOf(s.shift_date) + 1;
      labels.push(`Day ${dayIdx > 0 ? dayIdx : 'Event'} S${s.shift_id}`);
    });

    const avgDwell = visitors > 0 ? Math.round(dwellWeighted / visitors) : 0;
    return {
      selectedVisitors: visitors,
      selectedAvgDwell: avgDwell,
      selectedLabels: labels,
    };
  }, [selectedSummaries, uniqueDates]);

  // Smooth scroll helper to jump to totals
  const handleScrollToTotals = () => {
    const el = document.getElementById('totals-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
      
      {/* Sleek Navigation Header */}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-6">

        {/* 0. Campaign Settings Overview Header Section */}
        <CampaignOverview
          campaign={campaign}
          campaigns={campaigns}
          loading={campaignLoading}
          onOpenEdit={() => setIsCampaignModalOpen(true)}
          onOpenCreate={() => setIsCampaignCreateModalOpen(true)}
          onSelectCampaign={async (id) => {
            await activateCampaign(id);
            clearShiftSelection();
          }}
          onDeleteCampaign={async (id) => {
            await deleteCampaign(id);
            clearShiftSelection();
          }}
        />

        {/* 1. 4-Day Event Shift Occupancy Grid (8 Shift Cards with multi-select) */}
        <TableGrid
          summaries={summaries}
          loading={loading}
          selectedShiftKeys={selectedShiftKeys}
          onToggleShiftSelection={toggleShiftSelection}
          onSelectPreset={handleSelectPreset}
          onInspectShift={(date, shiftId) => setSelectedShiftForDetail({ date, shiftId })}
          showDemographics={showDemographics}
        />

        {/* 1b. CCTV Snapshot Viewer */}
        <DashboardSnapshots
          campaignId={campaign?.id}
          availableDates={uniqueDates}
          autoRefreshMs={autoRefresh ? 30000 : 0}
        />

        {/* 2. Selected Shifts Aggregate / Overall Event Totals */}
        <GlobalTotalsHeader
          summaries={summaries}
          selectedShiftKeys={selectedShiftKeys}
          onClearSelection={clearShiftSelection}
          onRemoveShift={removeShiftSelection}
          onSelectAll={selectAllShifts}
          loading={loading}
          showDemographics={showDemographics}
        />

        {/* 3. Day-by-Day Event Trend & Demographic Graphs */}
        <DailyTrendCharts
          summaries={summaries}
          selectedShiftKeys={selectedShiftKeys}
          showDemographics={showDemographics}
        />

      </main>

      {/* Floating Real-time Selection Dock */}
      <SelectedFloatingBar
        selectedCount={selectedShiftKeys.length}
        totalShiftsCount={summaries.length}
        selectedVisitors={selectedVisitors}
        selectedAvgDwell={selectedAvgDwell}
        selectedLabels={selectedLabels}
        onClearSelection={clearShiftSelection}
        onScrollToTotals={handleScrollToTotals}
      />

      {/* Sleek Minimalist Footer */}
      <footer className="border-t border-slate-900 bg-[#05080f] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-slate-400 font-medium">
            {campaign?.client_name ? `${campaign.client_name} • Visitor Analytics Platform` : 'CARCHING Visitor Analytics Platform'}
          </span>
          <span className="text-slate-500 font-mono">
            {campaign?.location || '1 Camera • 4 Days • 2 Shifts/Day (8 Shifts)'}
          </span>
        </div>
      </footer>

      {/* Campaign Settings Create Modal */}
      <CampaignCreateModal
        isOpen={isCampaignCreateModalOpen}
        onClose={() => setIsCampaignCreateModalOpen(false)}
        onCreate={async (newCampaign) => {
          await createCampaign(newCampaign);
          clearShiftSelection();
        }}
      />

      {/* Campaign Settings Edit Modal */}
      <CampaignEditModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        campaign={campaign}
        onSave={updateCampaign}
      />

      {/* Staff Baseline Noise Modal */}
      <StaffNoiseModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffConfig={staffConfig}
        setStaffConfig={setStaffConfig}
      />

      {/* Click-to-Detail Visitor Session Modal */}
      <VisitorDetailModal
        isOpen={!!selectedShiftForDetail}
        onClose={() => setSelectedShiftForDetail(null)}
        shiftDate={selectedShiftForDetail?.date ?? null}
        shiftId={selectedShiftForDetail?.shiftId ?? null}
        staffConfig={staffConfig}
        showDemographics={showDemographics}
        onError={setError}
        onStatusChange={fetchData}
      />

    </div>
  );
}

export default App;
