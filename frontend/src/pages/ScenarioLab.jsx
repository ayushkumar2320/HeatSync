import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, RotateCcw, MapPin, ThermometerSun,
  Leaf, Building2, TreePine, Waves, ChevronDown,
  ChevronRight, AlertTriangle, Loader2, BarChart3,
  Sparkles, Layers, Sun, Wind
} from 'lucide-react';
import { fetchScenarios, runCurrentScenario, fetchScenarioGeoJson } from '../services/backendClient';

/* --------------------------------------------------------------------------
   Intervention types — maps to backend feature perturbations
   -------------------------------------------------------------------------- */
const INTERVENTIONS = [
  { key: 'TREE_PLANTING',      label: 'Tree Planting',        icon: TreePine,  color: 'var(--hs-vegetation)', category: 'Vegetation', description: 'Increase tree canopy coverage' },
  { key: 'TREE_REMOVAL',       label: 'Tree Removal',         icon: TreePine,  color: 'var(--hs-warning)',    category: 'Vegetation', description: 'Remove existing tree canopy' },
  { key: 'BUILDING_ADDITION',  label: 'Building Addition',    icon: Building2, color: 'var(--hs-water)',      category: 'Built Form', description: 'Add new building footprints' },
  { key: 'BUILDING_REMOVAL',   label: 'Building Removal',     icon: Building2, color: 'var(--hs-cool)',       category: 'Built Form', description: 'Remove building footprints' },
  { key: 'BUILDING_HEIGHT',    label: 'Building Height',      icon: Building2, color: 'var(--hs-infrastructure)', category: 'Built Form', description: 'Modify building heights' },
  { key: 'GREEN_SPACE',        label: 'Green Space',          icon: Leaf,      color: 'var(--hs-vegetation)', category: 'Vegetation', description: 'Add parks and green areas' },
  { key: 'WATER',              label: 'Water Bodies',         icon: Waves,     color: 'var(--hs-cool)',       category: 'Natural',    description: 'Add water features' },
  { key: 'IMPERVIOUS_SURFACE', label: 'Impervious Surface',   icon: Layers,    color: 'var(--hs-neutral)',    category: 'Built Form', description: 'Modify impervious surface ratio' },
  { key: 'COOL_ROOF',          label: 'Cool Roof',            icon: Sun,       color: 'var(--hs-cyan)',       category: 'Built Form', description: 'Apply high-albedo roof coatings' },
];

/* --------------------------------------------------------------------------
   Animation variants
   -------------------------------------------------------------------------- */
const fadeSlide = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeSlideChild = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

/* --------------------------------------------------------------------------
   MetricCard — animated metric display
   -------------------------------------------------------------------------- */
function MetricCard({ label, value, unit, icon: Icon, color, delay = 0 }) {
  return (
    <motion.div
      className="sl-metric"
      variants={fadeSlideChild}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      <div className="sl-metric-header">
        {Icon && <Icon size={14} color={color} />}
        <span className="sl-metric-label">{label}</span>
      </div>
      <div className="sl-metric-value" style={{ color }}>
        {value ?? '—'}
        {unit && <span className="sl-metric-unit">{unit}</span>}
      </div>
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
   InterventionSelector — grid of intervention types
   -------------------------------------------------------------------------- */
function InterventionSelector({ selected, onSelect, disabled }) {
  return (
    <div className="sl-interventions">
      {INTERVENTIONS.map((intv) => {
        const Icon = intv.icon;
        const isActive = selected === intv.key;
        return (
          <button
            key={intv.key}
            className={`sl-intervention ${isActive ? 'active' : ''}`}
            onClick={() => onSelect(intv.key)}
            disabled={disabled}
            style={{ '--intv-color': intv.color }}
          >
            <div className="sl-intervention-icon">
              <Icon size={16} />
            </div>
            <div className="sl-intervention-body">
              <span className="sl-intervention-label">{intv.label}</span>
              <span className="sl-intervention-desc">{intv.description}</span>
            </div>
            {isActive && (
              <motion.div
                className="sl-intervention-active"
                layoutId="intervention-active"
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------------------
   ComparisonView — baseline vs scenario vs difference
   -------------------------------------------------------------------------- */
function ComparisonView({ result }) {
  if (!result) return null;

  const baseline = result.baseline?.mean_lst;
  const after = result.after?.mean_lst;
  const delta = result.delta?.mean_change;
  const cooler = result.delta?.pct_cells_cooler;
  const maxCooling = result.delta?.max_cooling;
  const maxWarming = result.delta?.max_warming;
  const affected = result.delta?.affected_cells;

  return (
    <motion.div
      className="sl-comparison"
      variants={fadeSlide}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="sl-comparison-header">
        <BarChart3 size={14} color="var(--hs-cyan)" />
        <span className="sl-comparison-title">COMPARISON</span>
      </div>

      {/* Visual comparison bar */}
      <div className="sl-comparison-bar">
        <div className="sl-bar-group">
          <span className="sl-bar-label">BASELINE</span>
          <div className="sl-bar-track">
            <motion.div
              className="sl-bar-fill baseline"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(((baseline || 0) / 50) * 100, 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="sl-bar-value">{baseline?.toFixed(1) ?? '—'}°C</span>
        </div>

        <div className="sl-bar-group">
          <span className="sl-bar-label">SCENARIO</span>
          <div className="sl-bar-track">
            <motion.div
              className="sl-bar-fill scenario"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(((after || 0) / 50) * 100, 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            />
          </div>
          <span className="sl-bar-value">{after?.toFixed(1) ?? '—'}°C</span>
        </div>
      </div>

      {/* Delta metrics */}
      <motion.div
        className="sl-delta-metrics"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <MetricCard
          label="MEAN CHANGE"
          value={delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(2)}` : '—'}
          unit="°C"
          icon={ThermometerSun}
          color={delta != null && delta < 0 ? 'var(--hs-vegetation)' : delta != null && delta > 0 ? 'var(--hs-heat)' : 'var(--hs-text-muted)'}
          delay={0.15}
        />
        <MetricCard
          label="COOLER CELLS"
          value={cooler?.toFixed(1) ?? '—'}
          unit="%"
          icon={Leaf}
          color="var(--hs-vegetation)"
          delay={0.2}
        />
        <MetricCard
          label="MAX COOLING"
          value={maxCooling != null ? maxCooling.toFixed(2) : '—'}
          unit="°C"
          icon={Wind}
          color="var(--hs-cool)"
          delay={0.25}
        />
        <MetricCard
          label="MAX WARMING"
          value={maxWarming != null ? maxWarming.toFixed(2) : '—'}
          unit="°C"
          icon={ThermometerSun}
          color="var(--hs-heat)"
          delay={0.3}
        />
        <MetricCard
          label="AFFECTED CELLS"
          value={affected?.toLocaleString() ?? '—'}
          unit=""
          icon={MapPin}
          color="var(--hs-cyan)"
          delay={0.35}
        />
      </motion.div>

      {/* Model info */}
      {result.model && (
        <div className="sl-model-info">
          <span className="sl-model-name">{result.model.name}</span>
          <span className="sl-model-sep">·</span>
          <span className="sl-model-features">{result.model.feature_count} features</span>
        </div>
      )}
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
   TemporalWarning — shown when temporal simulation is requested
   -------------------------------------------------------------------------- */
function TemporalWarning() {
  return (
    <motion.div
      className="sl-temporal-warning"
      variants={fadeSlide}
      initial="hidden"
      animate="visible"
    >
      <AlertTriangle size={16} color="var(--hs-warning)" />
      <div>
        <strong>Temporal Simulation Not Available</strong>
        <p>
          The backend currently supports spatial what-if scenarios (instant perturbations),
          not temporal simulations (predictions over future time periods).
          Historical LST time series are available via the Time Machine feature.
        </p>
      </div>
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
   ScenarioLab — main component
   -------------------------------------------------------------------------- */
export function ScenarioLab({ modelInfo }) {
  // State
  const [interventions, setInterventions] = useState([]);
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [_geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTemporal, setShowTemporal] = useState(false);

  // Load available scenarios from backend
  useEffect(() => {
    fetchScenarios()
      .then(data => {
        setScenarios(data || []);
        // Map backend scenarios to intervention types
        const mapped = (data || []).map(s => ({
          ...s,
          interventionType: INTERVENTIONS.find(
            i => s.name.toUpperCase().includes(i.key.replace(/_/g, ''))
          )?.key || s.name,
        }));
        setInterventions(mapped);
      })
      .catch(_err => setError('Failed to load scenarios'))
      .finally(() => setLoading(false));
  }, []);

  // Run scenario
  const handleRunScenario = useCallback(async (scenarioName) => {
    setRunning(true);
    setError(null);
    setResult(null);
    setGeojson(null);

    try {
      const data = await runCurrentScenario({ scenario: scenarioName });
      if (data.success) {
        setResult(data);
        setSelectedScenario(scenarioName);

        // Fetch GeoJSON for map rendering
        try {
          const geo = await fetchScenarioGeoJson(scenarioName);
          setGeojson(geo);
        } catch {
          // GeoJSON optional — scenario results are still valid
        }
      } else {
        setError(data.message || 'Simulation failed');
      }
    } catch (err) {
      setError(err.message || 'Simulation failed');
    } finally {
      setRunning(false);
    }
  }, []);

  // Handle intervention selection
  const handleSelectIntervention = useCallback((key) => {
    setSelectedIntervention(key);
    // Find matching backend scenario
    const match = interventions.find(s => s.interventionType === key);
    if (match) {
      handleRunScenario(match.name);
    }
  }, [interventions, handleRunScenario]);

  // Reset
  const handleReset = useCallback(() => {
    setSelectedIntervention(null);
    setSelectedScenario(null);
    setResult(null);
    setGeojson(null);
    setError(null);
  }, []);

  // Group scenarios by category
  const _groupedScenarios = useMemo(() => {
    const groups = {};
    INTERVENTIONS.forEach(intv => {
      if (!groups[intv.category]) groups[intv.category] = [];
      const match = scenarios.find(s =>
        s.name.toUpperCase().includes(intv.key.replace(/_/g, '')) ||
        s.name.toUpperCase().includes(intv.label.replace(/\s/g, '').toUpperCase())
      );
      groups[intv.category].push({
        ...intv,
        scenario: match || null,
        available: !!match,
      });
    });
    return groups;
  }, [scenarios]);

  return (
    <div className="sl-page">
      {/* Header */}
      <motion.div
        className="sl-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="sl-header-left">
          <FlaskConical size={20} color="var(--hs-cyan)" />
          <div>
            <h1 className="sl-title">Scenario Lab</h1>
            <p className="sl-subtitle">What-if intervention simulation using the XGBoost model</p>
          </div>
        </div>
        <div className="sl-header-right">
          {modelInfo && (
            <span className="sl-model-badge">
              {modelInfo.available ? 'MODEL READY' : 'MODEL UNAVAILABLE'}
            </span>
          )}
          {result && (
            <button className="sl-reset-btn" onClick={handleReset}>
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </motion.div>

      <div className="sl-content">
        {/* Left: Intervention selector */}
        <motion.div
          className="sl-panel sl-panel-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="sl-panel-head">
            <Layers size={14} color="var(--hs-cyan)" />
            <span className="sl-panel-title">INTERVENTIONS</span>
          </div>

          <div className="sl-panel-body">
            {loading ? (
              <div className="sl-loading">
                <Loader2 size={16} className="spin" />
                <span>Loading scenarios…</span>
              </div>
            ) : (
              <InterventionSelector
                selected={selectedIntervention}
                onSelect={handleSelectIntervention}
                disabled={running}
              />
            )}

            {/* Backend scenario list */}
            {!loading && scenarios.length > 0 && (
              <div className="sl-scenario-list">
                <span className="sl-scenario-list-title">BACKEND SCENARIOS</span>
                {scenarios.map(s => (
                  <button
                    key={s.name}
                    className={`sl-scenario-item ${selectedScenario === s.name ? 'active' : ''}`}
                    onClick={() => handleRunScenario(s.name)}
                    disabled={running}
                  >
                    <span className="sl-scenario-item-name">
                      {s.name.replace(/_/g, ' ')}
                    </span>
                    <span className="sl-scenario-item-desc">
                      {s.description}
                    </span>
                    {selectedScenario === s.name && running && (
                      <Loader2 size={12} className="spin" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Center: Results / Visualization */}
        <div className="sl-panel sl-panel-center">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                className="sl-error"
                key="error"
                variants={fadeSlide}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <AlertTriangle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            {running && (
              <motion.div
                className="sl-running"
                key="running"
                variants={fadeSlide}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Loader2 size={24} className="spin" />
                <span>Running simulation…</span>
                <span className="sl-running-hint">
                  Computing baseline and scenario predictions on 53,802 grid cells
                </span>
              </motion.div>
            )}

            {!running && !error && !result && (
              <motion.div
                className="sl-empty"
                key="empty"
                variants={fadeSlide}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <FlaskConical size={48} color="var(--hs-text-muted)" />
                <h3>Select an Intervention</h3>
                <p>
                  Choose an intervention type from the left panel to run a what-if
                  simulation. The model will compute baseline and scenario predictions
                  for all grid cells.
                </p>
              </motion.div>
            )}

            {!running && result && (
              <ComparisonView key="comparison" result={result} />
            )}
          </AnimatePresence>
        </div>

        {/* Right: Context / Temporal */}
        <motion.div
          className="sl-panel sl-panel-right"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="sl-panel-head">
            <Sparkles size={14} color="var(--hs-purple)" />
            <span className="sl-panel-title">ANALYSIS</span>
          </div>

          <div className="sl-panel-body">
            {/* Workflow steps */}
            <div className="sl-workflow">
              <div className={`sl-workflow-step ${selectedIntervention ? 'done' : ''}`}>
                <div className="sl-workflow-num">1</div>
                <div className="sl-workflow-content">
                  <strong>Select Intervention</strong>
                  <span>Choose what to modify</span>
                </div>
              </div>
              <div className={`sl-workflow-step ${running ? 'active' : result ? 'done' : ''}`}>
                <div className="sl-workflow-num">2</div>
                <div className="sl-workflow-content">
                  <strong>Run Simulation</strong>
                  <span>Backend computes predictions</span>
                </div>
              </div>
              <div className={`sl-workflow-step ${result ? 'done' : ''}`}>
                <div className="sl-workflow-num">3</div>
                <div className="sl-workflow-content">
                  <strong>Compare Results</strong>
                  <span>Baseline vs scenario</span>
                </div>
              </div>
            </div>

            {/* Temporal simulation warning */}
            <button
              className="sl-temporal-toggle"
              onClick={() => setShowTemporal(t => !t)}
            >
              <span>Temporal Simulation</span>
              {showTemporal ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <AnimatePresence>
              {showTemporal && <TemporalWarning />}
            </AnimatePresence>

            {/* Scenario details */}
            {result && (
              <motion.div
                className="sl-details"
                variants={fadeSlide}
                initial="hidden"
                animate="visible"
              >
                <span className="sl-details-title">SCENARIO DETAILS</span>
                <div className="sl-detail-row">
                  <span>Name</span>
                  <strong>{
                    typeof result.scenario === 'string'
                      ? result.scenario.replace(/_/g, ' ')
                      : result.scenario?.name
                        ? result.scenario.name.replace(/_/g, ' ')
                        : '—'
                  }</strong>
                </div>
                <div className="sl-detail-row">
                  <span>Cells</span>
                  <strong>{result.delta?.affected_cells?.toLocaleString() ?? result.baseline?.mean_lst != null ? '—' : '—'}</strong>
                </div>
                <div className="sl-detail-row">
                  <span>Data Source</span>
                  <strong>{result.data_source ?? 'current'}</strong>
                </div>
                {result.snapshot_id && (
                  <div className="sl-detail-row">
                    <span>Snapshot</span>
                    <strong className="sl-detail-id">{result.snapshot_id}</strong>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ScenarioLab;
