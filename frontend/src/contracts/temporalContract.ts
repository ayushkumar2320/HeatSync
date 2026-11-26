/**
 * temporalContract.ts
 * 15-Day Heat Timeline Contract
 * Window: Past 7 Days (Historical) + Present (Current) + Future 7 Days (Forecast)
 */

export interface TemporalStateMeta {
  state: 'HISTORICAL' | 'CURRENT' | 'FORECAST';
  label: string;
  badgeColor: string;
  provenance: string;
  description: string;
}

export const TEMPORAL_STATES: Record<string, TemporalStateMeta> = {
  HISTORICAL: {
    state: 'HISTORICAL',
    label: 'Historical',
    badgeColor: '#2dd4bf', // Teal
    provenance: 'OBSERVED / RECONSTRUCTED (ERA5-Land)',
    description: 'Past reanalysis and station observations. Verified meteorological record.',
  },
  CURRENT: {
    state: 'CURRENT',
    label: 'Current Synoptic',
    badgeColor: '#22c55e', // Emerald
    provenance: 'CURRENT SYNOPTIC CYCLE',
    description: 'Current synoptic observation window (06:00 IST cycle).',
  },
  FORECAST: {
    state: 'FORECAST',
    label: 'Direct Forecast',
    badgeColor: '#38bdf8', // Sky Cyan
    provenance: 'DIRECT ML MULTI-HORIZON (LightGBM/TFT)',
    description: 'Machine learning meteorological & biophysical predictive inference.',
  },
};

export const FORECAST_HORIZONS = ['T+1', 'T+2', 'T+3', 'T+4', 'T+5', 'T+6', 'T+7'];

export function getTimelineMetadata(dayIndex: number): {
  state: 'HISTORICAL' | 'CURRENT' | 'FORECAST';
  key: string;
  horizon?: string;
  meta: TemporalStateMeta;
} {
  if (dayIndex < 0) {
    return {
      state: 'HISTORICAL',
      key: `D${dayIndex}`,
      meta: TEMPORAL_STATES.HISTORICAL,
    };
  } else if (dayIndex === 0) {
    return {
      state: 'CURRENT',
      key: 'TODAY',
      meta: TEMPORAL_STATES.CURRENT,
    };
  } else {
    return {
      state: 'FORECAST',
      key: `D+${dayIndex}`,
      horizon: `T+${dayIndex}`,
      meta: TEMPORAL_STATES.FORECAST,
    };
  }
}
