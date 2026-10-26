import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CctvSnapshot } from '../types/telemetry';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  ZoomIn,
  Calendar,
  Play,
  Pause,
  Grid,
  Maximize2,
  X,
  ArrowUpDown,
  Filter,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface SnapshotDateInfo {
  date: string;
  count: number;
}

interface DashboardSnapshotsProps {
  /** Filter snapshots for a specific campaign */
  campaignId?: number;
  /** Auto-refresh interval in ms. 0 = disabled. Default: 30000 (30s) */
  autoRefreshMs?: number;
  /** Available dates for the active campaign from telemetry/calendar */
  availableDates?: string[];
  /** Initially selected date */
  initialDate?: string | null;
}

export const DashboardSnapshots: React.FC<DashboardSnapshotsProps> = ({
  campaignId,
  autoRefreshMs = 30000,
  availableDates = [],
  initialDate = null,
}) => {
  // Navigation & filter states
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'all' | number>('all');
  const [snapshots, setSnapshots] = useState<CctvSnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sortAsc, setSortAsc] = useState<boolean>(true); // Chronological by default (AM -> PM)
  const [viewMode, setViewMode] = useState<'player' | 'grid'>('player');

  // Server date metadata
  const [serverDateCounts, setServerDateCounts] = useState<Record<string, number>>({});

  // Player & UI states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Thumbnail container ref for auto-scrolling
  const thumbnailContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch distinct snapshot dates and their counts dynamically from DB
  const fetchDateCounts = useCallback(async () => {
    try {
      const url = campaignId
        ? `/api/snapshots/dates?campaign_id=${campaignId}`
        : `/api/snapshots/dates`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const countsMap: Record<string, number> = {};
        (json.dates || []).forEach((item: SnapshotDateInfo) => {
          countsMap[item.date] = item.count;
        });
        setServerDateCounts(countsMap);
      }
    } catch {
      // Non-blocking background fetch
    }
  }, [campaignId]);

  // Merge available dates from campaign with distinct snapshot dates found in DB
  const allDateOptions = useMemo(() => {
    const dateSet = new Set<string>();
    (availableDates || []).forEach((d) => d && dateSet.add(d));
    Object.keys(serverDateCounts).forEach((d) => d && dateSet.add(d));
    return Array.from(dateSet).sort();
  }, [availableDates, serverDateCounts]);

  // Auto-select date: pick initialDate, or latest date with snapshots, or first date
  useEffect(() => {
    if (allDateOptions.length === 0) return;

    // If currently no date selected or current selection is not valid
    if (!selectedDate || !allDateOptions.includes(selectedDate)) {
      if (initialDate && allDateOptions.includes(initialDate)) {
        setSelectedDate(initialDate);
        return;
      }
      // Find latest date that has snapshots (count > 0)
      const latestWithPhotos = [...allDateOptions].reverse().find(
        (d) => (serverDateCounts[d] ?? 0) > 0
      );
      setSelectedDate(latestWithPhotos || allDateOptions[0]);
    }
  }, [allDateOptions, serverDateCounts, selectedDate, initialDate]);

  // 2. Fetch snapshots for the selected date
  const fetchSnapshots = useCallback(async () => {
    if (!selectedDate) return;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (campaignId) params.append('campaign_id', String(campaignId));
      params.append('date', selectedDate);
      params.append('limit', '1000'); // Fetch all snapshots on that day
      params.append('order', sortAsc ? 'asc' : 'desc');

      const res = await fetch(`/api/snapshots?${params.toString()}`);
      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
      const json = await res.json();
      const data: CctvSnapshot[] = json.data || [];

      setSnapshots(data);
      setCurrentIndex(0);
      setImgLoaded(false);
      setImgError(false);
      setLastFetched(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load CCTV snapshots');
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedDate, sortAsc]);

  // Initial fetch and date counts sync
  useEffect(() => {
    fetchDateCounts();
  }, [fetchDateCounts]);

  useEffect(() => {
    if (selectedDate) {
      fetchSnapshots();
    }
  }, [selectedDate, fetchSnapshots]);

  // Auto-refresh interval (only when not actively playing slideshow)
  useEffect(() => {
    if (!autoRefreshMs || isPlaying) return;
    const id = setInterval(() => {
      fetchSnapshots();
      fetchDateCounts();
    }, autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefreshMs, isPlaying, fetchSnapshots, fetchDateCounts]);

  // Helper to determine shift ID (from snapshot.shift_id or timestamp hour)
  const getSnapshotShiftId = useCallback((snap: CctvSnapshot): number => {
    if (snap.shift_id) return snap.shift_id;
    try {
      const hour = new Date(snap.timestamp).getHours();
      return hour >= 15 ? 2 : 1;
    } catch {
      return 1;
    }
  }, []);

  // Filter snapshots if shift sub-filter is active
  const filteredSnapshots = useMemo(() => {
    if (selectedShiftFilter === 'all') return snapshots;
    return snapshots.filter((s) => getSnapshotShiftId(s) === selectedShiftFilter);
  }, [snapshots, selectedShiftFilter, getSnapshotShiftId]);

  // Available shifts on the currently loaded day
  const availableShifts = useMemo(() => {
    const shiftSet = new Set<number>();
    snapshots.forEach((s) => shiftSet.add(getSnapshotShiftId(s)));
    return Array.from(shiftSet).sort();
  }, [snapshots, getSnapshotShiftId]);

  // Reset image states on index change
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [currentIndex, selectedShiftFilter]);

  // Slideshow auto-advance
  useEffect(() => {
    if (!isPlaying || filteredSnapshots.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1 >= filteredSnapshots.length ? 0 : prev + 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [isPlaying, filteredSnapshots.length]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const activeBtn = thumbnailContainerRef.current.querySelector(
        `[data-index="${currentIndex}"]`
      );
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [currentIndex]);

  // Keyboard navigation for carousel & lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentIndex((i) => Math.min(filteredSnapshots.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Escape' && lightboxOpen) {
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredSnapshots.length, lightboxOpen]);

  const current = filteredSnapshots[currentIndex] ?? null;
  const total = filteredSnapshots.length;

  const goNext = () => setCurrentIndex((i) => Math.min(total - 1, i + 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));

  // Date navigation helpers: Jump to next/prev day
  const currentDateIndex = selectedDate ? allDateOptions.indexOf(selectedDate) : -1;
  const hasPrevDate = currentDateIndex > 0;
  const hasNextDate = currentDateIndex >= 0 && currentDateIndex < allDateOptions.length - 1;

  const goToPrevDate = () => {
    if (hasPrevDate) {
      setSelectedDate(allDateOptions[currentDateIndex - 1]);
      setSelectedShiftFilter('all');
    }
  };

  const goToNextDate = () => {
    if (hasNextDate) {
      setSelectedDate(allDateOptions[currentDateIndex + 1]);
      setSelectedShiftFilter('all');
    }
  };

  // Formatters
  const formatFullTs = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('en-MY', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: false,
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const formatTimeOnly = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('en-MY', {
        timeStyle: 'medium',
        hour12: false,
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const formatDatePillLabel = (dateStr: string, idx: number) => {
    try {
      const d = new Date(dateStr);
      const dayMonth = new Intl.DateTimeFormat('en-MY', {
        day: 'numeric',
        month: 'short',
      }).format(d);
      return `Day ${idx + 1} • ${dayMonth}`;
    } catch {
      return dateStr;
    }
  };

  const formatSelectedDateHeader = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-MY', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Determine shift slot for current snapshot time
  const getShiftBadge = (iso: string, shiftId?: number) => {
    const sId = shiftId || (new Date(iso).getHours() >= 15 ? 2 : 1);
    if (sId === 1) {
      return { label: 'Shift 1', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
    if (sId === 2) {
      return { label: 'Shift 2', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    }
    return { label: `Shift ${sId}`, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
  };

  return (
    <>
      <section className="mb-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                  CCTV Snapshots
                </h2>
                {selectedDate && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-cyan-500/15 text-cyan-300 border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    {total} on {formatSelectedDateHeader(selectedDate)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {selectedDate
                  ? `Viewing all camera snapshots recorded on ${formatSelectedDateHeader(selectedDate)}`
                  : 'Select an event date to view recorded camera snapshots'}
              </p>
            </div>
          </div>

          {/* Action Bar (View mode toggle, sort, refresh) */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View Mode Toggle: Interactive Player vs Full Gallery Grid */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('player')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                  viewMode === 'player'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Single snapshot viewer with timeline scrubber and slideshow"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Viewer</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                  viewMode === 'grid'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="All photos grid on selected day"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>All Photos</span>
              </button>
            </div>

            {/* Sort order toggle (AM -> PM vs PM -> AM) */}
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition"
              title={`Sorting: ${sortAsc ? 'AM → PM (Earliest first)' : 'PM → AM (Latest first)'}`}
            >
              <ArrowUpDown className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">{sortAsc ? 'AM → PM' : 'PM → AM'}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchSnapshots();
                fetchDateCounts();
              }}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition disabled:opacity-50"
              title="Refresh snapshots"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Dynamic Date Selection Bar with Quick Prev/Next Navigation */}
        <div className="flex items-center gap-2 pb-2 mb-3">
          {/* Previous Day Jump Button */}
          <button
            onClick={goToPrevDate}
            disabled={!hasPrevDate}
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 border border-slate-800 transition shrink-0"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dynamic Date Pills for Every Event Day */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-slate-800 flex-1">
            {allDateOptions.map((dateStr, idx) => {
              const count = serverDateCounts[dateStr] ?? 0;
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setSelectedShiftFilter('all');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 flex items-center gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/50 shadow-md shadow-cyan-500/20'
                      : count > 0
                      ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-800 hover:border-slate-700'
                      : 'bg-slate-900/40 text-slate-500 border-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <Calendar className={`w-3 h-3 ${isSelected ? 'text-white' : count > 0 ? 'text-cyan-400' : 'text-slate-600'}`} />
                  <span>{formatDatePillLabel(dateStr, idx)}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white font-bold'
                        : count > 0
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 font-bold'
                        : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Next Day Jump Button */}
          <button
            onClick={goToNextDate}
            disabled={!hasNextDate}
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 border border-slate-800 transition shrink-0"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Shift Sub-Filter (shown only when multiple shifts exist on the selected day) */}
        {availableShifts.length > 1 && (
          <div className="flex items-center gap-2 mb-3 pl-1 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" /> Filter Shift:
            </span>
            <button
              onClick={() => setSelectedShiftFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                selectedShiftFilter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              All Shifts ({snapshots.length})
            </button>
            {availableShifts.map((sId) => {
              const count = snapshots.filter((s) => getSnapshotShiftId(s) === sId).length;
              return (
                <button
                  key={sId}
                  onClick={() => setSelectedShiftFilter(sId)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                    selectedShiftFilter === sId
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Shift {sId} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Main Viewer / Photo Wall Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          {loading && snapshots.length === 0 ? (
            /* Initial loading skeleton */
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500">
              <Loader2 className="w-9 h-9 animate-spin text-cyan-400" />
              <span className="text-xs font-medium">
                {selectedDate
                  ? `Loading snapshots for ${formatSelectedDateHeader(selectedDate)}...`
                  : 'Loading snapshots...'}
              </span>
            </div>
          ) : error ? (
            /* Error state */
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500 p-6">
              <AlertCircle className="w-9 h-9 text-rose-400" />
              <p className="text-xs text-rose-400 text-center font-medium">{error}</p>
              <button
                onClick={fetchSnapshots}
                className="mt-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition"
              >
                Retry
              </button>
            </div>
          ) : filteredSnapshots.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500 p-6">
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <ImageIcon className="w-10 h-10 opacity-30 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {selectedDate
                  ? `No snapshots recorded on ${formatSelectedDateHeader(selectedDate)}`
                  : 'No CCTV snapshots available'}
              </p>
              <p className="text-xs text-slate-500 max-w-md text-center leading-relaxed">
                {selectedDate
                  ? 'Switch to another date tab above or process video footage recorded on this date.'
                  : 'Please select an event date above.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Full Gallery Grid View (Shows ALL photos on that day at a glance!) */
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 text-xs text-slate-400">
                <span>
                  Showing all <strong className="text-cyan-400">{total}</strong> snapshots for{' '}
                  <strong>{selectedDate ? formatSelectedDateHeader(selectedDate) : 'selected date'}</strong>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Click any photo to enlarge</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[640px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                {filteredSnapshots.map((snap, i) => {
                  const shift = getShiftBadge(snap.timestamp, snap.shift_id);
                  return (
                    <div
                      key={snap.id}
                      onClick={() => {
                        setCurrentIndex(i);
                        setLightboxOpen(true);
                      }}
                      className="group relative bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/60 transition shadow-md hover:shadow-cyan-500/10 cursor-pointer"
                    >
                      <div className="aspect-video relative overflow-hidden bg-slate-900 flex items-center justify-center">
                        <img
                          src={snap.image_url}
                          alt={`CCTV Snapshot ${i + 1}`}
                          loading="lazy"
                          onError={(e) => {
                            // Graceful fallback for broken image
                            (e.target as HTMLElement).style.display = 'none';
                            const parent = (e.target as HTMLElement).parentElement;
                            if (parent) {
                              parent.classList.add('bg-slate-900');
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[11px] font-mono text-slate-200">
                          <span>{formatTimeOnly(snap.timestamp)}</span>
                          <span className="text-[10px] text-cyan-400/90 font-semibold">#{snap.id}</span>
                        </div>
                      </div>
                      {shift && (
                        <div className="p-1.5 px-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${shift.color} truncate max-w-full`}
                          >
                            {shift.label}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">#{i + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : current ? (
            /* Interactive Player / Carousel Mode */
            <div className="flex flex-col lg:flex-row">
              {/* Main Image Panel */}
              <div className="relative flex-1 bg-slate-950/90 min-h-[320px] lg:min-h-[480px] flex items-center justify-center group/img overflow-hidden">
                {!imgLoaded && !imgError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400/60" />
                  </div>
                )}

                {imgError ? (
                  /* Elegant fallback if image file is missing or failed to load */
                  <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3 shadow-lg">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">Snapshot File Unavailable</p>
                    <p className="text-xs text-slate-400 mt-1">
                      The image file for snapshot #{current.id} ({formatTimeOnly(current.timestamp)}) could not be loaded from storage.
                    </p>
                    <span className="mt-3 text-[10px] font-mono text-slate-500 bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-800 truncate max-w-full">
                      {current.image_url}
                    </span>
                  </div>
                ) : (
                  <img
                    key={current.image_url}
                    src={current.image_url}
                    alt={`CCTV Snapshot — ${formatFullTs(current.timestamp)}`}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => {
                      setImgLoaded(true);
                      setImgError(true);
                    }}
                    onClick={() => setLightboxOpen(true)}
                    className={`max-h-[480px] w-full object-contain transition-all duration-300 cursor-zoom-in ${
                      imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-98'
                    }`}
                  />
                )}

                {/* Left / Right Quick Hover Overlay Buttons on the Image */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  disabled={currentIndex === 0}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-cyan-600 text-white border border-white/10 opacity-0 group-hover/img:opacity-100 transition disabled:opacity-0 disabled:pointer-events-none shadow-xl"
                  title="Previous snapshot"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  disabled={currentIndex >= total - 1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-cyan-600 text-white border border-white/10 opacity-0 group-hover/img:opacity-100 transition disabled:opacity-0 disabled:pointer-events-none shadow-xl"
                  title="Next snapshot"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Top Floating Badge on Image */}
                <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-mono text-cyan-300 flex items-center gap-1.5 shadow-lg">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{formatTimeOnly(current.timestamp)}</span>
                  </div>
                  {getShiftBadge(current.timestamp, current.shift_id) && (
                    <div
                      className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold backdrop-blur-md shadow-lg ${
                        getShiftBadge(current.timestamp, current.shift_id)?.color
                      }`}
                    >
                      {getShiftBadge(current.timestamp, current.shift_id)?.label}
                    </div>
                  )}
                </div>

                {/* Zoom Hint Overlay */}
                {imgLoaded && !imgError && (
                  <div className="absolute bottom-3 right-3 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-1.5 flex items-center gap-2 border border-white/10 shadow-lg">
                      <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs text-white font-medium">Click for Fullscreen</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar: Details + Timeline Scrubber + Thumbnails */}
              <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/40 p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  {/* Snapshot Details Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Snapshot Details</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 mt-0.5">
                        {formatFullTs(current.timestamp)}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                      ID #{current.id}
                    </span>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap gap-2 my-3">
                    {getShiftBadge(current.timestamp, current.shift_id) && (
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          getShiftBadge(current.timestamp, current.shift_id)?.color
                        }`}
                      >
                        {getShiftBadge(current.timestamp, current.shift_id)?.label}
                      </span>
                    )}
                    {current.camera_id && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        Cam: {current.camera_id}
                      </span>
                    )}
                  </div>

                  {/* Timeline Position & Slider */}
                  <div className="my-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 font-medium">Timeline Position</span>
                      <span className="font-mono text-cyan-400 font-semibold">
                        {currentIndex + 1} of {total}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, total - 1)}
                      value={currentIndex}
                      onChange={(e) => setCurrentIndex(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
                      <span>{filteredSnapshots[0] ? formatTimeOnly(filteredSnapshots[0].timestamp) : '--:--'}</span>
                      <span>
                        {filteredSnapshots[total - 1]
                          ? formatTimeOnly(filteredSnapshots[total - 1].timestamp)
                          : '--:--'}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnails Gallery Header with Slideshow Play/Pause */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Day Photos ({total})
                    </span>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition ${
                        isPlaying
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                      }`}
                      title={isPlaying ? 'Pause slideshow' : 'Autoplay day timelapse'}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3 h-3" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" /> Play
                        </>
                      )}
                    </button>
                  </div>

                  {/* Thumbnail Scroll Strip */}
                  <div
                    ref={thumbnailContainerRef}
                    className="flex flex-wrap lg:grid lg:grid-cols-4 gap-2 max-h-[170px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800"
                  >
                    {filteredSnapshots.map((snap, i) => {
                      const isActive = i === currentIndex;
                      return (
                        <button
                          key={snap.id}
                          data-index={i}
                          onClick={() => setCurrentIndex(i)}
                          className={`relative aspect-video rounded-lg overflow-hidden border transition shrink-0 w-20 lg:w-auto bg-slate-900 ${
                            isActive
                              ? 'border-cyan-400 ring-2 ring-cyan-500/40 scale-102 shadow-md shadow-cyan-500/20'
                              : 'border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={snap.image_url}
                            alt={`Thumb ${i + 1}`}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-slate-200">
                            {formatTimeOnly(snap.timestamp).substring(0, 5)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800">
                  <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-200 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Older</span>
                  </button>

                  <span className="text-xs font-mono text-slate-400">
                    {currentIndex + 1} / {total}
                  </span>

                  <button
                    onClick={goNext}
                    disabled={currentIndex >= total - 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-200 transition"
                  >
                    <span>Newer</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && current && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Lightbox Header */}
          <div
            className="flex items-center justify-between text-white pb-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  CCTV Snapshot #{current.id}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {formatFullTs(current.timestamp)} •{' '}
                  {selectedDate && formatSelectedDateHeader(selectedDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 bg-white/10 px-3 py-1 rounded-full">
                {currentIndex + 1} / {total}
              </span>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Image */}
          <div
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {imgError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-slate-900 rounded-2xl border border-slate-800">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
                <p className="text-sm font-semibold text-white">Snapshot File Unavailable</p>
                <p className="text-xs text-slate-400 mt-1">
                  Unable to load image for snapshot #{current.id} from storage.
                </p>
              </div>
            ) : (
              <img
                src={current.image_url}
                alt={`CCTV Snapshot ${current.id}`}
                className="max-h-[82vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
              />
            )}

            {/* Left / Right overlay navigation */}
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-cyan-600 text-white disabled:opacity-0 transition shadow-2xl"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goNext}
              disabled={currentIndex >= total - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-cyan-600 text-white disabled:opacity-0 transition shadow-2xl"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Footer with Scrub Thumbnails */}
          <div
            className="flex items-center justify-center gap-2 overflow-x-auto py-2 border-t border-white/10 max-h-24 scrollbar-thin scrollbar-thumb-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {filteredSnapshots.map((snap, i) => (
              <button
                key={snap.id}
                onClick={() => setCurrentIndex(i)}
                className={`relative h-14 aspect-video rounded-lg overflow-hidden border transition shrink-0 bg-slate-900 ${
                  i === currentIndex
                    ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-105'
                    : 'border-white/10 opacity-50 hover:opacity-100'
                }`}
              >
                <img
                  src={snap.image_url}
                  alt={`Thumb ${i + 1}`}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0.5 right-1 text-[8px] font-mono text-white/90 bg-black/60 px-1 rounded">
                  {formatTimeOnly(snap.timestamp).substring(0, 5)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
