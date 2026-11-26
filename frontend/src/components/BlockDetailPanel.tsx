import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { glassBase } from './Sidebar';
import { getThermalTierColor, classifyThermalStress } from '../contracts/thermalRiskContract';
import { MANDATORY_HEALTH_DISCLAIMER } from '../contracts/healthModelContract';
import { formatTemp, formatPop } from '../utils/formatters';
import { getBlockForecastSeries } from '../adapters/dataAdapter';
import { postObservation } from '../services/apiService';
import { DataSourceBadge } from './DataSourceBanner';
import type { CDBlockRecord, StateSummary } from '../types/heatx';

interface BlockDetailPanelProps {
  selectedBlock: CDBlockRecord | null;
  onClearSelection?: () => void;
  stateSummary: StateSummary;
  topBlocks: CDBlockRecord[];
  onSelectBlock: (block: CDBlockRecord) => void;
  districtsList: string[];
  districtFilter: string;
  onFilterDistrict: (district: string) => void;
  activeDate: string;
}

export default function BlockDetailPanel({
  selectedBlock,
  onClearSelection,
  stateSummary,
  topBlocks,
  onSelectBlock,
  districtsList,
  districtFilter,
  onFilterDistrict,
  activeDate,
}: BlockDetailPanelProps) {
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestForm, setIngestForm] = useState({
    variable: 'temperature_max',
    value: '38.5',
    unit: 'degC',
    dataset_source: 'IMD_AWS_ODISHA',
  });
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  // If a block is selected, derive its 7-day forecast series
  const forecastSeries = selectedBlock ? getBlockForecastSeries(selectedBlock.block_id) : [];

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlock) return;
    setIngestStatus('Submitting observation...');
    const payload = {
      observation_id: `OBS_${Date.now()}`,
      timestamp: new Date().toISOString(),
      BLOCK_ID: selectedBlock.block_id,
      dataset_source: ingestForm.dataset_source,
      variable: ingestForm.variable,
      value: parseFloat(ingestForm.value),
      unit: ingestForm.unit,
      quality_status: 'VALID',
      ingestion_timestamp: new Date().toISOString(),
      data_status: 'OBSERVED',
    };

    const res = await postObservation(payload);
    if (res?.status === 'ACCEPTED') {
      setIngestStatus('✔ Observation accepted and persisted!');
      setTimeout(() => {
        setIngestStatus(null);
        setShowIngestModal(false);
      }, 1500);
    } else {
      setIngestStatus(`Result: ${res?.status || 'OFFLINE'} (${res?.error || 'Simulated pipeline execution'})`);
      setTimeout(() => setIngestStatus(null), 3000);
    }
  };

  return (
    <motion.div
      layout
      style={{
        ...glassBase,
        width: '320px',
        height: '100%',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        background: 'rgba(2, 26, 7, 0.85)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid rgba(234, 155, 122, 0.20)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#ea9b7a',
              textTransform: 'uppercase',
              marginBottom: '3px',
            }}
          >
            {selectedBlock ? 'CD Block Intelligence' : 'Odisha Statewide Overview'}
            {' '}
            <DataSourceBadge />
          </div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: '#f5ead8',
              lineHeight: 1.2,
            }}
          >
            {selectedBlock ? selectedBlock.block_name : 'State Overview'}
          </div>
          {selectedBlock && (
            <div style={{ fontSize: '10px', color: 'rgba(245, 234, 216, 0.65)', marginTop: '2px' }}>
              {selectedBlock.district_name} District · <span style={{ fontFamily: 'monospace', color: '#ea9b7a' }}>{selectedBlock.block_id}</span>
            </div>
          )}
        </div>

        {selectedBlock && onClearSelection && (
          <button
            onClick={onClearSelection}
            style={{
              padding: '4px 8px',
              fontSize: '9px',
              fontWeight: 700,
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(234, 155, 122, 0.25)',
              color: '#ea9b7a',
              cursor: 'pointer',
            }}
            title="Return to Statewide Overview"
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {selectedBlock ? (
          /* ── BLOCK SELECTED DETAIL VIEW ── */
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedBlock.block_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {/* PRIMARY METRIC: STRICT AIR TEMP VS HEAT INDEX */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(234, 155, 122, 0.22)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '99px',
                      background: getThermalTierColor(selectedBlock.thermal_stress_level),
                      color: '#ffffff',
                    }}
                  >
                    {selectedBlock.thermal_stress_level || classifyThermalStress(selectedBlock.thermal_value)}
                  </span>
                  <span style={{ fontSize: '9px', color: '#ea9b7a', fontWeight: 600 }}>
                    {selectedBlock.data_status || 'OBSERVED'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: 'rgba(245, 234, 216, 0.60)', textTransform: 'uppercase' }}>
                      Air Temperature
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f5ead8' }}>
                      {formatTemp(selectedBlock.temperature_max)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700 }}>
                      Heat Index (HI)
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>
                      {formatTemp(selectedBlock.heat_index ?? selectedBlock.thermal_value)}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '8px', color: 'rgba(245, 234, 216, 0.45)', marginTop: '6px', lineHeight: 1.3 }}>
                  Strict Biophysical Separation: Air temperature is physical ambient dry-bulb. Heat Index reflects perceived apparent temperature under humidity.
                </div>
              </div>

              {/* SECONDARY BIOPHYSICAL INDICES */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.10)',
                    borderRadius: '10px',
                    padding: '8px 10px',
                  }}
                >
                  <div style={{ fontSize: '8.5px', color: 'rgba(245, 234, 216, 0.60)' }}>WBGT Index</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#f5ead8', marginTop: '2px' }}>
                    {formatTemp(selectedBlock.wbgt)}
                  </div>
                  <div style={{ fontSize: '7.5px', color: 'rgba(245, 234, 216, 0.40)' }}>ISO 7243:2017</div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.10)',
                    borderRadius: '10px',
                    padding: '8px 10px',
                  }}
                >
                  <div style={{ fontSize: '8.5px', color: 'rgba(245, 234, 216, 0.60)' }}>UTCI Approx</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#f5ead8', marginTop: '2px' }}>
                    {formatTemp(selectedBlock.utci_approx)}
                  </div>
                  <div style={{ fontSize: '7.5px', color: 'rgba(245, 234, 216, 0.40)' }}>COST 730 Proxy</div>
                </div>
              </div>

              {/* METEOROLOGICAL CONDITIONS */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.10)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#ea9b7a', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Observed Weather Variables
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
                  <div>
                    <span style={{ color: 'rgba(245, 234, 216, 0.55)' }}>Relative Humidity:</span>
                    <strong style={{ display: 'block', color: '#f5ead8', fontSize: '12px' }}>
                      {selectedBlock.relative_humidity !== null && selectedBlock.relative_humidity !== undefined ? `${Number(selectedBlock.relative_humidity).toFixed(1)}%` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(245, 234, 216, 0.55)' }}>10m Wind Speed:</span>
                    <strong style={{ display: 'block', color: '#f5ead8', fontSize: '12px' }}>
                      {selectedBlock.wind_speed !== null && selectedBlock.wind_speed !== undefined ? `${Number(selectedBlock.wind_speed).toFixed(1)} m/s` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(245, 234, 216, 0.55)' }}>Solar Radiation:</span>
                    <strong style={{ display: 'block', color: '#f5ead8', fontSize: '12px' }}>
                      {selectedBlock.solar_radiation !== null && selectedBlock.solar_radiation !== undefined ? `${Number(selectedBlock.solar_radiation).toFixed(1)} W/m²` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(245, 234, 216, 0.55)' }}>Data Status:</span>
                    <strong style={{ display: 'block', color: '#4ade80', fontSize: '11px' }}>
                      {selectedBlock.data_status || 'OBSERVED'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 7-DAY FORECAST PREVIEW (T+1 TO T+7) */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.10)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#ea9b7a', textTransform: 'uppercase', marginBottom: '8px' }}>
                  7-Day Multi-Horizon Outlook
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {forecastSeries.filter(s => s.state === 'FORECAST').map(s => (
                    <div
                      key={s.date}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        fontSize: '10px',
                      }}
                    >
                      <span style={{ color: '#38bdf8', fontWeight: 700 }}>{s.dayLabel}</span>
                      <span style={{ color: 'rgba(245, 234, 216, 0.65)' }}>{s.date.slice(5)}</span>
                      <span style={{ color: '#f5ead8', fontWeight: 600 }}>{formatTemp(s.temperature_max)}</span>
                      <span
                        style={{
                          fontSize: '8px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: getThermalTierColor(s.thermal_stress_level),
                          color: '#fff',
                        }}
                      >
                        {s.thermal_stress_level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* POPULATION & EXPOSURE */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.10)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  marginBottom: '10px',
                  fontSize: '10px',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#ea9b7a', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Demographic Exposure Context
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span style={{ color: 'rgba(245, 234, 216, 0.60)' }}>Block Population:</span>
                  <strong style={{ color: '#f5ead8' }}>{formatPop(selectedBlock.population)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span style={{ color: 'rgba(245, 234, 216, 0.60)' }}>Block Density:</span>
                  <strong style={{ color: '#f5ead8' }}>
                    {selectedBlock.population_density ? `${selectedBlock.population_density} / km²` : '—'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span style={{ color: 'rgba(245, 234, 216, 0.60)' }}>Health Attention Proxy:</span>
                  <strong style={{ color: '#ea9b7a' }}>{selectedBlock.public_health_attention_level || 'ROUTINE'}</strong>
                </div>
              </div>

              {/* ETHICAL HEALTH DISCLAIMER */}
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '8px',
                  color: 'rgba(254, 202, 202, 0.85)',
                  lineHeight: 1.35,
                  marginBottom: '10px',
                }}
              >
                ⚠️ <strong>Ethical Boundary:</strong> {MANDATORY_HEALTH_DISCLAIMER}
              </div>

              {/* LIVE INGESTION BUTTON */}
              <button
                onClick={() => setShowIngestModal(!showIngestModal)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.40)',
                  color: '#86efac',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: '10px',
                }}
              >
                📡 Ingest Sensor Observation
              </button>

              {/* LIVE INGESTION FORM MODAL */}
              {showIngestModal && (
                <form
                  onSubmit={handleIngestSubmit}
                  style={{
                    background: 'rgba(0, 0, 0, 0.40)',
                    border: '1px solid rgba(234, 155, 122, 0.25)',
                    borderRadius: '10px',
                    padding: '10px',
                    marginBottom: '10px',
                    fontSize: '10px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#ea9b7a', marginBottom: '6px' }}>
                    Live Observation Ingestion (9-Attribute Contract)
                  </div>

                  <div style={{ marginBottom: '6px' }}>
                    <label style={{ display: 'block', color: 'rgba(245,234,216,0.7)', marginBottom: '2px' }}>Parameter</label>
                    <select
                      value={ingestForm.variable}
                      onChange={e => setIngestForm({ ...ingestForm, variable: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        background: '#021a07',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        borderRadius: '4px',
                      }}
                    >
                      <option value="temperature_max">temperature_max (°C)</option>
                      <option value="relative_humidity">relative_humidity (%)</option>
                      <option value="wind_speed">wind_speed (m/s)</option>
                      <option value="solar_radiation">solar_radiation (W/m²)</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '6px' }}>
                    <label style={{ display: 'block', color: 'rgba(245,234,216,0.7)', marginBottom: '2px' }}>Value</label>
                    <input
                      type="number"
                      step="0.1"
                      value={ingestForm.value}
                      onChange={e => setIngestForm({ ...ingestForm, value: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        background: '#021a07',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        borderRadius: '4px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        padding: '5px',
                        background: '#22c55e',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#000',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowIngestModal(false)}
                      style={{
                        padding: '5px 8px',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>

                  {ingestStatus && (
                    <div style={{ marginTop: '6px', color: '#ea9b7a', fontSize: '9px', fontWeight: 600 }}>
                      {ingestStatus}
                    </div>
                  )}
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          /* ── STATEWIDE OVERVIEW (DEFAULT VIEW) ── */
          <div>
            {/* STATEWIDE STATS SUMMARY CARDS */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(234, 155, 122, 0.20)',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#ea9b7a', textTransform: 'uppercase', marginBottom: '8px' }}>
                Statewide Metrics · {activeDate}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '8.5px', color: 'rgba(245, 234, 216, 0.55)' }}>Peak Heat Index</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#ea9b7a' }}>
                    {formatTemp(stateSummary.maxThermalVal)}
                  </div>
                  <div style={{ fontSize: '8px', color: 'rgba(245, 234, 216, 0.40)' }}>
                    {stateSummary.maxBlock?.block_name || 'Odisha Peak'} · Apparent
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '8.5px', color: 'rgba(245, 234, 216, 0.55)' }}>Critical CD Blocks</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: stateSummary.criticalCount > 0 ? '#ef4444' : '#22c55e' }}>
                    {stateSummary.criticalCount}
                  </div>
                  <div style={{ fontSize: '8px', color: 'rgba(245, 234, 216, 0.40)' }}>of 314 blocks</div>
                </div>

                <div>
                  <div style={{ fontSize: '8.5px', color: 'rgba(245, 234, 216, 0.55)' }}>Max WBGT Index</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f5ead8' }}>
                    {formatTemp(stateSummary.maxWbgt)}
                  </div>
                  <div style={{ fontSize: '8px', color: 'rgba(245, 234, 216, 0.40)' }}>Wet Bulb Globe</div>
                </div>

                <div>
                  <div style={{ fontSize: '8.5px', color: 'rgba(245, 234, 216, 0.55)' }}>Exposed Population</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f5ead8' }}>
                    {formatPop(stateSummary.totalExposedPop)}
                  </div>
                  <div style={{ fontSize: '8px', color: 'rgba(245, 234, 216, 0.40)' }}>In High+ Risk Blocks</div>
                </div>
              </div>
            </div>

            {/* DISTRICT FILTER DROPDOWN */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 700, color: '#ea9b7a', textTransform: 'uppercase', marginBottom: '4px' }}>
                Filter By District
              </label>
              <select
                value={districtFilter}
                onChange={e => onFilterDistrict(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: '#021a07',
                  border: '1px solid rgba(234, 155, 122, 0.30)',
                  color: '#f5ead8',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <option value="">All 30 Districts</option>
                {districtsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* TOP HIGH-RISK CD BLOCKS (AUTHENTIC REAL DATA) */}
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#ea9b7a', textTransform: 'uppercase', marginBottom: '6px' }}>
                Top High-Risk CD Blocks
              </div>

              {topBlocks.map(b => (
                <div
                  key={b.block_id}
                  onClick={() => onSelectBlock(b)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    marginBottom: '5px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.10)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(234, 155, 122, 0.4)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.10)')}
                >
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f5ead8' }}>
                      {b.block_name}
                    </div>
                    <div style={{ fontSize: '8.5px', color: 'rgba(245, 234, 216, 0.50)' }}>
                      {b.district_name} · Pop {formatPop(b.population)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#ea9b7a' }}>
                      {formatTemp(b.thermal_value ?? b.heat_index)}
                    </div>
                    <div
                      style={{
                        fontSize: '7.5px',
                        fontWeight: 700,
                        color: getThermalTierColor(b.thermal_stress_level),
                      }}
                    >
                      {b.thermal_stress_level}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', fontSize: '9px', color: 'rgba(245, 234, 216, 0.40)', textAlign: 'center' }}>
              Click any CD block on the map to inspect full biophysical conditions.
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
