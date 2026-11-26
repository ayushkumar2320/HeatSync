/**
 * thermalRiskContract.ts
 * Deterministic Biophysical Risk Classification & Continuous Gradient
 * Standard Tiers: NORMAL, CAUTION, HIGH, DANGER, LETHAL
 *
 * Mandatory Operational Scale:
 *   < 30°C     NORMAL   🟢 Green   (#22c55e)
 *   30–<35°C   CAUTION  🟡 Yellow  (#eab308)
 *   35–<40°C   HIGH     🟠 Orange  (#f97316)
 *   40–<45°C   DANGER   🔴 Red     (#ef4444)
 *   ≥45°C      LETHAL   🟣 Purple  (#a855f7)
 */

export interface RiskTierMeta {
  tier: 'NORMAL' | 'CAUTION' | 'HIGH' | 'DANGER' | 'LETHAL';
  label: string;
  color: string;
  hex: string;
  rgb: [number, number, number];
  threshold: string;
  range: string;
  description: string;
}

export const THERMAL_RISK_TIERS: Record<string, RiskTierMeta> = {
  NORMAL: {
    tier: 'NORMAL',
    label: 'Normal',
    color: '#22c55e', // Green
    hex: '#22c55e',
    rgb: [34, 197, 94],
    threshold: '< 30°C',
    range: '< 30.0°C',
    description: 'Normal baseline conditions. Minimal biophysical thermal strain.',
  },
  CAUTION: {
    tier: 'CAUTION',
    label: 'Caution',
    color: '#eab308', // Yellow
    hex: '#eab308',
    rgb: [234, 179, 8],
    threshold: '30–<35°C',
    range: '30.0°C – 34.9°C',
    description: 'Elevated thermal caution. Fatigue possible with prolonged outdoor physical exposure.',
  },
  HIGH: {
    tier: 'HIGH',
    label: 'High',
    color: '#f97316', // Orange
    hex: '#f97316',
    rgb: [249, 115, 22],
    threshold: '35–<40°C',
    range: '35.0°C – 39.9°C',
    description: 'Substantial heat strain. Work-rest cycles and hydration advisories active.',
  },
  DANGER: {
    tier: 'DANGER',
    label: 'Danger',
    color: '#ef4444', // Red
    hex: '#ef4444',
    rgb: [239, 68, 68],
    threshold: '40–<45°C',
    range: '40.0°C – 44.9°C',
    description: 'Dangerous heat load. Severe environmental thermal stress for outdoor populations.',
  },
  LETHAL: {
    tier: 'LETHAL',
    label: 'Lethal',
    color: '#a855f7', // Purple
    hex: '#a855f7',
    rgb: [168, 85, 247],
    threshold: '≥ 45°C',
    range: '≥ 45.0°C',
    description: 'Life-threatening biophysical heat threshold. Emergency heatwave conditions.',
  },
};

/**
 * Continuous Color Gradient Interpolation
 * Maps thermal value smoothly across:
 *   < 30°C   -> Green (#22c55e)
 *   30–<35°C -> Yellow (#eab308)
 *   35–<40°C -> Orange (#f97316)
 *   40–<45°C -> Red (#ef4444)
 *   ≥ 45°C   -> Purple (#a855f7)
 */
export function getContinuousThermalColor(thermalValue: number | null | undefined): string {
  if (thermalValue === null || thermalValue === undefined || isNaN(Number(thermalValue))) {
    return 'rgba(255, 255, 255, 0.15)'; // Unavailable
  }

  const val = Number(thermalValue);

  // Exact transition stops matching the required operational scale:
  const stops: { t: number; c: [number, number, number] }[] = [
    { t: 26.0, c: [34, 197, 94] },   // Pure Normal Green (< 30°C)
    { t: 30.0, c: [234, 179, 8] },   // Caution Yellow (30–<35°C)
    { t: 35.0, c: [249, 115, 22] },  // High Orange (35–<40°C)
    { t: 40.0, c: [239, 68, 68] },   // Danger Red (40–<45°C)
    { t: 45.0, c: [168, 85, 247] },  // Lethal Purple (≥ 45°C)
  ];

  if (val <= stops[0].t) {
    const [r, g, b] = stops[0].c;
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (val >= stops[stops.length - 1].t) {
    const [r, g, b] = stops[stops.length - 1].c;
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Interpolate between adjacent stops
  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    if (val >= s1.t && val <= s2.t) {
      const factor = (val - s1.t) / (s2.t - s1.t);
      const r = Math.round(s1.c[0] + factor * (s2.c[0] - s1.c[0]));
      const g = Math.round(s1.c[1] + factor * (s2.c[1] - s1.c[1]));
      const b = Math.round(s1.c[2] + factor * (s2.c[2] - s1.c[2]));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  return '#22c55e';
}

/**
 * Classify thermal value into deterministic HeatX operational status
 */
export function classifyThermalStress(thermalValue: number | null | undefined): 'NORMAL' | 'CAUTION' | 'HIGH' | 'DANGER' | 'LETHAL' | 'DATA_UNAVAILABLE' {
  if (thermalValue === null || thermalValue === undefined || isNaN(Number(thermalValue))) {
    return 'DATA_UNAVAILABLE';
  }
  const val = Number(thermalValue);
  if (val >= 45.0) return 'LETHAL';
  if (val >= 40.0) return 'DANGER';
  if (val >= 35.0) return 'HIGH';
  if (val >= 30.0) return 'CAUTION';
  return 'NORMAL';
}

export const classifyThermalValue = classifyThermalStress;

export const THERMAL_THRESHOLDS = [
  { tier: 'NORMAL', min: -Infinity, max: 30.0, label: 'Normal', color: '#22c55e', text: '< 30°C' },
  { tier: 'CAUTION', min: 30.0, max: 35.0, label: 'Caution', color: '#eab308', text: '30°C to <35°C' },
  { tier: 'HIGH', min: 35.0, max: 40.0, label: 'High', color: '#f97316', text: '35°C to <40°C' },
  { tier: 'DANGER', min: 40.0, max: 45.0, label: 'Danger', color: '#ef4444', text: '40°C to <45°C' },
  { tier: 'LETHAL', min: 45.0, max: Infinity, label: 'Lethal', color: '#a855f7', text: '>= 45°C' },
];

/**
 * Get canonical color for a thermal tier
 */
export function getThermalTierColor(tier?: string | null): string {
  if (!tier || tier === 'DATA_UNAVAILABLE') return 'rgba(255, 255, 255, 0.2)';
  return THERMAL_RISK_TIERS[tier]?.color || '#22c55e';
}
