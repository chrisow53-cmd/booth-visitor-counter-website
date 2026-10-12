import React from 'react';
import { CampaignSettings } from '../types/campaign';
import { Building2, MapPin, Maximize2, Calendar, Edit3, Tag, Sparkles } from 'lucide-react';

interface CampaignOverviewProps {
  campaign: CampaignSettings | null;
  loading?: boolean;
  onOpenEdit: () => void;
}

export const CampaignOverview: React.FC<CampaignOverviewProps> = ({
  campaign,
  loading,
  onOpenEdit,
}) => {
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

  // Fallbacks if campaign is null
  const clientName = campaign?.client_name || 'CARCHING Global';
  const campaignName = campaign?.campaign_name || '4-Day Automotive Offline Exhibition';
  const location = campaign?.location || 'Mid Valley Exhibition Centre (Hall 1)';
  const spaceSqm = campaign?.space_size_sqm ?? 250;
  const startDate = campaign?.start_date || '2026-10-03';
  const endDate = campaign?.end_date || '2026-10-06';

  // Compute duration in days if dates are valid
  const calculateDays = (s: string, e: string) => {
    try {
      const start = new Date(s).getTime();
      const end = new Date(e).getTime();
      if (!isNaN(start) && !isNaN(end)) {
        const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return days > 0 ? `${days} Days` : '';
      }
    } catch {
      // fallback
    }
    return '';
  };

  const durationStr = calculateDays(startDate, endDate);

  return (
    <section className="mb-6 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        
        {/* Campaign Name & Client Tag */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Active Campaign
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50">
              <Tag className="w-3 h-3 text-slate-400" />
              {clientName}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {campaignName}
          </h2>
        </div>

        {/* Edit Button */}
        <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
          <button
            type="button"
            onClick={onOpenEdit}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:border-indigo-500/60 transition shadow-sm hover:shadow-indigo-500/10 group"
            title="Edit campaign settings"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Edit Campaign</span>
          </button>
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
  );
};
