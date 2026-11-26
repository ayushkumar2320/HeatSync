/**
 * formatters.ts
 * Standardized Formatting Helpers for HeatX User Interface
 */

export function formatTemp(val: number | string | null | undefined, unit = '°C'): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '—';
  return `${Number(val).toFixed(1)}${unit}`;
}

export function formatPop(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === '' || isNaN(Number(num))) return '—';
  const n = Number(num);
  if (n === 0) return '0';
  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(2)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toLocaleString('en-IN');
}

export function formatArea(sqkm: number | string | null | undefined): string {
  if (!sqkm || isNaN(Number(sqkm))) return '—';
  return `${Number(sqkm).toLocaleString('en-IN', { maximumFractionDigits: 1 })} km²`;
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }
  return dateStr;
}

export function formatCoord(lat?: number, lon?: number): string {
  if (lat === undefined || lon === undefined) return '—';
  return `${Number(lat).toFixed(3)}°N, ${Number(lon).toFixed(3)}°E`;
}
