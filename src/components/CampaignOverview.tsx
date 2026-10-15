import React, { useState } from 'react';
import { CampaignSettings } from '../types/campaign';
import { Building2, MapPin, Maximize2, Calendar, Edit3, Tag, Sparkles, PlusCircle, ChevronDown, Trash2, ShieldAlert, AlertTriangle, X } from 'lucide-react';

interface CampaignOverviewProps {
  campaign: CampaignSettings | null;
  campaigns?: CampaignSettings[];
  loading?: boolean;
  onOpenEdit: () => void;
  onOpenCreate: () => void;
  onSelectCampaign?: (id: number) => void;
  onDeleteCampaign?: (id: number) => Promise<any>;
}

export const CampaignOverview: React.FC<CampaignOverviewProps> = ({
  campaign,
  campaigns = [],
  loading,
  onOpenEdit,
  onOpenCreate,
  onSelectCampaign,
  onDeleteCampaign,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (loading && !campaign) {
    return (
      <section className="mb-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-32 bg-slate-800 rounded mb-3" />
        <div className="h-6 w-64 bg-slate-800 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-10 bg-slate-800/60 rounded-xl" />
          <div className="h-10 bg-slate-800/60 rounded-xl" />
          <div className="h-10 bg-slate-800/60 rounded-xl" />
          <div className="h-10 bg-slate-800/60 rounded-xl" />
        </div>
      </section>
    );
  }

  const clientName = campaign?.client_name || 'Traveloka';
  const campaignName = campaign?.campaign_name || 'UOB Rewards You Carnival 2026';
  const location = campaign?.location || 'Mid Valley Exhibition Centre (Hall 1)';
  const spaceSqm = campaign?.space_size_sqm ?? 250;
  const startDate = campaign?.start_date || '2026-10-15';
  const endDate = campaign?.end_date || '2026-10-18';

  // Find if this campaign has recorded visitor sessions
  const matchedCampaign = campaigns.find((c) => c.id === campaign?.id);
  const sessionCount = matchedCampaign?.session_count ?? campaign?.session_count ?? 0;
  const hasData = sessionCount > 0;

  const calculateDays = (s: string, e: string) => {
    try {
      const start = new Date(s).getTime();
      const end = new Date(e).getTime();
      if (!isNaN(start) && !isNaN(end)) {
        const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return days > 0 ? `${days} Days` : '';
      }
    } catch {}
    return '';
  };

  const durationStr = calculateDays(startDate, endDate);

  const handleDeleteConfirm = async () => {
    if (!campaign?.id || !onDeleteCampaign) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await onDeleteCampaign(campaign.id);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <section className="mb-6 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Active Event
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50">
                <Tag className="w-3 h-3 text-slate-400" />
                {clientName}
              </span>

              {/* Event Switcher Dropdown (if multiple events exist) */}
              {campaigns.length > 1 && onSelectCampaign && (
                <div className="relative inline-block">
                  <select
                    value={campaign?.id || ''}
                    onChange={(e) => onSelectCampaign(Number(e.target.value))}
                    aria-label="Switch active event"
                    className="appearance-none bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold pl-3 pr-7 py-1 rounded-lg border border-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.campaign_name} ({c.client_name}) {c.is_active ? '★' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                </div>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {campaignName}
            </h2>
          </div>

          {/* Action Buttons: New Event, Edit Event & Delete Event */}
          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <button
              type="button"
              onClick={onOpenCreate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition group"
              title="Create a new event with a blank shift board"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-200 group-hover:scale-110 transition-transform" />
              <span>New Event</span>
            </button>

            <button
              type="button"
              onClick={onOpenEdit}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:border-indigo-500/60 transition shadow-sm hover:shadow-indigo-500/10 group"
              title="Edit event details"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>Edit Event</span>
            </button>

            {/* Delete Event Button (enabled when more than 1 event exists) */}
            {campaigns.length > 1 && onDeleteCampaign && (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setIsDeleteModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 transition shadow-sm group"
                title={hasData ? 'Cannot delete: Event contains visitor records' : 'Delete this empty event'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Grid of Campaign Context Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-slate-800/80">
          
          {/* 1. Client Organization */}
          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Client</div>
              <div className="text-xs font-semibold text-slate-200 truncate">{clientName}</div>
            </div>
          </div>

          {/* 2. Venue Location */}
          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Venue Location</div>
              <div className="text-xs font-semibold text-slate-200 truncate" title={location}>
                {location}
              </div>
            </div>
          </div>

          {/* 3. Space Size */}
          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Booth / Space Size</div>
              <div className="text-xs font-semibold text-slate-200 font-mono">
                {spaceSqm.toLocaleString()} m² <span className="text-[10px] text-slate-400 font-normal">({Math.round(spaceSqm * 10.7639).toLocaleString()} sq ft)</span>
              </div>
            </div>
          </div>

          {/* 4. Event Dates & Duration */}
          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                <span>Event Schedule</span>
                {durationStr && (
                  <span className="text-[9px] text-purple-400 font-semibold font-mono">({durationStr})</span>
                )}
              </div>
              <div className="text-xs font-semibold text-slate-200 font-mono truncate">
                {startDate} <span className="text-slate-500 font-normal">to</span> {endDate}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Accidental Deletion Protection Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                {hasData ? (
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {hasData ? 'Event Data Protected' : 'Delete Empty Event?'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {hasData ? 'Cannot delete event with connected data' : 'Safely remove event from list'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {deleteError && (
                <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-900/50 rounded-xl">
                  {deleteError}
                </div>
              )}

              {hasData ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 leading-relaxed">
                    <p className="font-semibold mb-1">
                      🛡️ Protected against accidental deletion
                    </p>
                    <p>
                      <strong>{campaignName}</strong> already has{' '}
                      <span className="font-mono font-bold text-amber-400">
                        {sessionCount.toLocaleString()} visitor records
                      </span>{' '}
                      connected to it.
                    </p>
                    <p className="mt-2 text-slate-300">
                      To safeguard your metrics and reports, events with existing telemetry cannot be deleted. If you no longer need it active, simply select or create a new event.
                    </p>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
                    >
                      Understood
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Are you sure you want to delete <strong className="text-white">"{campaignName}"</strong>?
                  </p>
                  <p className="text-xs text-slate-400">
                    This event has <strong className="text-emerald-400">0 visitor records</strong> recorded. It will be removed from your event dropdown list.
                  </p>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={deleting}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteConfirm}
                      disabled={deleting}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete Event'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
