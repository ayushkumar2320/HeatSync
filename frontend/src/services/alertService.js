/**
 * alertService.js
 * Client service for HeatSync Disaster Management Alert Centre & Early Warnings.
 */

import { fetchJson, API_BASE } from './backendClient';

export async function fetchActiveAlert(lat = null, lng = null, areaName = 'Bhubaneswar Urban Agglomeration', force = false) {
  const params = new URLSearchParams();
  if (lat != null && lng != null) {
    params.set('lat', lat);
    params.set('lng', lng);
  }
  if (areaName) params.set('area_name', areaName);
  if (force) params.set('force', 'true');

  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchJson(`/alerts/active${query}`);
}

export async function fetchAlertSummary(force = false) {
  const query = force ? '?force=true' : '';
  return fetchJson(`/alerts/summary${query}`);
}

export async function fetchCoolingShelters(lat = null, lng = null, limit = 8) {
  const params = new URLSearchParams();
  if (lat != null && lng != null) {
    params.set('lat', lat);
    params.set('lng', lng);
  }
  params.set('limit', limit);

  return fetchJson(`/alerts/shelters?${params.toString()}`);
}

export function getCapXmlUrl(areaName = 'Bhubaneswar Urban Agglomeration') {
  const params = new URLSearchParams({ area_name: areaName });
  return `${API_BASE}/alerts/cap.xml?${params.toString()}`;
}

export async function fetchCapXmlText() {
  const response = await fetch(`${API_BASE}/alerts/cap.xml`);
  if (!response.ok) {
    throw new Error(`Failed to fetch CAP XML: ${response.status}`);
  }
  return response.text();
}
