import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VisitorSession, StaffConfig } from '../types/telemetry';
import { AppError } from '../types/error';
import { formatDwellTime, formatIsoTime } from '../utils/aggregations';
import {
  X,
  Search,
  Clock,
  Users,
  User,
  Baby,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Camera,
  ZoomIn,
  AlertCircle,
  CheckSquare,
  Square,
  Briefcase,
  UserCheck,
  Check,
} from 'lucide-react';

interface VisitorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftDate: string | null;
  shiftId: number | null;
  staffConfig: StaffConfig;
  showDemographics?: boolean;
  onError?: (error: AppError) => void;
  onStatusChange?: () => void;
}

/** Inline evidence lightbox rendered inside the main modal */
const EvidenceLightbox: React.FC<{ url: string; visitorId: string; onClose: () => void }> = ({
  url,
  visitorId,
  onClose,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-[#0b101b] border border-slate-700 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lightbox Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Evidence Image</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{visitorId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image */}
        <div className="relative bg-slate-950 flex items-center justify-center min-h-[280px]">
          {!loaded && !imgError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
            </div>
          )}
          {imgError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="text-xs text-rose-400">Failed to load evidence image</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 underline"
              >
                Open raw URL
              </a>
            </div>
          ) : (
            <img
              src={url}
              alt={`Evidence crop for ${visitorId}`}
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setImgError(true); }}
              className={`max-h-[60vh] w-full object-contain transition-opacity duration-300 ${
                loaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </div>

        {/* Footer with link */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 transition font-mono truncate max-w-[75%]"
          >
            <ZoomIn className="w-3 h-3 shrink-0" />
            <span className="truncate">{url}</span>
          </a>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0 ml-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const VisitorDetailModal: React.FC<VisitorDetailModalProps> = ({
  isOpen,
  onClose,
  shiftDate,
  shiftId,
  showDemographics = true,
  onError,
  onStatusChange,
}) => {
  const [visitors, setVisitors] = useState<VisitorSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [evidenceSession, setEvidenceSession] = useState<VisitorSession | null>(null);

  // Checkbox selection & batch operations
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);
  const pageSize = 15;

  const fetchVisitors = useCallback(async () => {
    if (!shiftDate || !shiftId) return;
    try {
      setLoading(true);
      setError(null);
      setPage(1);
      setSelectedIds([]);
      setEvidenceSession(null);

      const res = await fetch(`/api/shifts/${shiftDate}/${shiftId}/visitors`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: Failed to load visitor sessions for this shift`);
      }

      const data = await res.json();
      setVisitors(data.data || []);
    } catch (err: any) {
      console.error('[VisitorDetailModal error]:', err);
      const isNetwork = err.message?.includes('Failed to fetch') || err.name === 'TypeError';
      const appErr: AppError = {
        category: isNetwork ? 'network' : 'server',
        title: `Unable to Retrieve Shift ${shiftId} Visitors (${shiftDate})`,
        message: isNetwork
          ? `Connection to the visitor tracking service was lost while loading detailed session records for Shift ${shiftId}.`
          : (err.message || 'Error occurred while loading detailed visitor logs.'),
        endpoint: `/api/shifts/${shiftDate}/${shiftId}/visitors`,
        details: err.stack || err.message,
        timestamp: new Date().toISOString(),
        retryAction: () => fetchVisitors(),
        recoverAction: onClose,
        recoverLabel: 'Return to Shift Grid',
      };

      if (onError) {
        onClose();
        onError(appErr);
      } else {
        setError(err.message || 'Error fetching visitor session data');
      }
    } finally {
      setLoading(false);
    }
  }, [shiftDate, shiftId, onClose, onError]);

  useEffect(() => {
    if (!isOpen || !shiftDate || !shiftId) return;
    fetchVisitors();
  }, [isOpen, shiftDate, shiftId, fetchVisitors]);

  const filteredVisitors = useMemo(() => {
    if (!searchQuery.trim()) return visitors;
    const q = searchQuery.toLowerCase();
    return visitors.filter(
      (v) =>
        v.visitor_id.toLowerCase().includes(q) ||
        v.gender.toLowerCase().includes(q) ||
        v.age_group.toLowerCase().includes(q) ||
        (v.is_staff === 1 ? 'staff' : 'visitor').includes(q)
    );
  }, [visitors, searchQuery]);

  const totalPages = Math.ceil(filteredVisitors.length / pageSize) || 1;
  const paginatedVisitors = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVisitors.slice(start, start + pageSize);
  }, [filteredVisitors, page, pageSize]);

  // Counts of visitors vs staff
  const staffCount = useMemo(() => visitors.filter((v) => v.is_staff === 1).length, [visitors]);
  const visitorCount = visitors.length - staffCount;

  // Checkbox handlers
  const allOnPageSelected = useMemo(() => {
    if (paginatedVisitors.length === 0) return false;
    return paginatedVisitors.every((v) => selectedIds.includes(v.id));
  }, [paginatedVisitors, selectedIds]);

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      const pageIdSet = new Set(paginatedVisitors.map((v) => v.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      const pageIds = paginatedVisitors.map((v) => v.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Batch update staff status
  const handleBatchMark = async (isStaff: boolean) => {
    if (selectedIds.length === 0) return;
    try {
      setBatchLoading(true);
      const res = await fetch('/api/sessions/staff-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_ids: selectedIds,
          is_staff: isStaff ? 1 : 0,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update status (HTTP ${res.status})`);
      }

      const staffVal = isStaff ? 1 : 0;
      setVisitors((prev) =>
        prev.map((v) => (selectedIds.includes(v.id) ? { ...v, is_staff: staffVal } : v))
      );
      setSelectedIds([]);

      // Inform parent dashboard so overall headcount & totals recalculate immediately!
      onStatusChange?.();
    } catch (err: any) {
      console.error('[Batch Mark Error]:', err);
    } finally {
      setBatchLoading(false);
    }
  };

  // Single toggle
  const handleToggleSingle = async (session: VisitorSession) => {
    const nextIsStaff = session.is_staff === 1 ? 0 : 1;
    try {
      const res = await fetch('/api/sessions/staff-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_ids: [session.id],
          is_staff: nextIsStaff,
        }),
      });

      if (res.ok) {
        setVisitors((prev) =>
          prev.map((v) => (v.id === session.id ? { ...v, is_staff: nextIsStaff } : v))
        );
        onStatusChange?.();
      }
    } catch (err) {
      console.error('[Toggle single session error]:', err);
    }
  };

  if (!isOpen || !shiftDate || !shiftId) return null;

  const shiftTimeLabel = shiftId === 1 ? 'Shift 1 (09:00 - 15:00)' : 'Shift 2 (15:00 - 21:00)';
  const evidenceCount = visitors.filter((v) => !!v.evidence_image_url).length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <div
          className="bg-[#0b101b] border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Visitor Sessions Log
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {shiftDate} • <span className="text-indigo-300 font-semibold">{shiftTimeLabel}</span>
                {evidenceCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-cyan-400">
                    <Camera className="w-3 h-3" />
                    {evidenceCount} with evidence
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Bar & Batch Action Bar */}
          <div className="p-4 border-b border-slate-800/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/20">
            {/* Search */}
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ID, Gender, Age, Staff..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Batch Action Buttons (shown when items are selected) */}
            {selectedIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 bg-indigo-950/40 border border-indigo-500/30 px-3 py-1.5 rounded-xl">
                <span className="text-xs font-bold text-indigo-300 font-mono">
                  {selectedIds.length} selected:
                </span>

                <button
                  type="button"
                  onClick={() => handleBatchMark(true)}
                  disabled={batchLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition disabled:opacity-50"
                  title="Mark selected as Staff (excluded from headcount totals)"
                >
                  <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                  <span>Mark as Staff</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBatchMark(false)}
                  disabled={batchLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 transition disabled:opacity-50"
                  title="Mark selected as Visitor (counted in headcount totals)"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mark as Visitor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-2 py-1 text-[11px] text-slate-400 hover:text-white transition"
                >
                  Clear
                </button>
              </div>
            ) : (
              /* Breakdown Stats */
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-400">
                  Total: <strong className="text-white">{filteredVisitors.length}</strong>
                </span>
                <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                  Visitors: <strong>{visitorCount}</strong>
                </span>
                <span className="text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20">
                  Staff: <strong>{staffCount}</strong> (Excluded)
                </span>
              </div>
            )}
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
                <p className="text-xs">Loading shift visitor sessions...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center text-red-400 text-xs">
                {error}
              </div>
            ) : paginatedVisitors.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No visitor sessions found matching "{searchQuery}".
              </div>
            ) : (
              <div className="glass-panel rounded-xl border border-slate-800 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900/90 text-slate-300 text-xs uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      {/* Checkbox All */}
                      <th className="w-10 px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAllOnPage}
                          className="text-slate-400 hover:text-white transition"
                          title={allOnPageSelected ? 'Deselect all on this page' : 'Select all on this page'}
                        >
                          {allOnPageSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                          )}
                        </button>
                      </th>
                      <th className="px-3 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Visitor ID</th>
                      <th className="px-4 py-3 font-semibold">Entry Time</th>
                      <th className="px-4 py-3 font-semibold">Exit Time</th>
                      <th className="px-4 py-3 font-semibold">Dwell Time</th>
                      {showDemographics && (
                        <>
                          <th className="px-4 py-3 font-semibold">Gender</th>
                          <th className="px-4 py-3 font-semibold">Age Group</th>
                        </>
                      )}
                      <th className="px-4 py-3 font-semibold text-center">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {paginatedVisitors.map((v) => {
                      const hasEvidence = !!v.evidence_image_url;
                      const isSelected = selectedIds.includes(v.id);
                      const isStaff = v.is_staff === 1;

                      return (
                        <tr
                          key={v.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-indigo-950/40'
                              : isStaff
                              ? 'bg-purple-950/10 hover:bg-purple-950/20'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="w-10 px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectRow(v.id)}
                              className="text-slate-400 hover:text-white transition"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                              )}
                            </button>
                          </td>

                          {/* Classification: Staff vs Visitor Badge */}
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleSingle(v)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                isStaff
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                              }`}
                              title={`Click to switch to ${isStaff ? 'Visitor (counted in total)' : 'Staff (excluded from total)'}`}
                            >
                              {isStaff ? (
                                <>
                                  <Briefcase className="w-3 h-3 text-purple-400" />
                                  <span>Staff</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3 h-3 text-emerald-400" />
                                  <span>Visitor</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Visitor ID */}
                          <td className="px-4 py-2.5 font-mono text-slate-200 font-medium">
                            <span className={isStaff ? 'line-through text-slate-500' : ''}>
                              {v.visitor_id}
                            </span>
                          </td>

                          {/* Start Time */}
                          <td className="px-4 py-2.5 font-mono text-slate-300">
                            {formatIsoTime(v.start_time)}
                          </td>

                          {/* End Time */}
                          <td className="px-4 py-2.5 font-mono text-slate-300">
                            {formatIsoTime(v.end_time)}
                          </td>

                          {/* Dwell Time */}
                          <td className="px-4 py-2.5 font-mono text-amber-300 font-semibold">
                            {formatDwellTime(v.dwell_time)}
                          </td>

                          {/* Demographics */}
                          {showDemographics && (
                            <>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                                    v.gender === 'M'
                                      ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                      : 'bg-pink-500/10 text-pink-300 border-pink-500/30'
                                  }`}
                                >
                                  <User className="w-3 h-3" />
                                  {v.gender === 'M' ? 'Male' : 'Female'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                                    v.age_group === 'Adult'
                                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  {v.age_group === 'Kid' && <Baby className="w-3 h-3" />}
                                  {v.age_group}
                                </span>
                              </td>
                            </>
                          )}

                          {/* Evidence */}
                          <td className="px-4 py-2.5 text-center">
                            {hasEvidence ? (
                              <button
                                onClick={() => setEvidenceSession(v)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition"
                                title="View evidence image"
                              >
                                <Camera className="w-3 h-3" />
                                View
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer / Pagination */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Page <span className="font-semibold text-white">{page}</span> of{' '}
              <span className="font-semibold text-white">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="ml-3 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Lightbox */}
      {evidenceSession && evidenceSession.evidence_image_url && (
        <EvidenceLightbox
          url={evidenceSession.evidence_image_url}
          visitorId={evidenceSession.visitor_id}
          onClose={() => setEvidenceSession(null)}
        />
      )}
    </>
  );
};
