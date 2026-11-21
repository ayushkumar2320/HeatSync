import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, AlertTriangle, Users, HeartPulse, Activity,
  PhoneCall, MapPin, Download, Copy, Check, RefreshCw,
  Flame, Wind, Droplets, Sun, Compass, Building2, Zap,
  FileCode, CheckCircle2, Info
} from 'lucide-react';
import {
  fetchActiveAlert,
  fetchCoolingShelters,
  fetchCapXmlText,
  getCapXmlUrl
} from '../services/alertService';
import '../styles/alert-centre.css';

export function AlertCentrePage({ liveWeather, airQuality }) {
  const [alertData, setAlertData] = useState(null);
  const [shelters, setShelters] = useState([]);
  const [capXml, setCapXml] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState('citizen'); // 'citizen' | 'technical'
  const [copied, setCopied] = useState(false);
  const [shelterFilter, setShelterFilter] = useState('ALL');

  const loadAllAlertData = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch active alert
      const res = await fetchActiveAlert(null, null, 'Bhubaneswar Urban Agglomeration', force);
      if (res?.success && res.alert) {
        setAlertData(res.alert);
      }

      // 2. Fetch shelters
      const shelterRes = await fetchCoolingShelters(null, null, 10);
      if (shelterRes?.success && shelterRes.shelters) {
        setShelters(shelterRes.shelters);
      }

      // 3. Fetch raw CAP XML preview
      const xml = await fetchCapXmlText();
      setCapXml(xml);
    } catch (err) {
      console.warn('AlertCentrePage: Failed to fetch alert data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllAlertData(false);
  }, [loadAllAlertData]);

  const handleCopyXml = async () => {
    if (!capXml) return;
    try {
      await navigator.clipboard.writeText(capXml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy XML to clipboard', err);
    }
  };

  const handleDownloadXml = () => {
    if (!capXml) return;
    const blob = new Blob([capXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatsync_cap_v12_alert_${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredShelters = shelters.filter(s => {
    if (shelterFilter === 'ALL') return true;
    if (shelterFilter === 'HOSPITAL') return s.type === 'HOSPITAL_HEAT_UNIT';
    if (shelterFilter === 'CIVIC') return s.type === 'CIVIC_COOLING';
    if (shelterFilter === 'SHADE') return s.type === 'NATURAL_SHADE';
    return true;
  });

  if (loading && !alertData) {
    return (
      <div className="hs-page-loader">
        <div className="hs-page-loader-spinner" />
        <span className="hs-label">Initializing Disaster Alert Centre...</span>
      </div>
    );
  }

  const tier = alertData?.tier || 'ELEVATED';
  const tierColor = alertData?.tier_color || '#E67E22';
  const tierBg = alertData?.tier_bg_color || 'rgba(230, 126, 34, 0.12)';
  const biophysical = alertData?.biophysical || {};
  const compound = alertData?.compound_hazard || {};
  const layman = alertData?.citizen_layman || {};
  const technical = alertData?.analyst_technical || {};

  return (
    <div className="ac-container">
      {/* 1. Header Bar */}
      <header className="ac-header">
        <div className="ac-title-wrap">
          <div className="ac-badge-row">
            <span className="ac-subhead-pill">DISASTER MANAGEMENT & CIVIL PROTECTION</span>
            <span style={{ fontSize: '11px', color: 'var(--hs-text-muted)' }}>
              ITU-T CAP v1.2 Protocol Compliant
            </span>
          </div>
          <h1 className="ac-title">Civil Protection & Early Warning Centre</h1>
          <p className="ac-desc">
            Real-time heatwave dispatch, multi-hazard biophysical diagnostics, and public safety advisories for the Bhubaneswar Urban Agglomeration.
          </p>
        </div>

        <div className="ac-actions">
          {/* Dual-Mode Citizen vs Technical Toggle */}
          <div className="ac-mode-switch" role="tablist">
            <button
              className={`ac-mode-btn ${mode === 'citizen' ? 'active' : ''}`}
              onClick={() => setMode('citizen')}
              role="tab"
              aria-selected={mode === 'citizen'}
            >
              <Users size={14} />
              <span>Citizen Layman</span>
            </button>
            <button
              className={`ac-mode-btn ${mode === 'technical' ? 'active' : ''}`}
              onClick={() => setMode('technical')}
              role="tab"
              aria-selected={mode === 'technical'}
            >
              <Activity size={14} />
              <span>Analyst Technical</span>
            </button>
          </div>

          <button
            className="ac-btn-icon"
            onClick={() => loadAllAlertData(true)}
            disabled={refreshing}
            title="Refresh Live Alert Feed"
          >
            <RefreshCw size={13} className={refreshing ? 'hs-spin' : ''} />
            <span>{refreshing ? 'Updating…' : 'Live Refresh'}</span>
          </button>
        </div>
      </header>

      {/* 2. Hero Alert Tier Card */}
      <section
        className="ac-hero-card"
        style={{
          backgroundColor: tierBg,
          borderColor: tierColor,
        }}
      >
        <div className="ac-hero-top">
          <div>
            <div
              className="ac-tier-chip"
              style={{
                backgroundColor: 'rgba(0,0,0,0.4)',
                color: tierColor,
                border: `1px solid ${tierColor}`,
              }}
            >
              <span className="ac-pulsing-dot" style={{ backgroundColor: tierColor }} />
              <span>{alertData?.tier_label || 'ACTIVE HEAT ALERT'}</span>
            </div>
            <h2 className="ac-hero-headline">{alertData?.headline}</h2>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--hs-text-muted)' }}>Target Jurisdiction</span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Bhubaneswar, Odisha</div>
            <span style={{ fontSize: '11px', color: 'var(--hs-text-muted)' }}>
              Updated: {alertData?.generated_at ? new Date(alertData.generated_at).toLocaleTimeString() : 'Just now'}
            </span>
          </div>
        </div>

        {/* Compound Hazard Banner (Heat + AQI) */}
        {compound.active && (
          <div className="ac-compound-banner">
            <AlertTriangle size={22} className="ac-compound-icon" />
            <div>
              <strong style={{ display: 'block', color: '#fff', fontSize: '14px' }}>
                COMPOUND MULTI-HAZARD DETECTED
              </strong>
              <span>{compound.clinical_warning}</span>
            </div>
          </div>
        )}

        {/* Live Biophysical Quick-Tiles */}
        <div className="ac-metrics-grid">
          <div className="ac-metric-tile">
            <span className="ac-metric-tile-label">Wet-Bulb Globe (WBGT)</span>
            <span className="ac-metric-tile-val" style={{ color: tierColor }}>
              {biophysical.wbgt_c != null ? `${biophysical.wbgt_c}°C` : '—'}
            </span>
            <span className="ac-metric-tile-sub">ISO 7243 Composite</span>
          </div>

          <div className="ac-metric-tile">
            <span className="ac-metric-tile-label">Air Temperature</span>
            <span className="ac-metric-tile-val">
              {biophysical.air_temperature_c != null ? `${biophysical.air_temperature_c}°C` : '—'}
            </span>
            <span className="ac-metric-tile-sub">Dry-Bulb Ambient</span>
          </div>

          <div className="ac-metric-tile">
            <span className="ac-metric-tile-label">Rothfusz Heat Index</span>
            <span className="ac-metric-tile-val" style={{ color: '#f59e0b' }}>
              {biophysical.heat_index_c != null ? `${biophysical.heat_index_c}°C` : '—'}
            </span>
            <span className="ac-metric-tile-sub">Apparent 'Feels Like'</span>
          </div>

          <div className="ac-metric-tile">
            <span className="ac-metric-tile-label">Relative Humidity</span>
            <span className="ac-metric-tile-val">
              {biophysical.relative_humidity_pct != null ? `${biophysical.relative_humidity_pct}%` : '—'}
            </span>
            <span className="ac-metric-tile-sub">Moisture Saturation</span>
          </div>

          <div className="ac-metric-tile">
            <span className="ac-metric-tile-label">Particulate PM2.5</span>
            <span
              className="ac-metric-tile-val"
              style={{ color: biophysical.pm25_ugm3 >= 60 ? '#ef4444' : 'var(--hs-cyan)' }}
            >
              {biophysical.pm25_ugm3 != null ? `${biophysical.pm25_ugm3} µg/m³` : 'N/A'}
            </span>
            <span className="ac-metric-tile-sub">
              {biophysical.pm25_ugm3 >= 60 ? 'Exceeds NAAQS' : 'Within Limit'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Main Content: Dual-Mode Body */}
      <div className="ac-content-grid">
        {/* LEFT COLUMN: Citizen View OR Technical View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hs-space-6)' }}>
          {mode === 'citizen' ? (
            /* ================= CITIZEN LAYMAN MODE ================= */
            <>
              {/* Why is it dangerous */}
              <div className="ac-card">
                <div className="ac-card-head">
                  <h3 className="ac-card-title">
                    <Info size={17} color="var(--hs-cyan)" />
                    <span>Why is this Heatwave Dangerous?</span>
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: tierColor }}>
                    {layman.risk_assessment}
                  </span>
                </div>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--hs-text-primary)', margin: 0 }}>
                  {layman.why_is_it_dangerous}
                </p>
              </div>

              {/* 5 Critical Action Steps */}
              <div className="ac-card">
                <div className="ac-card-head">
                  <h3 className="ac-card-title">
                    <CheckCircle2 size={17} color="#22c55e" />
                    <span>5 Immediate Citizen Protection Guidelines</span>
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--hs-text-muted)' }}>
                    BMC / NDMA Public Safety Advisory
                  </span>
                </div>
                <div className="ac-steps-list">
                  {layman.five_action_steps?.map((step, idx) => (
                    <div key={idx} className="ac-step-item">
                      <span className="ac-step-num">{idx + 1}</span>
                      <span className="ac-step-text">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* High-Risk Demographics */}
              <div className="ac-card">
                <div className="ac-card-head">
                  <h3 className="ac-card-title">
                    <Users size={17} color="#f59e0b" />
                    <span>Who is Most Vulnerable?</span>
                  </h3>
                </div>
                <div className="ac-vuln-grid">
                  {layman.who_is_at_risk?.map((item, idx) => (
                    <div key={idx} className="ac-vuln-card">
                      <HeartPulse size={16} color="#f59e0b" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Helplines */}
              <div className="ac-card">
                <div className="ac-card-head">
                  <h3 className="ac-card-title">
                    <PhoneCall size={17} color="var(--hs-cyan)" />
                    <span>Emergency Numbers & Heatstroke Helplines</span>
                  </h3>
                </div>
                <div className="ac-contacts-grid">
                  {layman.emergency_hotlines &&
                    Object.entries(layman.emergency_hotlines).map(([lbl, num]) => (
                      <div key={lbl} className="ac-contact-card">
                        <span className="ac-contact-num">{num}</span>
                        <span className="ac-contact-label">{lbl}</span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            /* ================= ANALYST TECHNICAL MODE ================= */
            <>
              {/* Biophysical Diagnostics Matrix */}
              <div className="ac-card">
                <div className="ac-card-head">
                  <h3 className="ac-card-title">
                    <Activity size={17} color="var(--hs-cyan)" />
                    <span>Biophysical Diagnostic Measurements</span>
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--hs-text-muted)' }}>
                    ACGIH & COST 730 Protocols
                  </span>
                </div>
                <div className="ac-diag-table">
                  <div className="ac-diag-row">
                    <span className="ac-diag-label">Wet-Bulb Globe Temperature (WBGT)</span>
                    <span className="ac-diag-val" style={{ color: tierColor }}>
                      {biophysical.wbgt_c}°C ({technical.biophysical_diagnostics?.heat_strain_category})
                    </span>
                  </div>
                  <div className="ac-diag-row">
                    <span className="ac-diag-label">Universal Thermal Climate Index (UTCI)</span>
                    <span className="ac-diag-val">
                      {technical.biophysical_diagnostics?.utci_thermal_stress}
                    </span>
                  </div>
                  <div className="ac-diag-row">
                    <span className="ac-diag-label">Rothfusz Apparent Heat Index</span>
                    <span className="ac-diag-val">
                      {technical.biophysical_diagnostics?.rothfusz_index}
                    </span>
                  </div>
                  <div className="ac-diag-row">
                    <span className="ac-diag-label">Stull (2011) Wet-Bulb (°C)</span>
                    <span className="ac-diag-val">{biophysical.stull_wet_bulb_c}°C</span>
                  </div>
                  <div className="ac-diag-row">
                    <span className="ac-diag-label">Solar Radiation Flux</span>
                    <span className="ac-diag-val">{biophysical.solar_radiation_wm2} W/m²</span>
                  </div>
                  <div className="ac-diag-row">
                    <span className="ac-diag-label">Near-Surface Wind Speed (10m log proxy)</span>
                    <span className="ac-diag-val">{biophysical.wind_speed_ms} m/s</span>
                  </div>
                </div>
              </div>

              {/* DISCOM & Hospital Surge Triggers */}
              <div className="ac-card">
                <div className="ac-card-head">
                  <h3 className="ac-card-title">
                    <Zap size={17} color="#f59e0b" />
                    <span>Critical Infrastructure Impact Triggers</span>
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hs-space-4)' }}>
                  <div className="ac-matrix-card" style={{ borderLeftColor: '#f59e0b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'var(--hs-text-muted)' }}>
                        DISCOM POWER GRID LOAD
                      </span>
                      <span className="ac-matrix-status" style={{ color: '#f59e0b' }}>
                        {technical.discom_grid_impact?.grid_strain_level}
                      </span>
                    </div>
                    <span className="ac-matrix-action">
                      {technical.discom_grid_impact?.recommended_action}
                    </span>
                  </div>

                  <div className="ac-matrix-card" style={{ borderLeftColor: '#ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'var(--hs-text-muted)' }}>
                        HOSPITAL EMERGENCY SURGE
                      </span>
                      <span className="ac-matrix-status" style={{ color: '#ef4444' }}>
                        {technical.hospital_triage_matrix?.clinical_alert_level}
                      </span>
                    </div>
                    <span className="ac-matrix-action">
                      {technical.hospital_triage_matrix?.health_department_action}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scientific Provenance */}
              <div className="ac-card">
                <div className="ac-card-head">
                  <h3 className="ac-card-title">
                    <Compass size={17} color="var(--hs-cyan)" />
                    <span>Scientific Lineage & Regulatory Integrity</span>
                  </h3>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--hs-text-secondary)', lineHeight: '1.6' }}>
                  <div><strong>Standard:</strong> {technical.scientific_provenance?.compliance}</div>
                  <div><strong>Biophysical Model:</strong> {technical.scientific_provenance?.wbgt_formula}</div>
                  <div><strong>Data Lineage:</strong> {technical.scientific_provenance?.data_lineage}</div>
                  <div style={{ marginTop: '8px', color: 'var(--hs-text-muted)', fontSize: '11.5px' }}>
                    Strict Zero Synthetic Mortality Rule: Heatstroke counts are never simulated; alerts reflect environmental thermodynamic hazard only.
                  </div>
                </div>
              </div>
            </>
          )}

          {/* OASIS CAP v1.2 XML Live Feed Section (Visible on both modes) */}
          <div className="ac-card">
            <div className="ac-card-head">
              <h3 className="ac-card-title">
                <FileCode size={17} color="var(--hs-cyan)" />
                <span>OASIS / ITU-T CAP v1.2 XML Feed</span>
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="ac-btn-icon" onClick={handleCopyXml}>
                  {copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied XML!' : 'Copy XML'}</span>
                </button>
                <button className="ac-btn-icon" onClick={handleDownloadXml}>
                  <Download size={13} />
                  <span>Download .xml</span>
                </button>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--hs-text-secondary)', margin: 0 }}>
              Live XML payload adhering to ITU-T Recommendation X.1303 for direct syndication to NDMA Sachak, OSDMA, and IMD Early Warning Networks.
            </p>
            <div className="ac-xml-box">{capXml || '<!-- Generating CAP v1.2 XML Payload... -->'}</div>
          </div>
        </div>

        {/* RIGHT COLUMN: Cooling Shelters Directory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hs-space-6)' }}>
          <div className="ac-card">
            <div className="ac-card-head">
              <h3 className="ac-card-title">
                <MapPin size={17} color="var(--hs-cyan)" />
                <span>Cooling Shelters & Triage</span>
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--hs-text-muted)' }}>
                {filteredShelters.length} Designated Spots
              </span>
            </div>

            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: 'All' },
                { key: 'HOSPITAL', label: 'Triage Units' },
                { key: 'CIVIC', label: 'Misting Kiosks' },
                { key: 'SHADE', label: 'Green Canopy' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setShelterFilter(f.key)}
                  style={{
                    padding: '3px 9px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: 'var(--hs-radius-full)',
                    border: '1px solid var(--hs-border-subtle)',
                    background: shelterFilter === f.key ? 'var(--hs-cyan)' : 'var(--hs-bg-secondary)',
                    color: shelterFilter === f.key ? '#04060d' : 'var(--hs-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Shelters List */}
            <div className="ac-shelters-list">
              {filteredShelters.map(shelter => (
                <div key={shelter.id} className="ac-shelter-card">
                  <div className="ac-shelter-top">
                    <div>
                      <h4 className="ac-shelter-name">{shelter.name}</h4>
                      <span style={{ fontSize: '11.5px', color: 'var(--hs-text-muted)' }}>
                        {shelter.address}
                      </span>
                    </div>
                    {shelter.distance_km != null && (
                      <span className="ac-shelter-dist">{shelter.distance_km} km</span>
                    )}
                  </div>

                  <div className="ac-shelter-amenities">
                    {shelter.amenities?.map((amenity, idx) => (
                      <span key={idx} className="ac-amenity-tag">
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--hs-text-secondary)' }}>
                      Hours: {shelter.open_hours}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--hs-cyan)', fontWeight: 600 }}>
                      📞 {shelter.contact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertCentrePage;
