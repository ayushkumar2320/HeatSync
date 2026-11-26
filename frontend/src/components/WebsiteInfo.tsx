import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar, glassBase } from './Sidebar';
import { BauhausBackground } from './ExploreOdisha';
import { DataSourceBanner } from './DataSourceBanner';
import { MANDATORY_HEALTH_DISCLAIMER } from '../contracts/healthModelContract';
import { THERMAL_THRESHOLDS } from '../contracts/thermalRiskContract';

const glassCard: React.CSSProperties = {
  ...glassBase,
  borderRadius: '16px',
  padding: '20px',
};

// Content Sections
const SECTIONS = [
  { id: 'overview', label: '🌡 Overview', icon: '🌡' },
  { id: 'methodology', label: '🔬 Methodology', icon: '🔬' },
  { id: 'scale', label: '📊 Risk Scale', icon: '📊' },
  { id: 'provenance', label: '📡 Data Provenance', icon: '📡' },
  { id: 'health', label: '⚠ Health Policy', icon: '⚠' },
  { id: 'architecture', label: '🏗 Architecture', icon: '🏗' },
];

const FORMULA_SECTIONS = [
  {
    title: 'Rothfusz Heat Index (NWS)',
    subtitle: 'Primary operational thermal exposure metric',
    formula: 'HI = −42.379 + 2.04901523·T + 10.14333127·RH − 0.22475541·T·RH − 6.83783×10⁻³·T² − 5.481717×10⁻²·RH² + 1.22874×10⁻³·T²·RH + 8.5282×10⁻⁴·T·RH² − 1.99×10⁻⁶·T²·RH²',
    note: 'T = Temperature (°F); RH = Relative Humidity (%). Includes Steadman low-RH and high-RH adjustments. Valid for T ≥ 80°F (26.7°C) and HI ≥ 80°F.',
    color: '#f59e0b',
  },
  {
    title: 'Stull Psychrometric WBGT (Simplified)',
    subtitle: 'Wet-Bulb Globe Temperature via Stull (2011)',
    formula: 'T_w = T · atan(0.151977·√(RH + 8.313659)) + atan(T + RH) − atan(RH − 1.676331) + 0.00391838·RH^(3/2)·atan(0.023101·RH) − 4.686035',
    note: 'T_w = Wet-bulb temperature (°C). WBGT ≈ 0.7·T_w + 0.2·T_globe + 0.1·T_dry. Valid for T: −20°C to 50°C, RH: 5% to 99%.',
    color: '#22c55e',
  },
  {
    title: 'COST Action 730 UTCI Operational Proxy',
    subtitle: 'Universal Thermal Climate Index (Operational Formulation)',
    formula: 'UTCI_approx = T + 0.33·(e / 10) − 0.7·v₁₀ − 4.0 + 0.1·ΔT_rad',
    note: 'e = vapour pressure (hPa) via Tetens; v₁₀ = wind speed adjusted to 10m log-law; ΔT_rad = solar radiation proxy. Fast operational proxy designed for CD block streaming without 210-term polynomial computational latency.',
    color: '#a855f7',
  },
];

const PIPELINE_STEPS = [
  { label: 'IMD Station Data', desc: 'Raw synoptic observations from IMD ground stations across Odisha', color: '#38bdf8' },
  { label: 'Quality Control', desc: 'Automated QC flags: range checks, spatial consistency, temporal drift', color: '#22c55e' },
  { label: 'GIS Join', desc: 'Point-to-polygon spatial join: station → CD Block (314 blocks, BLOCK_ID key)', color: '#ea9b7a' },
  { label: 'Biophysical Engine', desc: 'Rothfusz HI + Stull WBGT + UTCI polynomial on each block for each day', color: '#f59e0b' },
  { label: 'ML Forecasting', desc: 'XGBoost + LSTM ensemble, 7 direct multi-horizon models (T+1 to T+7)', color: '#f97316' },
  { label: 'Risk Classification', desc: '5-tier deterministic classification applied to Heat Index output', color: '#ef4444' },
  { label: 'Alert Generation', desc: 'CAP v1.2 XML alerts for HIGH, DANGER, and LETHAL tier blocks', color: '#a855f7' },
];

export default function WebsiteInfo() {
  const [activeSection, setActiveSection] = useState('overview');

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
      <Sidebar currentPath="/website-info" />

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
          Project · Methodology · Ethics
        </div>
        <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: 'rgba(234,155,122,0.65)', textTransform: 'uppercase', marginTop: '2px' }}>
          Scientific Documentation · Biophysical Formulas · Data Architecture · Ethical Governance
        </div>
      </motion.div>

      {/* Main Layout */}
      <div style={{
        position: 'absolute', inset: 0, top: '60px', bottom: '12px',
        display: 'flex', flexDirection: 'row', alignItems: 'stretch',
        padding: '0 16px', gap: '12px', zIndex: 10,
      }}>
        {/* Sidebar space */}
        <div style={{ width: '60px', flexShrink: 0 }} />

        {/* Section Nav */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}
        >
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: '12px',
                border: `1px solid ${activeSection === s.id ? 'rgba(234,155,122,0.5)' : 'rgba(255,255,255,0.07)'}`,
                background: activeSection === s.id ? 'rgba(234,155,122,0.12)' : 'rgba(255,255,255,0.03)',
                color: activeSection === s.id ? '#ea9b7a' : 'rgba(245,234,216,0.65)',
                fontSize: '12px', fontWeight: activeSection === s.id ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <AnimatePresence mode="wait">
            {activeSection === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={glassCard}>
                  <h2 style={{ color: '#ea9b7a', fontSize: '1.2rem', fontWeight: 800, marginBottom: '12px' }}>HeatX — Odisha Heatwave Early Warning System</h2>
                  <p style={{ fontSize: '13px', color: 'rgba(245,234,216,0.8)', lineHeight: 1.7 }}>
                    HeatX is an operational real-time Heatwave Early Warning and Human Thermal Stress Index system for the state of Odisha, India.
                    It integrates authoritative GIS data (314 CD Blocks, 30 Districts, 182 Tehsils, 155,198 1-km grid cells), a deterministic biophysical thermal engine,
                    multi-horizon ML forecasting, and a live meteorological observation pipeline.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px' }}>
                    {[
                      { icon: '🗺', label: '314 CD Blocks', sub: 'Full Odisha coverage' },
                      { icon: '📅', label: '15-Day Timeline', sub: 'D-7 to T+7 window' },
                      { icon: '🤖', label: 'ML Forecasts', sub: '7 direct horizons' },
                      { icon: '🌡', label: 'Biophysical', sub: 'HI + WBGT + UTCI' },
                      { icon: '⚡', label: 'Live Obs', sub: 'Real-time ingestion' },
                      { icon: '🔔', label: 'CAP v1.2', sub: 'Standard alerts' },
                    ].map(f => (
                      <div key={f.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{f.icon}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#f5ead8' }}>{f.label}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(245,234,216,0.5)', marginTop: '2px' }}>{f.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={glassCard}>
                  <h3 style={{ color: '#ea9b7a', fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>Operational Key: BLOCK_ID</h3>
                  <p style={{ fontSize: '12px', color: 'rgba(245,234,216,0.7)', lineHeight: 1.6 }}>
                    All thermal data, forecasts, alerts, grid cells, and observations are keyed by the authoritative <strong style={{ color: '#f5ead8' }}>BLOCK_ID</strong> — a unique string identifier
                    for each of Odisha's 314 Community Development Blocks. This ensures stable joins across GIS, meteorological, demographic, and ML forecast data layers.
                  </p>
                  <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: '#22c55e' }}>
                    BLOCK_ID → "OD_KHO_BHUBANESWAR_M"<br />
                    district_name → "Khorda"<br />
                    block_name → "Bhubaneswar (M)"<br />
                    population → 837737<br />
                    area_sqkm → 135.4
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'methodology' && (
              <motion.div key="methodology" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ ...glassCard, padding: '16px' }}>
                  <h2 style={{ color: '#ea9b7a', fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px' }}>Biophysical Methodology</h2>
                  <div style={{ fontSize: '12px', color: 'rgba(245,234,216,0.65)', marginBottom: '16px', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(234,155,122,0.2)' }}>
                    <strong style={{ color: '#ea9b7a' }}>Strict Air Temp vs Heat Index Distinction:</strong> All thermal exposure metrics are derived from the biophysical indices (Heat Index, WBGT, UTCI),
                    not raw air temperature. Air temperature is a meteorological input variable, not a proxy for human thermal stress.
                  </div>
                  {FORMULA_SECTIONS.map(f => (
                    <div key={f.title} style={{ marginBottom: '16px', borderLeft: `3px solid ${f.color}`, paddingLeft: '14px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, color: f.color, marginBottom: '4px' }}>{f.title}</h3>
                      <div style={{ fontSize: '11px', color: 'rgba(245,234,216,0.55)', marginBottom: '8px' }}>{f.subtitle}</div>
                      <div style={{
                        background: 'rgba(0,0,0,0.35)', borderRadius: '8px', padding: '10px 12px',
                        fontFamily: 'monospace', fontSize: '10.5px', color: f.color, whiteSpace: 'pre-wrap', lineHeight: 1.6,
                      }}>
                        {f.formula}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(245,234,216,0.5)', marginTop: '6px', lineHeight: 1.5 }}>{f.note}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeSection === 'scale' && (
              <motion.div key="scale" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={glassCard}>
                <h2 style={{ color: '#ea9b7a', fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>5-Tier Thermal Stress Scale</h2>
                <div style={{ fontSize: '12px', color: 'rgba(245,234,216,0.65)', marginBottom: '16px' }}>
                  HeatX uses a deterministic 5-tier thermal risk classification based on the NWS Rothfusz Heat Index output.
                  Thresholds are operationally fixed and cannot be adjusted without formal scientific review.
                </div>
                {THERMAL_THRESHOLDS.map((tier, i) => (
                  <div key={tier.tier} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '14px', marginBottom: '8px',
                    borderRadius: '12px',
                    background: `${tier.color}14`,
                    border: `1px solid ${tier.color}40`,
                  }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '10px',
                      background: tier.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', fontWeight: 900, color: '#fff', flexShrink: 0,
                    }}>
                      {['🟢', '🟡', '🟠', '🔴', '🟣'][i]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: tier.color }}>{tier.label}</span>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, color: '#fff',
                          background: tier.color, borderRadius: '6px', padding: '2px 8px',
                        }}>{tier.text}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(245,234,216,0.7)', lineHeight: 1.5 }}>
                        {['Baseline thermal conditions. Negligible biophysical heat strain.',
                          'Elevated caution. Fatigue possible with prolonged outdoor physical labor.',
                          'Substantial heat strain. Work-rest cycles and hydration advisories active.',
                          'Dangerous heat load. High risk of heat exhaustion for outdoor populations.',
                          'Life-threatening. Emergency heatwave conditions. Immediate action required.'][i]}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeSection === 'provenance' && (
              <motion.div key="provenance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={glassCard}>
                  <h2 style={{ color: '#ea9b7a', fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px' }}>Data Provenance & Pipeline Architecture</h2>
                  <div style={{ position: 'relative', paddingLeft: '24px' }}>
                    {PIPELINE_STEPS.map((step, i) => (
                      <div key={step.label} style={{ marginBottom: '16px', position: 'relative' }}>
                        {i < PIPELINE_STEPS.length - 1 && (
                          <div style={{
                            position: 'absolute', left: '-17px', top: '20px',
                            width: '2px', height: 'calc(100% + 4px)',
                            background: `linear-gradient(to bottom, ${step.color}80, ${PIPELINE_STEPS[i + 1].color}50)`,
                          }} />
                        )}
                        <div style={{
                          position: 'absolute', left: '-22px', top: '6px',
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: step.color, border: '2px solid rgba(3,47,12,1)',
                        }} />
                        <div style={{ borderRadius: '10px', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${step.color}30` }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: step.color, marginBottom: '4px' }}>
                            {i + 1}. {step.label}
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(245,234,216,0.65)', lineHeight: 1.5 }}>{step.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ ...glassCard, fontSize: '12px', color: 'rgba(245,234,216,0.7)', lineHeight: 1.6 }}>
                  <h3 style={{ color: '#ea9b7a', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>GIS Data Sources</h3>
                  <ul style={{ paddingLeft: '16px', margin: 0 }}>
                    <li>Odisha State & District Boundaries: Survey of India / OSDMA shapefiles</li>
                    <li>CD Block Boundaries: MoRD / Bhuvan LGD-coded GeoJSON (314 features, topologically corrected)</li>
                    <li>1-km Grid: Custom 155,198-cell grid derived from SRTM elevation & LGD boundary intersection</li>
                    <li>Population: Census 2011 (Official) + UNFPA 2023 projection at CD Block level</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {activeSection === 'health' && (
              <motion.div key="health" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ ...glassCard, border: '1px solid rgba(239,68,68,0.4)' }}>
                  <h2 style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>⚠ Mandatory Health Model Boundary</h2>
                  <div style={{
                    background: 'rgba(239,68,68,0.12)',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid rgba(239,68,68,0.3)',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#fca5a5',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {MANDATORY_HEALTH_DISCLAIMER}
                  </div>
                  <div style={{ marginTop: '14px', fontSize: '12px', color: 'rgba(245,234,216,0.7)', lineHeight: 1.7 }}>
                    <p><strong style={{ color: '#f5ead8' }}>What HeatX IS:</strong> An environmental and meteorological risk mapping system that estimates human thermal exposure using biophysical models.
                    It identifies CD Blocks where outdoor populations may experience elevated thermal stress based on meteorological conditions.</p>
                    <p style={{ marginTop: '8px' }}><strong style={{ color: '#f5ead8' }}>What HeatX IS NOT:</strong> A clinical medical diagnostic system. HeatX outputs are not validated against health outcome data (hospital admissions, heatstroke mortality, or morbidity statistics).
                    The &quot;public health attention proxy&quot; labels are environmental risk indicators, not clinical assessments.</p>
                  </div>
                </div>

                <div style={{ ...glassCard }}>
                  <h3 style={{ color: '#ea9b7a', fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>Ethical Governance Principles</h3>
                  {[
                    ['Transparency', 'All model limitations, data gaps, and provenance are explicitly documented in every API response and UI panel.'],
                    ['Non-Maleficence', 'HeatX outputs must not be used as the sole basis for individual clinical decisions or emergency medical triage.'],
                    ['Scientific Integrity', 'Biophysical formulas follow peer-reviewed publications (Rothfusz 1990, Stull 2011, Fiala 2012). No proprietary models.'],
                    ['Data Sovereignty', 'All GIS and census data are sourced from authoritative Indian government sources. No foreign commercial geolocation APIs.'],
                    ['Offline Resilience', 'Zero external tile dependencies. All GIS layers are served from local SQLite + GeoJSON assets.'],
                  ].map(([title, desc]) => (
                    <div key={title} style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#22c55e', fontSize: '14px', flexShrink: 0 }}>✓</span>
                      <div>
                        <strong style={{ fontSize: '12px', color: '#f5ead8' }}>{title}</strong>
                        <div style={{ fontSize: '11px', color: 'rgba(245,234,216,0.6)', lineHeight: 1.5, marginTop: '2px' }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeSection === 'architecture' && (
              <motion.div key="architecture" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={glassCard}>
                  <h2 style={{ color: '#ea9b7a', fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px' }}>System Architecture</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { title: 'Frontend', items: ['React 19 + TypeScript + Vite 8', 'Leaflet (offline vector GIS)', 'Recharts (biophysical charts)', 'Three.js (3D Earth Globe)', 'Framer Motion (micro-animations)', 'Tailwind CSS v4 (utility layer)'] },
                      { title: 'Backend', items: ['FastAPI (Python 3.12)', 'SQLite (operational data store)', 'SQLAlchemy (ORM layer)', 'Pandas + NumPy (data processing)', 'Scikit-learn + XGBoost (ML)', 'Uvicorn (ASGI server)'] },
                      { title: 'GIS', items: ['314 CD Block GeoJSON (8.5 MB)', '182 Subdistrict boundaries', '30 District boundaries', '1-km grid (155,198 cells)', 'Topologically corrected — zero gaps', 'Centroid lookup table (130 KB)'] },
                      { title: 'Data Flow', items: ['Offline-first with backend fallback', 'StrictMode-safe React lifecycle', 'AbortController for async guards', 'BLOCK_ID as universal join key', 'CAP v1.2 alert XML generation', '15-day rolling data window'] },
                    ].map(section => (
                      <div key={section.title} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#ea9b7a', marginBottom: '8px', borderBottom: '1px solid rgba(234,155,122,0.2)', paddingBottom: '6px' }}>
                          {section.title}
                        </div>
                        {section.items.map(item => (
                          <div key={item} style={{ fontSize: '11px', color: 'rgba(245,234,216,0.7)', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                            <span style={{ color: '#4a8c5c', flexShrink: 0 }}>›</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ ...glassCard, fontSize: '11px', fontFamily: 'monospace', color: 'rgba(245,234,216,0.65)' }}>
                  <div style={{ color: '#ea9b7a', fontWeight: 700, marginBottom: '8px', fontFamily: "'Inter', sans-serif", fontSize: '12px' }}>Project Layout</div>
                  <pre style={{ margin: 0, lineHeight: 1.8, fontSize: '11px' }}>
{`E:\\HeatX\\
├── backend/           FastAPI Python backend
│   ├── routes/        API route handlers
│   ├── services/      Business logic & ML
│   └── models/        SQLAlchemy ORM models
├── gis/               GIS data & processing
├── HeatX-forntend/    React + TypeScript frontend
│   ├── public/data/   GeoJSON & static assets
│   ├── src/
│   │   ├── components/   UI components
│   │   ├── contracts/    Data contracts & validators
│   │   ├── adapters/     Data adapters
│   │   ├── services/     API client services
│   │   ├── utils/        Biophysical engine + helpers
│   │   └── types/        TypeScript interfaces
│   └── package.json
└── frontend/          Legacy frontend (archived)`}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
