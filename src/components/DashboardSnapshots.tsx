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
} from 'lucide-react';

interface SnapshotDateInfo {
  date: string;
  count: number;
}

interface DashboardSnapshotsProps {
  /** Filter snapshots for a specific campaign */
  campaignId?: number;
  /** How many snapshots to load when in Recent mode. Default: 20 */
  limit?: number;
  /** Auto-refresh interval in ms. 0 = disabled. Default: 30000 (30s) */
  autoRefreshMs?: number;
  /** Available dates for the active campaign from telemetry/calendar */
  availableDates?: string[];
  /** Initially selected date (null = "recent") */
  initialDate?: string | null;
}

export const DashboardSnapshots: React.FC<DashboardSnapshotsProps> = ({
  campaignId,
  limit = 20,
  autoRefreshMs = 30000,
  availableDates = [],
  initialDate = null,
}) => {
  // Navigation & filter states
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate); // null = "recent"
  const [snapshots, setSnapshots] = useState<CctvSnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sortAsc, setSortAsc] = useState<boolean>(true); // Chronological by default when viewing a date
  const [viewMode, setViewMode] = useState<'player' | 'grid'>('player');

  // Server date metadata
  const [serverDateCounts, setServerDateCounts] = useState<Record<string, number>>({});
  
  // Player & UI states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Thumbnail container ref for auto-scrolling
  const thumbnailContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch distinct snapshot dates and their counts
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

  // 2. Fetch snapshots based on selected date or recent
  const fetchSnapshots = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (campaignId) params.append('campaign_id', String(campaignId));

      if (selectedDate && selectedDate !== 'recent') {
        params.append('date', selectedDate);
        params.append('limit', '1000'); // Fetch all snapshots on that day
        params.append('order', sortAsc ? 'asc' : 'desc');
      } else {
        params.append('limit', String(limit));
        params.append('order', 'desc'); // Recent snapshots default to latest first
      }

      const res = await fetch(`/api/snapshots?${params.toString()}`);
      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
      const json = await res.json();
      const data: CctvSnapshot[] = json.data || [];

      setSnapshots(data);
      setCurrentIndex(0);
      setImgLoaded(false);
      setLastFetched(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load CCTV snapshots');
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedDate, sortAsc, limit]);

  // Initial fetch and date counts sync
  useEffect(() => {
    fetchDateCounts();
  }, [fetchDateCounts]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  // Auto-refresh interval (only when not actively playing slideshow)
  useEffect(() => {
    if (!autoRefreshMs || isPlaying) return;
    const id = setInterval(() => {
      fetchSnapshots();
      fetchDateCounts();
    }, autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefreshMs, isPlaying, fetchSnapshots, fetchDateCounts]);

  // Reset image loaded state on index change
  useEffect(() => {
    setImgLoaded(false);
  }, [currentIndex]);

  // Slideshow auto-advance
  useEffect(() => {
    if (!isPlaying || snapshots.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1 >= snapshots.length ? 0 : prev + 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [isPlaying, snapshots.length]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const activeBtn = thumbnailContainerRef.current.querySelector(`[data-index="${currentIndex}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [currentIndex]);

  // Keyboard navigation for carousel & lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentIndex((i) => Math.min(snapshots.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Escape' && lightboxOpen) {
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [snapshots.length, lightboxOpen]);

  // Merge available dates from campaign with distinct snapshot dates found in DB
  const allDateOptions = useMemo(() => {
    const dateSet = new Set<string>();
    availableDates.forEach((d) => dateSet.add(d));
    Object.keys(serverDateCounts).forEach((d) => dateSet.add(d));
    return Array.from(dateSet).sort();
  }, [availableDates, serverDateCounts]);

  const current = snapshots[currentIndex] ?? null;
  const total = snapshots.length;

  const goNext = () => setCurrentIndex((i) => Math.min(total - 1, i + 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));

  // Date/Time Formatters
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
  const getShiftBadge = (iso: string) => {
    try {
      const hour = new Date(iso).getHours();
      if (hour >= 9 && hour < 15) {
        return { label: 'Shift 1 (09:00 - 15:00)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      }
      if (hour >= 15 && hour < 21) {
        return { label: 'Shift 2 (15:00 - 21:00)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      }
      return { label: 'Off-Shift / Setup', color: 'bg-slate-700/30 text-slate-400 border-slate-700/50' };
    } catch {
      return null;
    }
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
                {selectedDate ? (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-cyan-500/15 text-cyan-300 border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    {total} on {formatSelectedDateHeader(selectedDate)}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                    {total} recent
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {selectedDate
                  ? `Viewing all camera snapshots recorded on ${formatSelectedDateHeader(selectedDate)}`
                  : 'Viewing the latest wide-angle CCTV snapshots recorded from the camera stream'}
              </p>
            </div>
          </div>

          {/* Action Bar (View mode toggle, sort, refresh) */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View Mode Toggle: Interactive Player vs Full Gallery Grid */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('player')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  viewMode === 'player'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Single viewer with controls"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Viewer</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  viewMode === 'grid'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Full day photo grid gallery"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">All Photos</span>
              </button>
            </div>

            {/* Sort Order Toggle (when a specific date is selected) */}
            {selectedDate && (
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
                title={sortAsc ? 'Sorting Morning → Night (Click to reverse)' : 'Sorting Night → Morning (Click to reverse)'}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline font-mono text-[11px]">{sortAsc ? 'AM → PM' : 'PM → AM'}</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchSnapshots();
                fetchDateCounts();
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-50"
              title="Refresh snapshots"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Date Selection Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin scrollbar-thumb-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3 text-cyan-400" /> Day Filter:
          </span>

          {/* "Recent (Latest)" option */}
          <button
            onClick={() => setSelectedDate(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 flex items-center gap-1.5 ${
              selectedDate === null
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/50 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            <span>⚡ Recent (Live)</span>
          </button>

          {/* Date Pills for Each Day of the Campaign */}
          {allDateOptions.map((dateStr, idx) => {
            const count = serverDateCounts[dateStr] ?? 0;
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/50 shadow-md shadow-cyan-500/20'
                    : count > 0
                    ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                    : 'bg-slate-900/40 text-slate-500 border-slate-800/40 hover:border-slate-700'
                }`}
              >
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

        {/* Main Viewer / Photo Wall Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          {loading && snapshots.length === 0 ? (
            /* Initial loading skeleton */
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500">
              <Loader2 className="w-9 h-9 animate-spin text-cyan-400" />
              <span className="text-xs font-medium">
                {selectedDate ? `Loading snapshots for ${formatSelectedDateHeader(selectedDate)}...` : 'Loading latest CCTV snapshots...'}
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
          ) : snapshots.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500 p-6">
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <ImageIcon className="w-10 h-10 opacity-30 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {selectedDate ? `No snapshots recorded on ${formatSelectedDateHeader(selectedDate)}` : 'No CCTV snapshots recorded yet'}
              </p>
              <p className="text-xs text-slate-500 max-w-md text-center leading-relaxed">
                {selectedDate
                  ? 'Switch to another date tab above or run your video counter script with videos recorded on this date.'
                  : 'Start your people counter pipeline or upload snapshots to populate the live CCTV feed.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Full Gallery Grid View (Shows ALL photos on that day at a glance!) */
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 text-xs text-slate-400">
                <span>
                  Showing all <strong className="text-cyan-400">{total}</strong> snapshots
                  {selectedDate && <> for <strong>{formatSelectedDateHeader(selectedDate)}</strong></>}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Click any photo to enlarge</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[640px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                {snapshots.map((snap, i) => {
                  const shift = getShiftBadge(snap.timestamp);
                  return (
                    <div
                      key={snap.id}
                      onClick={() => {
                        setCurrentIndex(i);
                        setLightboxOpen(true);
                      }}
                      className="group relative bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/60 transition shadow-md hover:shadow-cyan-500/10 cursor-pointer"
                    >
                      <div className="aspect-video relative overflow-hidden bg-slate-900">
                        <img
                          src={snap.image_url}
                          alt={`CCTV Snapshot ${i + 1}`}
                          loading="lazy"
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
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${shift.color} truncate max-w-full`}>
                            {shift.label.split(' ')[0]} {shift.label.split(' ')[1]}
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
              <div className="relative flex-1 bg-slate-950/90 min-h-[300px] lg:min-h-[460px] flex items-center justify-center group/img overflow-hidden">
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400/60" />
                  </div>
                )}
                
                <img
                  key={current.image_url}
                  src={current.image_url}
                  alt={`CCTV Snapshot — ${formatFullTs(current.timestamp)}`}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgLoaded(true)}
                  onClick={() => setLightboxOpen(true)}
                  className={`max-h-[460px] w-full object-contain transition-all duration-300 cursor-zoom-in ${
                    imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-98'
                  }`}
                />

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
                  {getShiftBadge(current.timestamp) && (
                    <div className={`hidden sm:flex px-2.5 py-1 rounded-full border text-[11px] font-semibold backdrop-blur-md shadow-lg ${getShiftBadge(current.timestamp)?.color}`}>
                      {getShiftBadge(current.timestamp)?.label}
                    </div>
                  )}
                </div>

                {/* Zoom Hint Overlay */}
                {imgLoaded && (
                  <div className="absolute bottom-3 right-3 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-1.5 flex items-center gap-2 border border-white/10 shadow-lg">
                      <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs text-white font-medium">Click for Fullscreen</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar: Details, Scrubber & Full Day Thumbnail Strip */}
              <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800/80 p-4 sm:p-5 flex flex-col justify-between gap-4 bg-slate-900/40">
                {/* Details Header */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Snapshot Details
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 font-bold">
                      ID #{current.id}
                    </span>
                  </div>
                  
                  <div className="text-sm font-semibold text-slate-100 font-mono">
                    {formatFullTs(current.timestamp)}
                  </div>

                  {getShiftBadge(current.timestamp) && (
                    <div className="mt-2">
                      <span className={`inline-flex text-[10px] font-semibold px-2.5 py-0.5 rounded-md border ${getShiftBadge(current.timestamp)?.color}`}>
                        {getShiftBadge(current.timestamp)?.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Timeline Scrubber Slider */}
                {total > 1 && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
                      <span>Timeline Position</span>
                      <span className="text-cyan-400 font-bold">{currentIndex + 1} of {total}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={total - 1}
                      value={currentIndex}
                      onChange={(e) => setCurrentIndex(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>{formatTimeOnly(snapshots[0].timestamp)}</span>
                      <span>{formatTimeOnly(snapshots[total - 1].timestamp)}</span>
                    </div>
                  </div>
                )}

                {/* All Thumbnails on Selected Day (Scrollable) */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    <span>All Photos on this Day ({total})</span>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition ${
                        isPlaying
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title={isPlaying ? 'Pause auto slideshow' : 'Play time-lapse slideshow'}
                    >
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {isPlaying ? 'Pause' : 'Play Day'}
                    </button>
                  </div>

                  {/* Thumbnail Scroll Container */}
                  <div
                    ref={thumbnailContainerRef}
                    className="grid grid-cols-4 gap-2 max-h-48 lg:max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                  >
                    {snapshots.map((snap, i) => {
                      const isSelected = i === currentIndex;
                      return (
                        <button
                          key={snap.id}
                          data-index={i}
                          onClick={() => setCurrentIndex(i)}
                          className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-cyan-400 shadow-md shadow-cyan-400/30 scale-95 ring-2 ring-cyan-400/40'
                              : 'border-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'
                          }`}
                          title={`${formatTimeOnly(snap.timestamp)} (ID #${snap.id})`}
                        >
                          <img
                            src={snap.image_url}
                            alt={`Thumb ${i + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 text-[9px] font-mono text-slate-200 text-center leading-tight truncate">
                            {formatTimeOnly(snap.timestamp)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation Controls */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Older
                  </button>
                  
                  <div className="text-center font-mono text-xs text-slate-400">
                    <strong className="text-white">{currentIndex + 1}</strong> / {total}
                  </div>

                  <button
                    onClick={goNext}
                    disabled={currentIndex >= total - 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Newer
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Lightbox Fullscreen Modal */}
      {lightboxOpen && current && (
        <div
          className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-6xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {/* Top Lightbox Info Header */}
            <div className="w-full flex items-center justify-between pb-3 text-xs text-slate-300 font-mono">
              <div className="flex items-center gap-3">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" /> CCTV Snapshot #{current.id}
                </span>
                <span className="text-slate-400">•</span>
                <span>{formatFullTs(current.timestamp)}</span>
                <span className="text-slate-500 font-bold">({currentIndex + 1} of {total})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition text-xs font-semibold flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Close (Esc)
                </button>
              </div>
            </div>

            {/* Main Lightbox Image with Left/Right Navigation */}
            <div className="relative w-full flex items-center justify-center">
              <img
                src={current.image_url}
                alt="CCTV Snapshot (Full Size)"
                className="w-auto max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
              />

              {/* Prev / Next Buttons in Lightbox */}
              {total > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="absolute left-2 sm:-left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/80 hover:bg-cyan-600 text-white border border-white/20 transition disabled:opacity-20 disabled:pointer-events-none shadow-2xl"
                    title="Previous photo (Left Arrow)"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={goNext}
                    disabled={currentIndex >= total - 1}
                    className="absolute right-2 sm:-right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/80 hover:bg-cyan-600 text-white border border-white/20 transition disabled:opacity-20 disabled:pointer-events-none shadow-2xl"
                    title="Next photo (Right Arrow)"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom thumbnail strip in Lightbox */}
            {total > 1 && (
              <div className="mt-4 flex items-center gap-2 max-w-xl overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-slate-700">
                {snapshots.map((snap, i) => (
                  <button
                    key={snap.id}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-12 h-8 rounded shrink-0 overflow-hidden border-2 transition ${
                      i === currentIndex ? 'border-cyan-400 scale-105' : 'border-slate-800 opacity-40 hover:opacity-100'
                    }`}
                  >
                    <img src={snap.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
