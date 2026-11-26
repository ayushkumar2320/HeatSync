/**
 * dataAdapter.ts
 * Unified Frontend Data Adapter serving all 314 Odisha CD Blocks across 15 Days
 * Strictly decouples UI components from static data structures.
 */

import rawHeatxData from '../data/heatx15DayData.json';
import type { TimelineStep, CDBlockMeta, CDBlockRecord, StateSummary, BlockForecastItem } from '../types/heatx';

interface RawHeatxDataPayload {
  timeline_steps: TimelineStep[];
  blocks_meta: Record<string, CDBlockMeta>;
  days_data: Record<string, Record<string, CDBlockRecord>>;
  meta: any;
}

const heatxData = rawHeatxData as unknown as RawHeatxDataPayload;
const { timeline_steps, blocks_meta, days_data, meta } = heatxData;

/**
 * Get the 15-day timeline array (-7 to +7)
 */
export function getTimelineSteps(): TimelineStep[] {
  return timeline_steps;
}

/**
 * Get project metadata
 */
export function getHeatXMeta(): any {
  return meta;
}

/**
 * Get full metadata dictionary for all 314 blocks
 */
export function getAllBlocksMeta(): Record<string, CDBlockMeta> {
  return blocks_meta;
}

/**
 * Get array of 30 distinct district names
 */
export function getDistrictsList(): string[] {
  const set = new Set<string>();
  Object.values(blocks_meta).forEach(b => {
    if (b.district_name) set.add(b.district_name);
  });
  return Array.from(set).sort();
}

/**
 * Enrich raw block record with canonical metadata and population fallbacks
 */
function enrichBlock(b: CDBlockRecord | undefined, blockId: string): CDBlockRecord | null {
  if (!b) return null;
  const meta = blocks_meta[blockId] || ({} as CDBlockMeta);
  const pop = b.population !== undefined ? b.population : (meta.population ?? 0);
  const popDensity = b.population_density !== undefined ? b.population_density : (meta.population_density ?? 0);
  const isCritical = b.thermal_stress_level === 'HIGH' || b.thermal_stress_level === 'DANGER' || b.thermal_stress_level === 'LETHAL';
  const popExposed = b.population_exposed !== undefined ? b.population_exposed : (isCritical ? pop : 0);

  return {
    ...b,
    population: pop,
    population_density: popDensity,
    population_exposed: popExposed,
    district_id: b.district_id || meta.district_id,
    district_name: b.district_name || meta.district_name,
    block_name: b.block_name || meta.block_name || blockId,
  };
}

/**
 * Get block record for a specific date and block_id
 */
export function getBlockData(date: string, blockId: string): CDBlockRecord | null {
  const blocks = getBlocksForDate(date);
  return blocks[blockId] || null;
}

/**
 * Get dictionary of all 314 blocks for a specific date
 */
export function getBlocksForDate(date: string): Record<string, CDBlockRecord> {
  let rawDict = days_data[date];
  if (!rawDict) {
    const availableDates = Object.keys(days_data);
    const fallback = availableDates[availableDates.length - 1];
    rawDict = (fallback && days_data[fallback]) || {};
  }

  const enriched: Record<string, CDBlockRecord> = {};
  for (const [id, rec] of Object.entries(rawDict)) {
    const enrichedRec = enrichBlock(rec, id);
    if (enrichedRec) {
      enriched[id] = enrichedRec;
    }
  }
  return enriched;
}

/**
 * Compute state aggregate summary for a specific date
 */
export function getStateSummary(date: string): StateSummary {
  const blocks = getBlocksForDate(date);
  let criticalCount = 0;
  let totalExposedPop = 0;
  let maxThermalVal = 0;
  let maxWbgt = 0;
  let maxBlock: CDBlockRecord | null = null;

  Object.values(blocks).forEach(b => {
    if (b.thermal_stress_level === 'HIGH' || b.thermal_stress_level === 'DANGER' || b.thermal_stress_level === 'LETHAL') {
      criticalCount++;
      totalExposedPop += (b.population_exposed || b.population || 0);
    }
    const val = b.thermal_value ?? b.heat_index ?? b.wbgt ?? 0;
    if (val > maxThermalVal) {
      maxThermalVal = val;
      maxBlock = b;
    }
    if (b.wbgt && b.wbgt > maxWbgt) {
      maxWbgt = b.wbgt;
    }
  });

  return {
    date,
    totalBlocks: Object.keys(blocks).length,
    criticalCount,
    totalExposedPop,
    maxThermalVal,
    maxWbgt,
    maxBlock,
  };
}

/**
 * Get dynamic 15-day multi-horizon time series for a specific block
 * Includes all 4 meteorological state variables and 3 biophysical indices.
 */
export function getBlockForecastSeries(blockId: string): BlockForecastItem[] {
  if (!blockId) return [];
  const bMeta = blocks_meta[blockId] || ({} as CDBlockMeta);

  return timeline_steps.map(step => {
    const dayRecords = days_data[step.date];
    const bData = (dayRecords && dayRecords[blockId]) ? dayRecords[blockId] : ({} as CDBlockRecord);
    const tmax = bData.temperature_max !== undefined ? bData.temperature_max : null;
    const rh = bData.relative_humidity !== undefined ? bData.relative_humidity : null;
    const wind = bData.wind_speed !== undefined ? bData.wind_speed : null;
    const solar = bData.solar_radiation !== undefined ? bData.solar_radiation : null;
    const hi = bData.heat_index !== undefined ? bData.heat_index : null;
    const wbgt = bData.wbgt !== undefined ? bData.wbgt : null;
    const utci = bData.utci_approx !== undefined ? bData.utci_approx : null;
    const thermalVal = bData.thermal_value !== undefined ? bData.thermal_value : hi;
    const tier = bData.thermal_stress_level || (thermalVal !== null ? (thermalVal >= 45 ? 'LETHAL' : thermalVal >= 40 ? 'DANGER' : thermalVal >= 35 ? 'HIGH' : thermalVal >= 30 ? 'CAUTION' : 'NORMAL') : 'DATA_UNAVAILABLE');

    return {
      block_id: blockId,
      block_name: bMeta.block_name || bData.block_name || blockId,
      district_name: bMeta.district_name || bData.district_name || 'Odisha',
      date: step.date,
      dayLabel: step.horizon || step.key,
      fullLabel: step.label,
      state: step.state,
      temporal_state: step.state,
      data_status: bData.data_status || step.status,
      forecast_horizon: step.horizon || null,
      temperature_max: tmax,
      tmax,
      tmax_p10: tmax !== null ? +(tmax - 1.2).toFixed(1) : null,
      tmax_p50: tmax,
      tmax_p90: tmax !== null ? +(tmax + 1.4).toFixed(1) : null,
      relative_humidity: rh,
      rh,
      wind_speed: wind,
      solar_radiation: solar,
      heat_index: hi,
      wbgt,
      utci_approx: utci,
      thermal_value: thermalVal,
      thermal_stress_level: tier,
      provenance: bData.provenance || null,
      explanation: bData.explanation || null,
    };
  });
}
