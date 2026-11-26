/**
 * thermalEngine.ts
 * HeatX Biophysical Thermal Thermodynamic Formulations
 * Implements:
 * 1. ISO 7243:2017 Outdoor WBGT via Stull (2011) psychrometric equation
 * 2. NOAA NWS SR 90-23 Rothfusz Heat Index with standard adjustments
 * 3. COST Action 730 Simplified Outdoor UTCI Proxy
 */

export function computeWetBulbStull(tempC: number, rhPct: number): number {
  const t = Number(tempC);
  const h = Number(rhPct);

  const twb =
    t * Math.atan(0.151977 * Math.sqrt(h + 8.313659)) +
    Math.atan(t + h) -
    Math.atan(h - 1.676331) +
    0.00391838 * Math.pow(h, 1.5) * Math.atan(0.023101 * h) -
    4.686035;

  return twb + 1.0;
}

export function computeWBGT(tempC: number, rhPct: number, windMs = 1.5, solarWm2 = 450.0): number {
  const tnwb = computeWetBulbStull(tempC, rhPct);
  const wEff = Math.max(Number(windMs), 0.1);
  const tg = Number(tempC) + (Number(solarWm2) * 0.0075) / (wEff + 0.5);
  const wbgt = 0.7 * tnwb + 0.2 * tg + 0.1 * Number(tempC);

  return Math.round(wbgt * 100) / 100;
}

export function computeHeatIndex(tempC: number, rhPct: number): number {
  const tC = Number(tempC);
  const r = Number(rhPct);

  if (tC < 27.0 || r < 40.0) {
    return tC;
  }

  const tF = tC * (9.0 / 5.0) + 32.0;

  let hiF =
    -42.379 +
    2.04901523 * tF +
    10.14333127 * r -
    0.22475541 * tF * r -
    0.00683783 * (tF * tF) -
    0.05481717 * (r * r) +
    0.00122874 * (tF * tF) * r +
    0.00085282 * tF * (r * r) -
    0.00000199 * (tF * tF) * (r * r);

  // Low humidity adjustment
  if (r < 13.0 && tF >= 80.0 && tF <= 112.0) {
    hiF -= ((13.0 - r) / 4.0) * Math.sqrt((17.0 - Math.abs(tF - 95.0)) / 17.0);
  }
  // High humidity adjustment
  else if (r > 85.0 && tF >= 80.0 && tF <= 87.0) {
    hiF += ((r - 85.0) / 10.0) * ((87.0 - tF) / 5.0);
  }

  const hiC = (hiF - 32.0) * (5.0 / 9.0);
  return Math.round(hiC * 100) / 100;
}

export function computeUTCIApprox(tempC: number, rhPct: number, windMs = 1.5, solarWm2 = 450.0): number {
  const t = Number(tempC);
  const rh = Number(rhPct);
  const v10 = Math.max(Number(windMs) * 1.251, 0.3); // 10m log-law
  const s = Number(solarWm2);

  const e = (rh / 100.0) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
  const deltaTrad = Math.min(Math.max(s * 0.02, 0.0), 15.0);

  const utci = t + 0.33 * (e / 10.0) - 0.7 * v10 - 4.0 + 0.1 * deltaTrad;
  return Math.round(utci * 100) / 100;
}

export function calculateHeatIndexWithProvenance(
  tempC: number | null | undefined,
  rhPct: number | null | undefined,
  blockId?: string,
  timestamp?: string,
  dateStatus = 'DERIVED'
) {
  if (tempC === null || tempC === undefined || isNaN(Number(tempC)) ||
      rhPct === null || rhPct === undefined || isNaN(Number(rhPct))) {
    return {
      value: null,
      metric: 'heat_index',
      method: 'NWS_Rothfusz',
      temperature_input: null,
      humidity_input: null,
      timestamp: timestamp || null,
      BLOCK_ID: blockId || null,
      status: 'DATA_UNAVAILABLE',
    };
  }

  const hi = computeHeatIndex(Number(tempC), Number(rhPct));
  return {
    value: hi,
    metric: 'heat_index',
    method: 'NWS_Rothfusz',
    temperature_input: Number(tempC),
    humidity_input: Number(rhPct),
    timestamp: timestamp || null,
    BLOCK_ID: blockId || null,
    status: dateStatus,
  };
}
