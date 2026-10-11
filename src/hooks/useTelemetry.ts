import { useState, useEffect, useCallback } from 'react';
import { ShiftSummary } from '../types/telemetry';

export function useTelemetry() {
  const [summaries, setSummaries] = useState<ShiftSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const resSummary = await fetch('/api/shifts/summary');
      if (!resSummary.ok) {
        throw new Error('Failed to fetch shift summary from edge server');
      }

      const summaryData = await resSummary.json();
      setSummaries(summaryData.data || []);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('[useTelemetry error]:', err);
      setError(err.message || 'Error connecting to API server');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetAndReseed = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
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
    lastRefreshed,
    autoRefresh,
    setAutoRefresh,
    fetchData,
    resetAndReseed
  };
}
