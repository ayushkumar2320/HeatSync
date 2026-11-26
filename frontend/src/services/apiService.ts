/**
 * apiService.ts
 * Universal HeatX Client with Automatic Backend Detection & Offline Fallback
 * Connects frontend to FastAPI backend on http://127.0.0.1:8000/api/v1
 */

import { getBlockForecastSeries as getLocalBlockForecastSeries } from '../adapters/dataAdapter';
import type { BlockForecastItem } from '../types/heatx';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

let isBackendAvailable: boolean | null = null;

export async function checkBackendHealth(): Promise<{ online: boolean; [key: string]: any }> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      isBackendAvailable = true;
      return { online: true, ...data };
    }
  } catch {
    isBackendAvailable = false;
  }
  return { online: false, message: 'Running in Standalone Localhost Mode' };
}

export async function fetchBlockForecast(blockId: string): Promise<BlockForecastItem[]> {
  try {
    if (isBackendAvailable !== false) {
      const res = await fetch(`${API_BASE_URL}/forecast/7day/${blockId}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const json = await res.json();
        if (json.series && Array.isArray(json.series)) {
          return json.series;
        }
      }
    }
  } catch {
    // Fall back gracefully
  }

  // Fallback to local data adapter
  return getLocalBlockForecastSeries(blockId);
}

export async function fetchDynamicTimeline(date?: string): Promise<any> {
  try {
    if (isBackendAvailable !== false) {
      const url = date ? `${API_BASE_URL}/forecast/timeline?date=${date}` : `${API_BASE_URL}/forecast/timeline`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        return await res.json();
      }
    }
  } catch {
    // Fall back gracefully
  }
  return null;
}

export async function fetchMonitoringMetrics(): Promise<any> {
  try {
    if (isBackendAvailable !== false) {
      const res = await fetch(`${API_BASE_URL}/forecast/monitoring/metrics`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        return await res.json();
      }
    }
  } catch {
    // Fall back
  }
  return null;
}

export async function fetchActiveAlerts(date?: string): Promise<any> {
  try {
    if (isBackendAvailable !== false) {
      const url = date ? `${API_BASE_URL}/alerts?date=${date}` : `${API_BASE_URL}/alerts`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        return await res.json();
      }
    }
  } catch {
    // Fall back
  }
  return null;
}

export async function fetchCapXml(date?: string): Promise<string | null> {
  try {
    if (isBackendAvailable !== false) {
      const url = date ? `${API_BASE_URL}/alerts/cap-xml?date=${date}` : `${API_BASE_URL}/alerts/cap-xml`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        return await res.text();
      }
    }
  } catch {
    // Fall back
  }
  return null;
}

export async function postObservation(record: any): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/observations/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('API observation ingestion error:', err);
  }
  return { status: 'OFFLINE_UNSAVED', error: 'Database service unreachable. Observation not persisted.' };
}

export async function fetchLatestObservations(): Promise<any> {
  try {
    if (isBackendAvailable !== false) {
      const res = await fetch(`${API_BASE_URL}/observations/latest`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        return await res.json();
      }
    }
  } catch {
    // Fall back
  }
  return { count: 0, observations: [] };
}
