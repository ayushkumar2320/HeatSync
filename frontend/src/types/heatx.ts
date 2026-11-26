/**
 * heatx.ts
 * Core HeatX Type Definitions
 */

export interface TimelineStep {
  date: string;
  day?: number;
  state: 'HISTORICAL' | 'CURRENT' | 'FORECAST';
  status?: string;
  source?: string;
  horizon?: string | null;
  label?: string;
  key?: string;
}

export interface CDBlockMeta {
  block_id: string;
  block_name: string;
  district_id: string;
  district_name: string;
  area_sqkm: number;
  lgd_code?: string;
  lat: number;
  lon: number;
  population: number;
  population_density: number;
  population_source?: string;
}

export interface CDBlockRecord {
  block_id: string;
  block_name: string;
  district_id?: string;
  district_name: string;
  date: string;
  temporal_state?: 'HISTORICAL' | 'CURRENT' | 'FORECAST';
  data_status?: string;
  data_source?: string;
  forecast_horizon?: string | null;
  is_valid?: boolean;
  temperature_max?: number | null;
  relative_humidity?: number | null;
  wind_speed?: number | null;
  solar_radiation?: number | null;
  wbgt?: number | null;
  heat_index?: number | null;
  utci_approx?: number | null;
  thermal_value?: number | null;
  thermal_stress_level?: string;
  population?: number;
  population_density?: number;
  population_exposed?: number;
  public_health_attention_level?: string;
  provenance?: any;
  health_model_status?: string;
  explanation?: any;
}

export interface StateSummary {
  date: string;
  totalBlocks: number;
  criticalCount: number;
  totalExposedPop: number;
  maxThermalVal: number;
  maxWbgt: number;
  maxBlock: CDBlockRecord | null;
}

export interface BlockForecastItem {
  block_id?: string;
  block_name?: string;
  district_name?: string;
  date: string;
  dayLabel?: string;
  fullLabel?: string;
  state?: string;
  temporal_state?: string;
  data_status?: string;
  forecast_horizon?: string | null;
  temperature_max: number | null;
  tmax?: number | null;
  tmax_p10?: number | null;
  tmax_p50?: number | null;
  tmax_p90?: number | null;
  relative_humidity: number | null;
  rh?: number | null;
  wind_speed: number | null;
  solar_radiation: number | null;
  heat_index: number | null;
  wbgt: number | null;
  utci_approx: number | null;
  thermal_value: number | null;
  thermal_stress_level: string;
  provenance?: any;
  explanation?: any;
}
