import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Sidebar, glassBase } from './Sidebar';
import { BauhausBackground } from './ExploreOdisha';
import { DataSourceBanner } from './DataSourceBanner';
import rawAqiData from '../data/camsDistrictAqi.json';

const glassCard: React.CSSProperties = {
  ...glassBase,
  borderRadius: '16px',
  padding: '16px',
};

function getAqiColor(aqi: number): string {
  if (aqi < 50) return '#22c55e';      // Good
  if (aqi < 100) return '#eab308';     // Moderate
  if (aqi < 150) return '#f97316';     // Unhealthy for Sensitive Groups
  if (aqi < 200) return '#ef4444';     // Unhealthy
  if (aqi < 300) return '#a855f7';     // Very Unhealthy
  return '#9f1239';                     // Hazardous
}

function getAqiLabel(aqi: number): string {
  if (aqi < 50) return 'Good';
  if (aqi < 100) return 'Moderate';
  if (aqi < 150) return 'Unhealthy (Sensitive)';
  if (aqi < 200) return 'Unhealthy';
  if (aqi < 300) return 'Very Unhealthy';
  return 'Hazardous';
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(3,47,12,0.92)',
      border: '1px solid rgba(234,155,122,0.4)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '11px',
      fontFamily: "'Inter', sans-serif",
      color: '#f5ead8',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#ea9b7a' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || '#ea9b7a', display: 'inline-block' }} />
          <span style={{ color: 'rgba(245,234,216,0.75)' }}>{p.name}:</span>
          <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

interface AqiRecord {
  district: string;
  date: string;
  source: string;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  aqi: number;
  status: string;
  compoundFlag: boolean;
}

export default function AirQuality() {
  const aqiData = rawAqiData as AqiRecord[];

  const sortedByAqi = useMemo(
    () => [...aqiData].sort((a, b) => b.aqi - a.aqi),
    [aqiData],
  );

  const stateSummary = useMemo(() => {
    const total = aqiData.length;
    const goodCount = aqiData.filter(d => d.aqi < 50).length;
    const moderateCount = aqiData.filter(d => d.aqi >= 50 && d.aqi < 100).length;
    const unhealthyCount = aqiData.filter(d => d.aqi >= 100).length;
    const maxAqi = Math.max(...aqiData.map(d => d.aqi));
    const avgAqi = aqiData.reduce((s, d) => s + d.aqi, 0) / total;
    const worstDistrict = aqiData.find(d => d.aqi === maxAqi);
    return { total, goodCount, moderateCount, unhealthyCount, maxAqi, avgAqi, worstDistrict };
  }, [aqiData]);

  const dateLabel = aqiData[0]?.date || '—';
  const sourceLabel = aqiData[0]?.source || 'CAMS Reanalysis';

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      overflow: 'hidden',
    }}>
      <BauhausBackground />
      <DataSourceBanner />
      <Sidebar currentPath="/air-quality" />

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          top: '12px', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20, textAlign: 'center',
          pointerEvents: 'none', userSelect: 'none',
        }}
      >
        <div style={{
          fontWeight: 800, fontSize: 'clamp(16px, 2.4vw, 24px)',
          letterSpacing: '0.14em', color: '#ea9b7a', textTransform: 'uppercase',
          textShadow: '0 1px 3px rgba(3,47,12,0.60)',
        }}>
          Air Quality Index — Odisha Districts
        </div>
        <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: 'rgba(234,155,122,0.65)', textTransform: 'uppercase', marginTop: '2px' }}>
          CAMS · PM2.5 · PM10 · O₃ · NO₂ · SO₂ · {dateLabel}
        </div>
      </motion.div>

      {/* Main layout */}
      <div style={{
        position: 'absolute', inset: 0, top: '60px', bottom: '12px',
        display: 'flex', flexDirection: 'row', alignItems: 'stretch',
        padding: '0 16px', gap: '12px', zIndex: 10,
      }}>
        {/* Sidebar space */}
        <div style={{ width: '60px', flexShrink: 0 }} />

        {/* Left: Summary */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={glassCard}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              State Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              {[
                { label: 'Districts', value: stateSummary.total, color: '#f5ead8' },
                { label: 'Avg AQI', value: stateSummary.avgAqi.toFixed(1), color: '#ea9b7a' },
                { label: 'Good', value: stateSummary.goodCount, color: '#22c55e' },
                { label: 'Moderate+', value: stateSummary.moderateCount + stateSummary.unhealthyCount, color: '#eab308' },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(245,234,216,0.5)', marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
            {stateSummary.worstDistrict && (
              <div style={{ padding: '8px 10px', background: `${getAqiColor(stateSummary.worstDistrict.aqi)}22`, borderRadius: '10px', border: `1px solid ${getAqiColor(stateSummary.worstDistrict.aqi)}40` }}>
                <div style={{ fontSize: '10px', color: 'rgba(245,234,216,0.5)', marginBottom: 2 }}>Highest AQI District</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f5ead8' }}>{stateSummary.worstDistrict.district}</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: getAqiColor(stateSummary.worstDistrict.aqi) }}>
                  AQI: {stateSummary.worstDistrict.aqi.toFixed(1)}
                </div>
              </div>
            )}
          </div>

          {/* AQI Scale */}
          <div style={glassCard}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>AQI Scale</div>
            {[
              { range: '0–49', label: 'Good', color: '#22c55e' },
              { range: '50–99', label: 'Moderate', color: '#eab308' },
              { range: '100–149', label: 'Unhealthy (Sensitive)', color: '#f97316' },
              { range: '150–199', label: 'Unhealthy', color: '#ef4444' },
              { range: '200–299', label: 'Very Unhealthy', color: '#a855f7' },
              { range: '≥300', label: 'Hazardous', color: '#9f1239' },
            ].map(s => (
              <div key={s.range} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '28px', height: '12px', borderRadius: '4px', background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: '9px', color: 'rgba(245,234,216,0.65)' }}>
                  {s.range} <span style={{ color: s.color, fontWeight: 700 }}>{s.label}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Source info */}
          <div style={{ ...glassCard, fontSize: '10px', color: 'rgba(245,234,216,0.5)', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, color: '#ea9b7a', marginBottom: '4px' }}>Data Source</div>
            {sourceLabel}<br />
            Date: {dateLabel}<br />
            30 Odisha Districts
          </div>
        </motion.div>

        {/* Right: Charts */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'auto' }}>
          {/* AQI Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{ ...glassCard, minHeight: '220px' }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '10px' }}>
              AQI by District (Ranked)
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={sortedByAqi} margin={{ top: 4, right: 8, left: -8, bottom: 30 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="district" tick={{ fill: 'rgba(245,234,216,0.55)', fontSize: 8 }} angle={-40} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: 'rgba(245,234,216,0.5)', fontSize: 9 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="aqi" name="AQI" radius={[4, 4, 0, 0]}>
                  {sortedByAqi.map((entry, i) => (
                    <Cell key={i} fill={getAqiColor(entry.aqi)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* PM2.5 / PM10 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            style={{ ...glassCard, minHeight: '200px' }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '10px' }}>
              PM2.5 &amp; PM10 (μg/m³) by District
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={sortedByAqi} margin={{ top: 4, right: 8, left: -8, bottom: 30 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="district" tick={{ fill: 'rgba(245,234,216,0.55)', fontSize: 8 }} angle={-40} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: 'rgba(245,234,216,0.5)', fontSize: 9 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="pm25" name="PM2.5" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pm10" name="PM10" fill="#818cf8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* District AQI tiles */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={glassCard}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '10px' }}>
              District AQI Tiles
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {sortedByAqi.map(d => (
                <div key={d.district} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '8px 10px', borderRadius: '10px',
                  background: `${getAqiColor(d.aqi)}20`,
                  border: `1px solid ${getAqiColor(d.aqi)}50`,
                  minWidth: '90px',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: getAqiColor(d.aqi) }}>{d.aqi.toFixed(1)}</div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: '#f5ead8', textAlign: 'center', marginTop: '2px' }}>{d.district}</div>
                  <div style={{ fontSize: '8px', color: getAqiColor(d.aqi), marginTop: '2px' }}>{getAqiLabel(d.aqi)}</div>
                  <div style={{ fontSize: '8px', color: 'rgba(245,234,216,0.45)', marginTop: '3px' }}>
                    PM2.5: {d.pm25} · PM10: {d.pm10}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
