/**
 * HeatX Observation Contract
 * ==========================
 * Canonical specification for ingested weather, sensor, AWS, and atmospheric
 * telemetry at the CD Block level.
 *
 * Mandatory Fields:
 * 1. observation_id       - Unique observation record primary key
 * 2. timestamp            - Observation valid time (UTC / IST ISO 8601)
 * 3. BLOCK_ID             - Authoritative CD Block identifier (e.g., OD_ANUG_3276)
 * 4. dataset_source       - Ingestion source / dataset provider (dataset/source)
 * 5. variable             - Parameter measured (e.g., temperature_2m, relative_humidity)
 * 6. value                - Measured physical value (float)
 * 7. unit                 - Physical measurement unit (degC, pct, m_s, W_m2, ug_m3)
 * 8. quality_status       - QC qualification status (VALID, SUSPECT, OUT_OF_BOUNDS, MISSING_INTERPOLATED, REJECTED)
 * 9. ingestion_timestamp  - System receipt timestamp (ISO 8601)
 */

import { isValidBlockId } from './geographyContract';

export const QUALITY_STATUS = {
  VALID: 'VALID',
  SUSPECT: 'SUSPECT',
  OUT_OF_BOUNDS: 'OUT_OF_BOUNDS',
  MISSING_INTERPOLATED: 'MISSING_INTERPOLATED',
  REJECTED: 'REJECTED',
} as const;

export const SUPPORTED_VARIABLES = {
  TEMPERATURE_2M: 'temperature_2m',
  TEMPERATURE_MAX: 'temperature_max',
  TEMPERATURE_MIN: 'temperature_min',
  RELATIVE_HUMIDITY: 'relative_humidity',
  WIND_SPEED: 'wind_speed',
  SOLAR_RADIATION: 'solar_radiation',
  PM25: 'pm25',
  PM10: 'pm10',
  O3: 'o3',
  NO2: 'no2',
  SO2: 'so2',
} as const;

export const SUPPORTED_UNITS = {
  DEGC: 'degC',
  PCT: 'pct',
  M_S: 'm_s',
  W_M2: 'W_m2',
  UG_M3: 'ug_m3',
} as const;

export interface ObservationRecord {
  observation_id: string | number;
  timestamp: string;
  BLOCK_ID: string;
  dataset_source?: string;
  'dataset/source'?: string;
  source_id?: string;
  variable: string;
  value: number;
  unit: string;
  quality_status?: string;
  'quality/status'?: string;
  quality_flag?: string;
  ingestion_timestamp: string;
  data_status?: string;
  db_record_id?: number | string;
}

export function validateObservationRecord(record: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['Record must be a non-null object'] };
  }

  const rec = record as Record<string, unknown>;

  // 1. observation_id
  if (!rec.observation_id && rec.observation_id !== 0) {
    errors.push('Missing observation_id');
  }

  // 2. timestamp
  if (!rec.timestamp || typeof rec.timestamp !== 'string' || isNaN(Date.parse(rec.timestamp))) {
    errors.push(`Invalid or missing timestamp: "${rec.timestamp}"`);
  }

  // 3. BLOCK_ID
  if (!rec.BLOCK_ID || !isValidBlockId(rec.BLOCK_ID)) {
    errors.push(`Invalid or non-canonical BLOCK_ID: "${rec.BLOCK_ID}"`);
  }

  // 4. dataset_source
  const source = rec.dataset_source || rec['dataset/source'] || rec.source_id;
  if (!source || typeof source !== 'string') {
    errors.push('Missing dataset/source provider identifier');
  }

  // 5. variable
  if (!rec.variable || typeof rec.variable !== 'string') {
    errors.push('Missing observation variable name');
  }

  // 6. value
  if (typeof rec.value !== 'number' || isNaN(rec.value)) {
    errors.push(`Invalid numeric value: "${rec.value}"`);
  }

  // 7. unit
  if (!rec.unit || typeof rec.unit !== 'string') {
    errors.push('Missing measurement unit');
  }

  // 8. quality_status
  const status = rec.quality_status || rec['quality/status'] || rec.quality_flag;
  if (!status || typeof status !== 'string' || !Object.values(QUALITY_STATUS).includes(status as any)) {
    errors.push(`Invalid quality/status: "${status}". Must be one of: ${Object.values(QUALITY_STATUS).join(', ')}`);
  }

  // 9. ingestion_timestamp
  if (!rec.ingestion_timestamp || typeof rec.ingestion_timestamp !== 'string' || isNaN(Date.parse(rec.ingestion_timestamp))) {
    errors.push(`Invalid or missing ingestion_timestamp: "${rec.ingestion_timestamp}"`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
