import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

interface DashboardSnapshotsProps {
  /** Filter snapshots for a specific campaign */
  campaignId?: number;
  /** How many snapshots to load at once. Default: 10 */
  limit?: number;
  /** Auto-refresh interval in ms. 0 = disabled. Default: 30000 (30s) */
  autoRefreshMs?: number;
}

export const DashboardSnapshots: React.FC<DashboardSnapshotsProps> = ({
  campaignId,
  limit = 10,
  autoRefreshMs = 30000,
}) => {
  const [snapshots, setSnapshots] = useState<CctvSnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  const fetchSnapshots = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = campaignId
        ? `/api/snapshots?limit=${limit}&campaign_id=${campaignId}`
        : `/api/snapshots?limit=${limit}`;
      const res = await fetch(url);
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
  }, [limit, campaignId]);

  // Initial fetch
  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshMs) return;
    const id = setInterval(fetchSnapshots, autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefreshMs, fetchSnapshots]);

  // Reset image loaded state when index changes
  useEffect(() => {
    setImgLoaded(false);
  }, [currentIndex]);

  const current = snapshots[currentIndex] ?? null;
  const total = snapshots.length;

  const goNext = () => setCurrentIndex((i) => Math.min(total - 1, i + 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));

  const formatTs = (iso: string) => {
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

  return (
    <>
      <section className="mb-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Live CCTV Snapshots
            </h2>
            {total > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                {total} recent
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {lastFetched && (
              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTs(lastFetched.toISOString())}
              </span>
            )}
            <button
              onClick={fetchSnapshots}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-50"
              title="Refresh snapshots"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Main Viewer Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          {loading && snapshots.length === 0 ? (
            /* Initial loading skeleton */
            <div className="flex flex-col items-center justify-center h-72 gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="text-xs">Loading CCTV snapshots...</span>
            </div>
          ) : error ? (
            /* Error state */
            <div className="flex flex-col items-center justify-center h-72 gap-3 text-slate-500 p-6">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="text-xs text-rose-400 text-center">{error}</p>
              <button
                onClick={fetchSnapshots}
                className="mt-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition"
              >
                Retry
              </button>
            </div>
          ) : snapshots.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-72 gap-3 text-slate-500">
              <ImageIcon className="w-10 h-10 opacity-30" />
              <p className="text-xs">No CCTV snapshots recorded yet.</p>
              <p className="text-[11px] text-slate-600">
                POST to <code className="font-mono text-cyan-600">/api/snapshots</code> to log your first image.
              </p>
            </div>
          ) : current ? (
            /* Image Viewer */
            <div className="flex flex-col lg:flex-row">
              {/* Image Panel */}
              <div className="relative flex-1 bg-slate-950/80 min-h-[260px] lg:min-h-[340px] flex items-center justify-center group/img">
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400/60" />
                  </div>
                )}
                <img
                  key={current.image_url}
                  src={current.image_url}
                  alt={`CCTV Snapshot — ${formatTs(current.timestamp)}`}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgLoaded(true)}
                  onClick={() => setLightboxOpen(true)}
                  className={`max-h-[340px] w-full object-contain transition-all duration-500 cursor-zoom-in ${
                    imgLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                {/* Zoom hint overlay */}
                {imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2">
                      <ZoomIn className="w-4 h-4 text-white" />
                      <span className="text-xs text-white font-medium">Click to enlarge</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar: metadata + navigation */}
              <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-slate-800/60 p-4 flex flex-col justify-between gap-4 bg-slate-900/30">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                    Snapshot Details
                  </div>
                  <div className="text-xs text-slate-300 font-mono leading-relaxed break-all">
                    {formatTs(current.timestamp)}
                  </div>
                  <div className="mt-3 text-[11px] text-slate-500 break-all">
                    ID #{current.id}
                  </div>
                </div>

                {/* Thumbnail strip */}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Recent ({total})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {snapshots.slice(0, 8).map((snap, i) => (
                      <button
                        key={snap.id}
                        onClick={() => setCurrentIndex(i)}
                        className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                          i === currentIndex
                            ? 'border-cyan-400 shadow-md shadow-cyan-400/30'
                            : 'border-slate-700 hover:border-slate-500 opacity-60 hover:opacity-100'
                        }`}
                        title={formatTs(snap.timestamp)}
                      >
                        <img
                          src={snap.image_url}
                          alt={`Snapshot ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Older
                  </button>
                  <span className="text-[11px] font-mono text-slate-500">
                    {currentIndex + 1} / {total}
                  </span>
                  <button
                    onClick={goNext}
                    disabled={currentIndex >= total - 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Newer
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxOpen && current && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-10 right-0 flex items-center gap-3 text-xs text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5" />
              {formatTs(current.timestamp)}
            </div>
            <img
              src={current.image_url}
              alt="CCTV Snapshot (Full Size)"
              className="w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 -right-0 text-slate-400 hover:text-white transition text-xs font-semibold px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
