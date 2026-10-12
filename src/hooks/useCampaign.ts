import { useState, useEffect, useCallback } from 'react';
import { CampaignSettings } from '../types/campaign';

export function useCampaign() {
  const [campaign, setCampaign] = useState<CampaignSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/campaign');
      if (!res.ok) {
        throw new Error(`Failed to load campaign settings (HTTP ${res.status})`);
      }
      const data = await res.json();
      setCampaign(data.data || null);
    } catch (err: any) {
      console.error('[useCampaign error]:', err);
      setError(err.message || 'Error loading campaign settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCampaign = useCallback(async (updated: CampaignSettings) => {
    const res = await fetch('/api/campaign', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updated),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to update campaign settings (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (data.data) {
      setCampaign(data.data);
    }
    return data.data;
  }, []);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  return {
    campaign,
    loading,
    error,
    fetchCampaign,
    updateCampaign,
  };
}
