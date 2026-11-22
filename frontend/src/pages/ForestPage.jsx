import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TreePine, Leaf, Sprout, ThermometerSun, MapPin,
  Search, Loader2, AlertTriangle,
  Target, Shield, TrendingDown, TrendingUp,
  Info, Crosshair, Eye, Layers, Sparkles, RotateCcw,
  Wind, Heart
} from 'lucide-react';
import { fetchCityPoint, fetchCoolingPotential, fetchInterventions, fetchExplain } from '../services/cityClient';
import { fetchScenarios, runCurrentScenario } from '../services/backendClient';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */



const VEG_DENSITY_LABELS = { 1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High' };
const LANDCOVER_LABELS = { 1: 'Water', 2: 'Vegetation', 3: 'Built-up', 4: 'Bare Land' };

const LOSS_SCENARIOS = [
  { key: 'decrease_buildings_10', label: 'Light Urbanization', desc: '10% building increase', icon: Layers, color: '#f97316' },
  { key: 'decrease_buildings_20', label: 'Heavy Urbanization', desc: '20% building increase', icon: Layers, color: '#ef4444' },
];

const RESTORE_SCENARIOS = [
  { key: 'increase_green_10', label: 'Light Greening', desc: '10% green cover increase', icon: Leaf, color: '#22c55e' },
  { key: 'increase_green_20', label: 'Heavy Greening', desc: '20% green cover increase', icon: Sprout, color: '#16a34a' },
  { key: 'increase_trees', label: 'Tree Planting', desc: 'Add 50 trees per cell', icon: TreePine, color: '#15803d' },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const fmt = (v, d = 1) => (v === null || v === undefined || Number.isNaN(v)) ? '—' : Number(v).toFixed(d);
const fmtPct = (v) => fmt(v, 0);
const fmtTemp = (v) => fmt(v, 2);

function ConfidenceBadge({ level, label }) {
  const colors = {
    high: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    medium: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    low: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    model: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  };
  const c = colors[level] || colors.medium;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
      letterSpacing: '0.05em', background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      <Shield size={8} />
      {label || level.toUpperCase()}
    </span>
  );
}

function MetricBar({ value, max, color, label, unit }) {
  const pct = max > 0 ? Math.min((Math.abs(value) / max) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span style={{ color: 'var(--hs-text-secondary)' }}>{label}</span>
        <span style={{ color, fontFamily: 'var(--hs-font-mono)' }}>{fmt(value)}{unit}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--hs-bg-tertiary)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 2, background: color }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ScenarioResult — shows model-derived comparison                            */
/* -------------------------------------------------------------------------- */

function ScenarioResult({ result }) {
  if (!result) return null;

  // Development-only diagnostic — helps verify actual backend response shape
  if (typeof window !== 'undefined' && window.__DEV__) {
    console.log('[ScenarioResult] response keys:', Object.keys(result));
    console.log('[ScenarioResult] flat fields:', {
      mean_delta_lst: result.mean_delta_lst,
      pct_cells_cooler: result.pct_cells_cooler,
      min_delta: result.min_delta,
      max_delta: result.max_delta,
      n_cells: result.n_cells,
    });
    if (result.delta) {
      console.log('[ScenarioResult] nested delta:', result.delta);
    }
  }

  // Handle error responses (e.g. { error: 'Scenario failed' })
  if (result.error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: 12, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
          background: 'rgba(239,68,68,0.06)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} color="#ef4444" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>SCENARIO FAILED</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--hs-text-secondary)' }}>
          {result.message || 'The scenario could not be computed. The model may be unavailable.'}
        </div>
      </motion.div>
    );
  }

  // Handle model-unavailable responses (503)
  if (result.status === 'model_unavailable' || result.status === 'invalid_request') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: 12, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
          background: 'rgba(239,68,68,0.06)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} color="#ef4444" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>MODEL UNAVAILABLE</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--hs-text-secondary)' }}>
          {result.message || 'Trained model artifact is not available.'}
        </div>
      </motion.div>
    );
  }

  // Extract metrics — handle BOTH flat and nested response formats.
  // Flat format:  { mean_delta_lst, pct_cells_cooler, min_delta, max_delta, n_cells }
  // Nested format: { delta: { mean_change, pct_cells_cooler, max_cooling, max_warming, affected_cells } }
  const d = result.delta || {};
  const delta = result.mean_delta_lst ?? d.mean_change;
  const pctCooler = result.pct_cells_cooler ?? d.pct_cells_cooler;
  const isCooling = delta != null && delta < 0;
  const minDelta = result.min_delta ?? d.max_cooling;
  const maxDelta = result.max_delta ?? d.max_warming;
  const nCells = result.n_cells ?? d.affected_cells;

  // If no numeric data at all, show a degraded state instead of crashing
  const hasData = delta != null || pctCooler != null || nCells != null;
  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: 12, borderRadius: 8, border: '1px solid var(--hs-border-subtle)',
          background: 'var(--hs-bg-secondary)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={14} color="var(--hs-text-muted)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--hs-text-muted)' }}>SCENARIO RESULT</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--hs-text-secondary)' }}>
          Scenario completed but no summary metrics were returned.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: 12, borderRadius: 8, border: '1px solid var(--hs-border-subtle)',
        background: 'var(--hs-bg-secondary)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {isCooling ? <TrendingDown size={14} color="#22c55e" /> : <TrendingUp size={14} color="#ef4444" />}
        <span style={{ fontSize: 11, fontWeight: 700, color: isCooling ? '#22c55e' : '#ef4444' }}>
          {isCooling ? 'COOLING EFFECT' : 'WARMING EFFECT'}
        </span>
        <ConfidenceBadge level="model" label="XGBoost" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ textAlign: 'center', padding: 8, borderRadius: 6, background: 'var(--hs-bg-primary)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: isCooling ? '#22c55e' : '#ef4444' }}>
            {delta != null ? `${delta > 0 ? '+' : ''}${fmtTemp(delta)}` : '—'}
          </div>
          <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', letterSpacing: '0.08em' }}>°C MEAN CHANGE</div>
        </div>
        <div style={{ textAlign: 'center', padding: 8, borderRadius: 6, background: 'var(--hs-bg-primary)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--hs-text-primary)' }}>
            {pctCooler != null ? `${fmtPct(pctCooler)}` : '—'}%
          </div>
          <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', letterSpacing: '0.08em' }}>
            {isCooling ? 'CELLS COOLER' : 'CELLS WARMER'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--hs-text-primary)' }}>{fmt(minDelta)}°C</div>
          MIN Δ
        </div>
        <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--hs-text-primary)' }}>{fmt(maxDelta)}°C</div>
          MAX Δ
        </div>
        <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--hs-text-primary)' }}>{nCells != null ? nCells.toLocaleString() : '—'}</div>
          CELLS
        </div>
      </div>

      <div style={{
        marginTop: 8, padding: '6px 8px', borderRadius: 4,
        background: isCooling ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${isCooling ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
        fontSize: 10, color: 'var(--hs-text-secondary)', lineHeight: 1.4,
      }}>
        <Info size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
        {delta != null
          ? isCooling
            ? `Restoration would cool this area by ${Math.abs(delta).toFixed(2)}°C on average. Model-derived estimate.`
            : `Urbanization would warm this area by ${delta.toFixed(2)}°C on average. Model-derived estimate.`
          : 'Model-derived scenario estimate. Temperature change data unavailable.'}
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* VegetationProfile — real per-cell vegetation data                         */
/* -------------------------------------------------------------------------- */

function VegetationProfile({ profile }) {
  if (!profile?.available) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--hs-text-muted)' }}>
        <TreePine size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
        <div style={{ fontSize: 12 }}>Select an area to view vegetation profile</div>
      </div>
    );
  }

  const env = profile.environment || {};
  const ndvi = env.MeanNDVI;
  const greenCover = env.GreenCover;
  const treeDensity = env.TreeDensity;
  const vegDensity = env.VegetationDensity;
  const lst = env.MeanLST;
  const buildingCoverage = env.BuildingCoveragePct;
  const landCover = env.LandCoverClass;
  const predictedLst = env.Predicted_LST;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Crosshair size={12} color="var(--hs-cyan)" />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--hs-text-muted)', letterSpacing: '0.1em' }}>
          GRID {profile.grid_id}
        </span>
        <span style={{ fontSize: 9, color: 'var(--hs-text-muted)' }}>
          {fmt(profile.distance_m, 0)}m away
        </span>
      </div>

      <MetricBar value={ndvi} max={1} color="#22c55e" label="NDVI" unit="" />
      <MetricBar value={greenCover} max={100} color="#16a34a" label="Green Cover" unit="%" />
      <MetricBar value={treeDensity} max={500} color="#15803d" label="Tree Density" unit="/km²" />
      <MetricBar value={lst} max={50} color="#ef4444" label="Land Surface Temp" unit="°C" />
      <MetricBar value={buildingCoverage} max={100} color="#64748b" label="Building Coverage" unit="%" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
        <div style={{ padding: 6, borderRadius: 4, background: 'var(--hs-bg-primary)', border: '1px solid var(--hs-border-subtle)' }}>
          <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', letterSpacing: '0.08em' }}>VEG DENSITY</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--hs-text-primary)' }}>
            {VEG_DENSITY_LABELS[vegDensity] || '—'}
          </div>
        </div>
        <div style={{ padding: 6, borderRadius: 4, background: 'var(--hs-bg-primary)', border: '1px solid var(--hs-border-subtle)' }}>
          <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', letterSpacing: '0.08em' }}>LAND COVER</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--hs-text-primary)' }}>
            {LANDCOVER_LABELS[landCover] || '—'}
          </div>
        </div>
      </div>

      {predictedLst != null && (
        <div style={{
          padding: 6, borderRadius: 4, background: 'var(--hs-bg-primary)',
          border: '1px solid var(--hs-border-subtle)', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', letterSpacing: '0.08em' }}>PREDICTED LST</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{fmt(predictedLst)}°C</div>
          </div>
          <ConfidenceBadge level="model" label="XGBoost" />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* RestorationPriority — ranked intervention opportunities                    */
/* -------------------------------------------------------------------------- */

function RestorationPriority({ onRunScenario }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    fetchInterventions(8)
      .then(d => { if (!stale) setData(d); })
      .catch(() => { if (!stale) setData({ available: false }); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, color: 'var(--hs-text-muted)', fontSize: 11 }}>
      <Loader2 size={14} className="spin" /> Loading intervention rankings…
    </div>
  );

  if (!data?.available) return (
    <div style={{ padding: 12, fontSize: 11, color: 'var(--hs-text-muted)' }}>
      <AlertTriangle size={12} style={{ marginRight: 4 }} />
      Restoration priority data unavailable
    </div>
  );

  const items = data.interventions || [];
  const vegInterventions = items.filter(i =>
    i.scenario.includes('green') || i.scenario.includes('trees') || i.scenario.includes('park')
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Target size={12} color="#22c55e" />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--hs-text-muted)', letterSpacing: '0.1em' }}>
          RESTORATION PRIORITY
        </span>
        <ConfidenceBadge level="model" label="Model-derived" />
      </div>

      {vegInterventions.length === 0 && (
        <div style={{ fontSize: 10, color: 'var(--hs-text-muted)', padding: 8 }}>
          No vegetation restoration opportunities found
        </div>
      )}

      {vegInterventions.slice(0, 6).map((item, i) => (
        <motion.div
          key={`${item.scenario}-${item.grid_id}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
            border: '1px solid var(--hs-border-subtle)',
            background: 'var(--hs-bg-secondary)',
            transition: 'border-color 0.15s',
          }}
          onClick={() => onRunScenario?.(item.scenario)}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--hs-border-accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--hs-border-subtle)'}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 4, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 10,
            fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e',
          }}>
            {i + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--hs-text-primary)' }}>
              Zone {item.grid_id}
            </div>
            <div style={{ fontSize: 9, color: 'var(--hs-text-muted)' }}>
              {item.scenario.replace(/_/g, ' ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>
              −{item.cooling_c != null ? Math.abs(item.cooling_c).toFixed(1) : '—'}°C
            </div>
            <div style={{ fontSize: 8, color: 'var(--hs-text-muted)' }}>
              {fmt(item.current_lst_c)}→{fmt(item.after_lst_c)}°C
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main ForestPage                                                            */
/* -------------------------------------------------------------------------- */

export function ForestPage({ modelInfo }) {
  // Area selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [explain, setExplain] = useState(null);

  // Scenarios
  const [_scenarios, setScenarios] = useState([]);
  const [lossResult, setLossResult] = useState(null);
  const [restoreResult, setRestoreResult] = useState(null);
  const [runningLoss, setRunningLoss] = useState(false);
  const [runningRestore, setRunningRestore] = useState(false);
  const [activeLossScenario, setActiveLossScenario] = useState(null);
  const [activeRestoreScenario, setActiveRestoreScenario] = useState(null);

  // Cooling potential
  const [coolingData, setCoolingData] = useState(null);

  // Load scenarios
  useEffect(() => {
    fetchScenarios().then(setScenarios).catch(() => {});
    fetchCoolingPotential().then(setCoolingData).catch(() => {});
  }, []);

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
        .then(r => r.json())
        .then(data => setSearchResults(data.results || []))
        .catch(() => setSearchResults([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select area
  const selectArea = useCallback(async (lat, lng, name) => {
    setSelectedArea({ lat, lng, name });
    setSearchQuery(name || `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`);
    setSearchResults([]);
    setProfileLoading(true);
    setLossResult(null);
    setRestoreResult(null);
    setActiveLossScenario(null);
    setActiveRestoreScenario(null);

    try {
      const [profileData, explainData] = await Promise.all([
        fetchCityPoint(lat, lng),
        fetchExplain(lat, lng).catch(() => null),
      ]);
      setProfile(profileData);
      setExplain(explainData?.explanation || null);
    } catch {
      setProfile({ available: false, message: 'Failed to load profile' });
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Run loss scenario
  const runLossScenario = useCallback(async (scenarioName) => {
    if (!selectedArea || runningLoss) return;
    setRunningLoss(true);
    setActiveLossScenario(scenarioName);
    setLossResult(null);
    try {
      const data = await runCurrentScenario({ scenario: scenarioName });
      setLossResult(data);
    } catch {
      setLossResult({ error: 'Scenario failed' });
    } finally {
      setRunningLoss(false);
    }
  }, [selectedArea, runningLoss]);

  // Run restore scenario
  const runRestoreScenario = useCallback(async (scenarioName) => {
    if (!selectedArea || runningRestore) return;
    setRunningRestore(true);
    setActiveRestoreScenario(scenarioName);
    setRestoreResult(null);
    try {
      const data = await runCurrentScenario({ scenario: scenarioName });
      setRestoreResult(data);
    } catch {
      setRestoreResult({ error: 'Scenario failed' });
    } finally {
      setRunningRestore(false);
    }
  }, [selectedArea, runningRestore]);

  // Reset
  const reset = useCallback(() => {
    setSelectedArea(null);
    setProfile(null);
    setExplain(null);
    setLossResult(null);
    setRestoreResult(null);
    setActiveLossScenario(null);
    setActiveRestoreScenario(null);
    setSearchQuery('');
  }, []);

  // Vegetation health assessment
  const vegHealth = useMemo(() => {
    if (!profile?.available) return null;
    const env = profile.environment || {};
    const ndvi = env.MeanNDVI;
    const greenCover = env.GreenCover;
    const treeDensity = env.TreeDensity;
    const lst = env.MeanLST;

    if (ndvi == null && greenCover == null) return null;

    let score = 0;
    let maxScore = 0;

    if (ndvi != null) {
      maxScore += 30;
      if (ndvi >= 0.6) score += 30;
      else if (ndvi >= 0.4) score += 20;
      else if (ndvi >= 0.2) score += 10;
    }

    if (greenCover != null) {
      maxScore += 25;
      if (greenCover >= 60) score += 25;
      else if (greenCover >= 40) score += 18;
      else if (greenCover >= 20) score += 10;
    }

    if (treeDensity != null) {
      maxScore += 25;
      if (treeDensity >= 200) score += 25;
      else if (treeDensity >= 100) score += 18;
      else if (treeDensity >= 50) score += 10;
    }

    if (lst != null) {
      maxScore += 20;
      if (lst <= 32) score += 20;
      else if (lst <= 36) score += 14;
      else if (lst <= 40) score += 8;
    }

    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const level = pct >= 70 ? 'Healthy' : pct >= 40 ? 'Moderate' : 'Stressed';
    const tone = pct >= 70 ? 'good' : pct >= 40 ? 'warn' : 'bad';

    return { score: pct, level, tone };
  }, [profile]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hs-header-height))',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', borderBottom: '1px solid var(--hs-border-subtle)',
          background: 'var(--hs-bg-deep)', flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TreePine size={20} color="#22c55e" />
          <div>
            <h1 style={{
              fontFamily: 'var(--hs-font-display)', fontSize: 'var(--hs-text-xl)',
              fontWeight: 700, color: 'var(--hs-text-primary)', letterSpacing: '-0.02em',
            }}>
              Forest & Vegetation Intelligence
            </h1>
            <p style={{ fontSize: 'var(--hs-text-xs)', color: 'var(--hs-text-secondary)' }}>
              Decision-support for urban forestry — model-derived, not measured
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {modelInfo && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              padding: '3px 10px', borderRadius: 'var(--hs-radius-full)',
              background: modelInfo.available ? 'var(--hs-success-dim)' : 'var(--hs-warning-dim)',
              color: modelInfo.available ? 'var(--hs-success)' : 'var(--hs-warning)',
            }}>
              {modelInfo.available ? 'MODEL READY' : 'MODEL UNAVAILABLE'}
            </span>
          )}
          {selectedArea && (
            <button onClick={reset} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', border: '1px solid var(--hs-border-default)',
              borderRadius: 'var(--hs-radius-md)', background: 'transparent',
              color: 'var(--hs-text-secondary)', fontSize: 'var(--hs-text-xs)',
              fontWeight: 600, cursor: 'pointer',
            }}>
              <RotateCcw size={14} /> Reset
            </button>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: 1, flex: 1, minHeight: 0, background: 'var(--hs-border-subtle)' }}>

        {/* Left Panel — Area Selection + Vegetation Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--hs-bg-primary)', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderBottom: '1px solid var(--hs-border-subtle)',
          }}>
            <Search size={14} color="var(--hs-cyan)" />
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--hs-text-muted)', letterSpacing: '0.12em' }}>
              AREA SELECTION
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search location..."
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 6,
                  border: '1px solid var(--hs-border-default)', background: 'var(--hs-bg-secondary)',
                  color: 'var(--hs-text-primary)', fontSize: 12, outline: 'none',
                  fontFamily: 'var(--hs-font-body)',
                }}
              />
              {searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: 'var(--hs-bg-elevated)', border: '1px solid var(--hs-border-default)',
                  borderRadius: 6, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                  boxShadow: 'var(--hs-shadow-lg)',
                }}>
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => selectArea(r.lat, r.lng, r.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '8px 12px', border: 'none', background: 'transparent',
                        cursor: 'pointer', textAlign: 'left', fontSize: 11,
                        color: 'var(--hs-text-primary)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--hs-bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <MapPin size={12} color="var(--hs-text-muted)" />
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vegetation Profile */}
            {profileLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, color: 'var(--hs-text-muted)', fontSize: 11 }}>
                <Loader2 size={16} className="spin" style={{ marginRight: 8 }} />
                Loading vegetation profile…
              </div>
            ) : profile?.available === false ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--hs-text-muted)', fontSize: 11 }}>
                <AlertTriangle size={20} style={{ opacity: 0.3, marginBottom: 8 }} />
                {profile?.message || 'Data unavailable at this location'}
              </div>
            ) : profile ? (
              <VegetationProfile profile={profile} />
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--hs-text-muted)' }}>
                <TreePine size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                <div style={{ fontSize: 12, marginBottom: 4 }}>Select an Area</div>
                <div style={{ fontSize: 10, lineHeight: 1.5 }}>
                  Search for a location or click on the map to analyze vegetation health, canopy cover, and heat impact.
                </div>
              </div>
            )}

            {/* Vegetation Health */}
            {vegHealth && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 12, padding: 10, borderRadius: 8,
                  border: `1px solid ${vegHealth.tone === 'good' ? 'rgba(34,197,94,0.3)' : vegHealth.tone === 'warn' ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  background: vegHealth.tone === 'good' ? 'rgba(34,197,94,0.06)' : vegHealth.tone === 'warn' ? 'rgba(234,179,8,0.06)' : 'rgba(239,68,68,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Heart size={12} color={vegHealth.tone === 'good' ? '#22c55e' : vegHealth.tone === 'warn' ? '#eab308' : '#ef4444'} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--hs-text-muted)', letterSpacing: '0.1em' }}>
                    VEGETATION HEALTH
                  </span>
                  <ConfidenceBadge level={vegHealth.tone === 'good' ? 'high' : vegHealth.tone === 'warn' ? 'medium' : 'low'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{
                    fontSize: 22, fontWeight: 700,
                    color: vegHealth.tone === 'good' ? '#22c55e' : vegHealth.tone === 'warn' ? '#eab308' : '#ef4444',
                  }}>
                    {vegHealth.score.toFixed(0)}%
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: vegHealth.tone === 'good' ? '#22c55e' : vegHealth.tone === 'warn' ? '#eab308' : '#ef4444',
                  }}>
                    {vegHealth.level}
                  </span>
                </div>
                <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: 'var(--hs-bg-tertiary)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${vegHealth.score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      height: '100%', borderRadius: 2,
                      background: vegHealth.tone === 'good' ? '#22c55e' : vegHealth.tone === 'warn' ? '#eab308' : '#ef4444',
                    }}
                  />
                </div>
                <div style={{ marginTop: 6, fontSize: 9, color: 'var(--hs-text-muted)', lineHeight: 1.4 }}>
                  Composite score from NDVI, green cover, tree density, and thermal stress. Model-derived assessment.
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Center Panel — Scenarios & Results */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--hs-bg-primary)', overflow: 'hidden' }}>
          {!selectedArea ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 48, color: 'var(--hs-text-muted)',
            }}>
              <Sprout size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
              <h3 style={{ fontFamily: 'var(--hs-font-display)', fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--hs-text-secondary)' }}>
                Select an Area to Analyze
              </h3>
              <p style={{ fontSize: 12, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
                Choose a location from the left panel to view vegetation intelligence,
                run deforestation/restoration scenarios, and see model-derived heat impact.
              </p>
              <div style={{
                marginTop: 24, padding: 16, borderRadius: 8, border: '1px dashed var(--hs-border-default)',
                maxWidth: 500, fontSize: 10, color: 'var(--hs-text-muted)', lineHeight: 1.5, textAlign: 'center',
              }}>
                <Info size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                All results are model-derived estimates from the XGBoost thermal model.
                Never fabricate measurements — show "Data unavailable" when real data is missing.
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {/* Decision header */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Eye size={14} color="var(--hs-cyan)" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--hs-text-muted)', letterSpacing: '0.12em' }}>
                    DECISION SUPPORT
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--hs-text-secondary)', lineHeight: 1.5 }}>
                  Analyze vegetation loss and restoration scenarios for <strong>{selectedArea.name || 'this area'}</strong>.
                  Each scenario uses the XGBoost model to predict city-wide thermal impact.
                </p>
              </div>

              {/* Loss Scenario */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <TrendingDown size={14} color="#ef4444" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--hs-text-primary)' }}>
                    What if this vegetation is lost?
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {LOSS_SCENARIOS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => runLossScenario(s.key)}
                      disabled={runningLoss}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 4, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${activeLossScenario === s.key ? s.color : 'var(--hs-border-subtle)'}`,
                        background: activeLossScenario === s.key ? `${s.color}11` : 'var(--hs-bg-secondary)',
                        color: 'var(--hs-text-primary)', fontSize: 11, fontWeight: 600,
                        transition: 'all 0.15s',
                      }}
                    >
                      {runningLoss && activeLossScenario === s.key ? (
                        <Loader2 size={14} className="spin" color={s.color} />
                      ) : (
                        <s.icon size={14} color={s.color} />
                      )}
                      <span>{s.label}</span>
                      <span style={{ fontSize: 9, color: 'var(--hs-text-muted)', fontWeight: 400 }}>{s.desc}</span>
                    </button>
                  ))}
                </div>

                <ScenarioResult result={lossResult} scenarioType="loss" />
              </div>

              {/* Restore Scenario */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <TrendingUp size={14} color="#22c55e" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--hs-text-primary)' }}>
                    What if this area is restored?
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {RESTORE_SCENARIOS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => runRestoreScenario(s.key)}
                      disabled={runningRestore}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 4, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${activeRestoreScenario === s.key ? s.color : 'var(--hs-border-subtle)'}`,
                        background: activeRestoreScenario === s.key ? `${s.color}11` : 'var(--hs-bg-secondary)',
                        color: 'var(--hs-text-primary)', fontSize: 11, fontWeight: 600,
                        transition: 'all 0.15s',
                      }}
                    >
                      {runningRestore && activeRestoreScenario === s.key ? (
                        <Loader2 size={14} className="spin" color={s.color} />
                      ) : (
                        <s.icon size={14} color={s.color} />
                      )}
                      <span>{s.label}</span>
                      <span style={{ fontSize: 9, color: 'var(--hs-text-muted)', fontWeight: 400 }}>{s.desc}</span>
                    </button>
                  ))}
                </div>

                <ScenarioResult result={restoreResult} scenarioType="restore" />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel — Cooling Contribution + Heat Impact */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--hs-bg-primary)', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderBottom: '1px solid var(--hs-border-subtle)',
          }}>
            <Sparkles size={14} color="var(--hs-purple)" />
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--hs-text-muted)', letterSpacing: '0.12em' }}>
              ANALYSIS
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {/* Cooling Contribution */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Wind size={12} color="var(--hs-cool)" />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--hs-text-muted)', letterSpacing: '0.1em' }}>
                  COOLING CONTRIBUTION
                </span>
              </div>

              {coolingData?.available ? (
                <div style={{ fontSize: 10, color: 'var(--hs-text-secondary)', lineHeight: 1.5 }}>
                  <div style={{ padding: '6px 8px', borderRadius: 4, background: 'var(--hs-bg-secondary)', border: '1px solid var(--hs-border-subtle)', marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', letterSpacing: '0.08em' }}>MAX POTENTIAL COOLING</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--hs-cool)' }}>
                      {fmt(coolingData.cells?.[0]?.max_cooling_c)}°C
                    </div>
                  </div>
                  <div style={{ padding: '6px 8px', borderRadius: 4, background: 'var(--hs-bg-secondary)', border: '1px solid var(--hs-border-subtle)', marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', letterSpacing: '0.08em' }}>BEST SCENARIO</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--hs-text-primary)' }}>
                      {coolingData.cells?.[0]?.best_scenario?.replace(/_/g, ' ') || '—'}
                    </div>
                  </div>
                  <div style={{ padding: '6px 8px', borderRadius: 4, background: 'var(--hs-bg-secondary)', border: '1px solid var(--hs-border-subtle)' }}>
                    <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', letterSpacing: '0.08em' }}>HIGH-PRIORITY ZONES</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--hs-text-primary)' }}>
                      {coolingData.cells?.filter(c => c.cooling_class === 'VERY HIGH').length || 0} zones
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 10, color: 'var(--hs-text-muted)', padding: 8 }}>
                  <AlertTriangle size={12} style={{ marginRight: 4 }} />
                  Cooling potential data unavailable
                </div>
              )}
            </div>

            {/* Heat Impact */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <ThermometerSun size={12} color="var(--hs-heat)" />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--hs-text-muted)', letterSpacing: '0.1em' }}>
                  HEAT IMPACT
                </span>
              </div>

              {profile?.available ? (
                <div style={{ fontSize: 10, color: 'var(--hs-text-secondary)', lineHeight: 1.5 }}>
                  <div style={{ padding: '6px 8px', borderRadius: 4, background: 'var(--hs-bg-secondary)', border: '1px solid var(--hs-border-subtle)', marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', letterSpacing: '0.08em' }}>CURRENT LST</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>
                      {fmt(profile.environment?.MeanLST)}°C
                    </div>
                  </div>
                  <div style={{ padding: '6px 8px', borderRadius: 4, background: 'var(--hs-bg-secondary)', border: '1px solid var(--hs-border-subtle)', marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', letterSpacing: '0.08em' }}>PREDICTED LST</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--hs-text-primary)' }}>
                      {fmt(profile.environment?.Predicted_LST)}°C
                    </div>
                  </div>
                  <div style={{ padding: '6px 8px', borderRadius: 4, background: 'var(--hs-bg-secondary)', border: '1px solid var(--hs-border-subtle)' }}>
                    <div style={{ fontSize: 9, color: 'var(--hs-text-muted)', letterSpacing: '0.08em' }}>THERMAL STRESS</div>
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: (profile.environment?.MeanLST || 0) > 38 ? '#ef4444' : (profile.environment?.MeanLST || 0) > 35 ? '#f97316' : '#22c55e',
                    }}>
                      {(profile.environment?.MeanLST || 0) > 38 ? 'High Stress' : (profile.environment?.MeanLST || 0) > 35 ? 'Moderate Stress' : 'Low Stress'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 10, color: 'var(--hs-text-muted)', padding: 8 }}>
                  Select an area to view heat impact
                </div>
              )}
            </div>

            {/* Explanation */}
            {explain && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Info size={12} color="var(--hs-purple)" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--hs-text-muted)', letterSpacing: '0.1em' }}>
                    WHY IS THIS AREA HOT?
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(explain.factors || []).slice(0, 5).map((f, i) => (
                    <div key={f.column || i} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 8px', borderRadius: 4, fontSize: 10,
                      background: 'var(--hs-bg-secondary)', border: '1px solid var(--hs-border-subtle)',
                    }}>
                      <span style={{ flex: 1, color: 'var(--hs-text-secondary)' }}>{f.feature}</span>
                      <span style={{
                        fontFamily: 'var(--hs-font-mono)', fontSize: 9, fontWeight: 600,
                        color: f.direction === 'above' ? '#ef4444' : '#22c55e',
                      }}>
                        {f.direction === 'above' ? '↑' : '↓'} {fmt(f.value)}
                      </span>
                    </div>
                  ))}
                </div>

                {explain.notes && (
                  <div style={{ marginTop: 6, fontSize: 9, color: 'var(--hs-text-muted)', lineHeight: 1.4 }}>
                    <Info size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                    {explain.notes[0]}
                  </div>
                )}
              </div>
            )}

            {/* Restoration Priority */}
            <RestorationPriority onRunScenario={runRestoreScenario} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForestPage;
