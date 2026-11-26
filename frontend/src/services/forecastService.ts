/**
 * forecastService.ts
 * Service for accessing 7-day multi-horizon forecasting datasets and quantile spreads
 */

import { getBlockForecastSeries as getAdapterBlockForecastSeries } from '../adapters/dataAdapter';
import type { BlockForecastItem } from '../types/heatx';

export function getBlockForecastSeries(blockId: string): BlockForecastItem[] {
  return getAdapterBlockForecastSeries(blockId);
}
