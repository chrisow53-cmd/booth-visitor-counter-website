import React, { useState, useEffect, useMemo } from 'react';
import { VisitorSession, StaffConfig } from '../types/telemetry';
import { AppError } from '../types/error';
import { formatDwellTime, formatIsoTime } from '../utils/aggregations';
import { X, Search, Clock, Users, User, Baby, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface VisitorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftDate: string | null;
  shiftId: number | null;
  staffConfig: StaffConfig;
  showDemographics?: boolean;
  onError?: (error: AppError) => void;
}

export const VisitorDetailModal: React.FC<VisitorDetailModalProps> = ({
  isOpen,
  onClose,
  shiftDate,
  shiftId,
  showDemographics = true,
  onError
}) => {
  const [visitors, setVisitors] = useState<VisitorSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  useEffect(() => {
    if (!isOpen || !shiftDate || !shiftId) return;

    const fetchVisitors = async () => {
      try {
        setLoading(true);
        setError(null);
        setPage(1);
        setSearchQuery('');

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
    };

    fetchVisitors();
  }, [isOpen, shiftDate, shiftId, onClose, onError]);

  const filteredVisitors = useMemo(() => {
    if (!searchQuery.trim()) return visitors;
    const q = searchQuery.toLowerCase();
    return visitors.filter(
      (v) =>
        v.visitor_id.toLowerCase().includes(q) ||
        v.gender.toLowerCase().includes(q) ||
        v.age_group.toLowerCase().includes(q)
    );
  }, [visitors, searchQuery]);

  const totalPages = Math.ceil(filteredVisitors.length / pageSize) || 1;
  const paginatedVisitors = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVisitors.slice(start, start + pageSize);
  }, [filteredVisitors, page, pageSize]);

  if (!isOpen || !shiftDate || !shiftId) return null;

  const shiftTimeLabel = shiftId === 1 ? 'Shift 1 (09:00 - 15:00)' : 'Shift 2 (15:00 - 21:00)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-[#0b101b] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
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
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/20">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search Visitor ID, M/F, Adult/Kid..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Total Sessions: <span className="text-white font-bold">{filteredVisitors.length}</span>
          </div>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {paginatedVisitors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-slate-200 font-medium">
                        {v.visitor_id}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-300">
                        {formatIsoTime(v.start_time)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-300">
                        {formatIsoTime(v.end_time)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-amber-300 font-semibold">
                        {formatDwellTime(v.dwell_time)}
                      </td>
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
                    </tr>
                  ))}
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
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="ml-4 px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
