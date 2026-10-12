import React, { useState, useEffect } from 'react';
import { CampaignSettings } from '../types/campaign';
import { X, Building2, MapPin, Maximize2, Calendar, Sparkles, Loader2, Save } from 'lucide-react';

interface CampaignEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: CampaignSettings | null;
  onSave: (updated: CampaignSettings) => Promise<void>;
}

export const CampaignEditModal: React.FC<CampaignEditModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onSave,
}) => {
  const [clientName, setClientName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [location, setLocation] = useState('');
  const [spaceSizeSqm, setSpaceSizeSqm] = useState<number | string>(250);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (campaign) {
      setClientName(campaign.client_name || '');
      setCampaignName(campaign.campaign_name || '');
      setLocation(campaign.location || '');
      setSpaceSizeSqm(campaign.space_size_sqm ?? 250);
      setStartDate(campaign.start_date || '');
      setEndDate(campaign.end_date || '');
      setErrorMsg(null);
    }
  }, [campaign, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!clientName.trim()) {
      setErrorMsg('Client Name is required.');
      return;
    }
    if (!campaignName.trim()) {
      setErrorMsg('Campaign Name is required.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Venue Location is required.');
      return;
    }
    const size = Number(spaceSizeSqm);
    if (isNaN(size) || size <= 0) {
      setErrorMsg('Space Size must be a positive number greater than 0.');
      return;
    }
    if (!startDate) {
      setErrorMsg('Start Date is required.');
      return;
    }
    if (!endDate) {
      setErrorMsg('End Date is required.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg('End Date cannot be earlier than Start Date.');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        client_name: clientName.trim(),
        campaign_name: campaignName.trim(),
        location: location.trim(),
        space_size_sqm: size,
        start_date: startDate,
        end_date: endDate,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update campaign settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-[#0b101b] border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Campaign Settings</h3>
              <p className="text-xs text-slate-400">Configure client scope, venue location, and event dates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Client Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                Client Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. CARCHING Global, BMW, Nike"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>

            {/* Campaign Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Campaign / Event Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. 4-Day Automotive Offline Exhibition"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>

            {/* Venue Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Venue Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Mid Valley Exhibition Centre (Hall 1)"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>

            {/* Space Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                Booth / Space Size (m²)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={spaceSizeSqm}
                  onChange={(e) => setSpaceSizeSqm(e.target.value)}
                  placeholder="250"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono pr-14"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono pointer-events-none">
                  sqm
                </span>
              </div>
            </div>

            {/* Start Date & End Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                  required
                />
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
