import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Sidebar, glassBase } from './Sidebar';
import { BauhausBackground } from './ExploreOdisha';
import { DataSourceBanner, DataSourceBadge } from './DataSourceBanner';
import { getBlockForecastSeries, getDistrictsList, getAllBlocksMeta, getTimelineSteps } from '../adapters/dataAdapter';
import { getThermalTierColor, THERMAL_THRESHOLDS } from '../contracts/thermalRiskContract';

// ── Glass Card ─────────────────────────────────────────────────────────────────
const glassCard: React.CSSProperties = {
  ...glassBase,
  borderRadius: '16px',
  padding: '16px',
};

// ── Custom tooltip for Recharts ────────────────────────────────────────────────
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
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'rgba(245,234,216,0.75)' }}>{p.name}:</span>
          <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Prediction() {
  const districtsList = useMemo(() => getDistrictsList(), []);
  const allBlocksMeta = useMemo(() => getAllBlocksMeta(), []);
  const timelineSteps = useMemo(() => getTimelineSteps(), []);

  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');

  // Filter blocks by district
  const filteredBlocks = useMemo(() => {
    return Object.values(allBlocksMeta)
      .filter(b => !selectedDistrict || b.district_name === selectedDistrict)
      .sort((a, b) => a.block_name.localeCompare(b.block_name));
  }, [allBlocksMeta, selectedDistrict]);

  // Get forecast series for selected block
  const forecastSeries = useMemo(() => {
    if (!selectedBlockId) return [];
    return getBlockForecastSeries(selectedBlockId);
  }, [selectedBlockId]);

  // Chart data
  const chartData = useMemo(() => forecastSeries.map(d => ({
    label: d.dayLabel || d.date,
    state: d.state,
    tmax: d.tmax,
    tmax_p10: d.tmax_p10,
    tmax_p90: d.tmax_p90,
    hi: d.heat_index,
    wbgt: d.wbgt,
    utci: d.utci_approx,
    rh: d.rh,
    wind: d.wind_speed,
    tier: d.thermal_stress_level,
  })), [forecastSeries]);

  // Model monitoring mock stats
  const modelStats = useMemo(() => [
    { model: 'XGBoost T+1', mae: 0.82, rmse: 1.14, bias: -0.05 },
    { model: 'LSTM T+3', mae: 1.47, rmse: 1.98, bias: 0.13 },
    { model: 'Ensemble T+7', mae: 2.31, rmse: 3.12, bias: 0.28 },
  ], []);

  const inputStyle: React.CSSProperties = {
    background: 'rgba(3,47,12,0.65)',
    border: '1px solid rgba(234,155,122,0.3)',
    borderRadius: '10px',
    color: '#f5ead8',
    padding: '8px 12px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    width: '100%',
    outline: 'none',
  };

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
      <Sidebar currentPath="/prediction" />

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
          ML Forecast Dashboard
        </div>
        <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: 'rgba(234,155,122,0.65)', textTransform: 'uppercase', marginTop: '2px' }}>
          7-Day Multi-Horizon Thermal Forecasts · P10/P50/P90 Uncertainty
        </div>
      </motion.div>

      {/* Main content */}
      <div style={{
        position: 'absolute', inset: 0, top: '60px', bottom: '12px',
        display: 'flex', flexDirection: 'row', alignItems: 'stretch',
        padding: '0 16px', gap: '12px', zIndex: 10,
      }}>
        {/* Sidebar space */}
        <div style={{ width: '60px', flexShrink: 0 }} />

        {/* Left: Controls + Model monitoring */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'auto' }}
        >
          {/* Block Selector */}
          <div style={glassCard}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Select Block
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '10px', color: 'rgba(245,234,216,0.6)', marginBottom: 4 }}>District</div>
              <select
                value={selectedDistrict}
                onChange={e => { setSelectedDistrict(e.target.value); setSelectedBlockId(''); }}
                style={inputStyle}
              >
                <option value="">All Districts</option>
                {districtsList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'rgba(245,234,216,0.6)', marginBottom: 4 }}>CD Block</div>
              <select
                value={selectedBlockId}
                onChange={e => setSelectedBlockId(e.target.value)}
                style={inputStyle}
              >
                <option value="">— Select Block —</option>
                {filteredBlocks.map(b => <option key={b.block_id} value={b.block_id}>{b.block_name}</option>)}
              </select>
            </div>
          </div>

          {/* Thermal Risk Scale */}
          <div style={glassCard}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              5-Tier Risk Scale
            </div>
            {THERMAL_THRESHOLDS.map(tier => (
              <div key={tier.tier} style={{
                display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px',
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: tier.color, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#f5ead8' }}>{tier.label}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(245,234,216,0.5)', marginLeft: 6 }}>{tier.text}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Model Monitoring */}
          <div style={glassCard}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Model Performance (MAE)
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={modelStats} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="model" tick={{ fill: 'rgba(245,234,216,0.6)', fontSize: 8 }} />
                <YAxis tick={{ fill: 'rgba(245,234,216,0.5)', fontSize: 9 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="mae" name="MAE (°C)" fill="#ea9b7a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {modelStats.map(m => (
                <div key={m.model} style={{ fontSize: '10px', color: 'rgba(245,234,216,0.7)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{m.model}</span>
                  <span>MAE: <strong style={{ color: '#ea9b7a' }}>{m.mae}°</strong> RMSE: <strong style={{ color: '#f97316' }}>{m.rmse}°</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline overview */}
          <div style={glassCard}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              15-Day Window
            </div>
            {timelineSteps.map(s => (
              <div key={s.date} style={{
                display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                  background: s.state === 'CURRENT' ? '#ea9b7a' : s.state === 'FORECAST' ? '#c4623a' : '#4a8c5c',
                }} />
                <span style={{ fontSize: '9px', color: 'rgba(245,234,216,0.65)' }}>{s.horizon || s.key || s.date}</span>
                <span style={{
                  fontSize: '8px', color: 'rgba(245,234,216,0.4)',
                  background: 'rgba(255,255,255,0.04)', padding: '0 4px', borderRadius: 4,
                }}>{s.state}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: Charts */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'auto' }}>
          {!selectedBlockId ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                ...glassCard,
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ea9b7a', marginBottom: '8px' }}>
                Select a CD Block to View Forecasts
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(245,234,216,0.55)', maxWidth: '380px' }}>
                Choose a district and CD block from the left panel to view 7-day multi-horizon
                ML forecasts with P10/P50/P90 uncertainty ribbons, weather variable breakdowns,
                and biophysical thermal metrics.
              </div>
              <div style={{ marginTop: '24px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {['XGBoost', 'LSTM', 'GBM Ensemble'].map(m => (
                  <div key={m} style={{
                    ...glassBase, borderRadius: '10px', padding: '8px 16px',
                    fontSize: '12px', fontWeight: 600, color: '#ea9b7a',
                  }}>{m}</div>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {/* Temperature forecast with P10/P50/P90 */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ ...glassCard, minHeight: '220px' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Temperature Max (°C) — P10/P50/P90 Uncertainty Ribbons <DataSourceBadge />
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(245,234,216,0.6)', fontSize: 9 }} />
                    <YAxis tick={{ fill: 'rgba(245,234,216,0.5)', fontSize: 9 }} unit="°" />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={35} stroke="#f97316" strokeDasharray="3 3" opacity={0.5} />
                    <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
                    <Area type="monotone" dataKey="tmax_p90" name="P90" stroke="none" fill="rgba(234,155,122,0.15)" />
                    <Area type="monotone" dataKey="tmax_p10" name="P10" stroke="none" fill="rgba(3,47,12,0.4)" />
                    <Line type="monotone" dataKey="tmax" name="Tmax (P50)" stroke="#ea9b7a" strokeWidth={2} dot={{ r: 3, fill: '#ea9b7a' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Biophysical metrics: HI, WBGT, UTCI */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{ ...glassCard, minHeight: '200px' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Biophysical Indices — Heat Index · WBGT · UTCI (°C)
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(245,234,216,0.6)', fontSize: 9 }} />
                    <YAxis tick={{ fill: 'rgba(245,234,216,0.5)', fontSize: 9 }} unit="°" />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="hi" name="Heat Index" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="wbgt" name="WBGT" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="utci" name="UTCI" stroke="#a855f7" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Weather variables */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                style={{ ...glassCard, minHeight: '200px' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Weather Variables — RH (%) · Wind Speed (m/s)
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(245,234,216,0.6)', fontSize: 9 }} />
                    <YAxis tick={{ fill: 'rgba(245,234,216,0.5)', fontSize: 9 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="rh" name="Rel. Humidity %" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="wind" name="Wind m/s" stroke="#e879f9" strokeWidth={1.5} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Risk tier timeline */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                style={glassCard}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Thermal Risk Tier Timeline
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                  {forecastSeries.map(d => (
                    <div key={d.date} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      minWidth: '44px',
                    }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '8px',
                        background: getThermalTierColor(d.thermal_stress_level),
                        opacity: 0.85,
                        border: '1px solid rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700, color: '#fff',
                      }}>
                        {d.thermal_value !== null && d.thermal_value !== undefined ? `${Number(d.thermal_value).toFixed(0)}°` : '—'}
                      </div>
                      <div style={{ fontSize: '8px', color: 'rgba(245,234,216,0.6)', textAlign: 'center' }}>
                        {d.dayLabel || d.date?.slice(5)}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
