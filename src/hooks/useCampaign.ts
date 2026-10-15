import { useState, useEffect, useCallback } from 'react';
import { CampaignSettings } from '../types/campaign';

export function useCampaign() {
  const [campaign, setCampaign] = useState<CampaignSettings | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSettings[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const json = await res.json();
        setCampaigns(json.data || []);
      }
    } catch (e) {
      console.warn('[useCampaign] Failed to fetch campaigns list:', e);
    }
  }, []);

  const fetchCampaign = useCallback(async (id?: number) => {
    try {
      setLoading(true);
      setError(null);
      const url = id ? `/api/campaign?id=${id}` : '/api/campaign';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load campaign settings (HTTP ${res.status})`);
      }
      const data = await res.json();
      setCampaign(data.data || null);
      await fetchCampaigns();
    } catch (err: any) {
      console.error('[useCampaign error]:', err);
      setError(err.message || 'Error loading campaign settings');
    } finally {
      setLoading(false);
    }
  }, [fetchCampaigns]);

  const createCampaign = useCallback(async (newCampaign: Omit<CampaignSettings, 'id'>) => {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCampaign),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to create new campaign (HTTP ${res.status})`);
    }

    const json = await res.json();
    if (json.data) {
      setCampaign(json.data);
      await fetchCampaigns();
    }
    return json.data;
  }, [fetchCampaigns]);

  const activateCampaign = useCallback(async (id: number) => {
    const res = await fetch(`/api/campaigns/${id}/activate`, {
      method: 'POST',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to switch active campaign (HTTP ${res.status})`);
    }

    const json = await res.json();
    if (json.data) {
      setCampaign(json.data);
      await fetchCampaigns();
    }
    return json.data;
  }, [fetchCampaigns]);

  const updateCampaign = useCallback(async (updated: CampaignSettings) => {
    const targetUrl = updated.id ? `/api/campaigns/${updated.id}` : '/api/campaign';
    const res = await fetch(targetUrl, {
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
      await fetchCampaigns();
    }
    return data.data;
  }, [fetchCampaigns]);

  const deleteCampaign = useCallback(async (id: number) => {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || `Failed to delete campaign (HTTP ${res.status})`);
    }

    if (json.active_campaign) {
      setCampaign(json.active_campaign);
    }
    await fetchCampaigns();
    return json;
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  return {
    campaign,
    campaigns,
    loading,
    error,
    fetchCampaign,
    fetchCampaigns,
    createCampaign,
    activateCampaign,
    updateCampaign,
    deleteCampaign,
  };
}
