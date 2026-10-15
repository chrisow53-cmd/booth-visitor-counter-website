import { useState, useEffect, useCallback } from 'react';
import { ShiftSummary } from '../types/telemetry';
import { AppError } from '../types/error';

export function useTelemetry(campaignId?: number) {
  const [summaries, setSummaries] = useState<ShiftSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AppError | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const url = campaignId ? `/api/shifts/summary?campaign_id=${campaignId}` : '/api/shifts/summary';
      const resSummary = await fetch(url);
      if (!resSummary.ok) {
        throw new Error(`Server returned HTTP ${resSummary.status}: ${resSummary.statusText || 'Failed to fetch shift summary'}`);
      }

      const summaryData = await resSummary.json();
      setSummaries(summaryData.data || []);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err: any) {
      console.error('[useTelemetry error]:', err);
      const isNetwork = err.message?.includes('Failed to fetch') || err.name === 'TypeError';
      const appErr: AppError = {
        category: isNetwork ? 'network' : 'server',
        title: isNetwork ? 'Unable to Connect to Visitor Telemetry Server' : 'Telemetry API Service Error',
        message: isNetwork
          ? 'The browser was unable to establish a connection to the visitor tracking backend service at http://localhost:3001. The server may be offline or restarting.'
          : (err.message || 'An unexpected error occurred while communicating with the database.'),
        endpoint: '/api/shifts/summary',
        details: err.stack || err.message || 'Unknown network error',
        timestamp: new Date().toISOString(),
      };
      setError(appErr);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const resetAndReseed = async () => {
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error('Failed to reseed database', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchData();
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

  return {
    summaries,
    loading,
    error,
    setError,
    lastRefreshed,
    autoRefresh,
    setAutoRefresh,
    fetchData,
    resetAndReseed,
  };
}
