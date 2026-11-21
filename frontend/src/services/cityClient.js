// cityClient.js
// Client for the city-wide digital-twin endpoints added in the 3D upgrade:
// location intelligence, cooling potential, interventions,
// heat-safe routing.

import { fetchJson } from './backendClient';

// Location intelligence for any lat/lng (nearest real grid cell).
export function fetchCityPoint(lat, lng) {
  return fetchJson(`/city/point?lat=${lat}&lng=${lng}`);
}

// Model-derived intervention potential (per cell) + GeoJSON for the map.
export function fetchCoolingPotential() {
  return fetchJson('/city/cooling-potential');
}

// fetchCoolingPotentialGeoJson is exported from backendClient.js

// Ranked "where should we intervene?" opportunities.
export function fetchInterventions(perScenario = 5) {
  return fetchJson(`/city/interventions?per_scenario=${perScenario}`);
}

// Data-backed "why is this area hot?" factors.
export function fetchExplain(lat, lng) {
  return fetchJson(`/city/explain?lat=${lat}&lng=${lng}`);
}

// Heat-safe route — fastest vs cooler vs balanced routing.
// Supports configurable weights and optional departure_time.
export function fetchHeatSafeRoute(start, end, options = {}) {
  const params = [
    `start_lat=${start.lat}`,
    `start_lng=${start.lng}`,
    `end_lat=${end.lat}`,
    `end_lng=${end.lng}`,
  ];
  if (options.departureTime) params.push(`departure_time=${encodeURIComponent(options.departureTime)}`);
  if (options.weights) {
    const w = options.weights;
    if (w.distance !== undefined) params.push(`weight_distance=${w.distance}`);
    if (w.heat !== undefined) params.push(`weight_heat=${w.heat}`);
    if (w.aqi !== undefined) params.push(`weight_aqi=${w.aqi}`);
    if (w.shade !== undefined) params.push(`weight_shade=${w.shade}`);
    if (w.vegetation !== undefined) params.push(`weight_vegetation=${w.vegetation}`);
  }
  return fetchJson(`/routing/heat-safe?${params.join('&')}`);
}
