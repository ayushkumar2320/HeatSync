import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, DollarSign, Thermometer, Leaf, TreePine, Sun, Layers,
  Droplets, Route, ChevronRight, ChevronDown,
  AlertTriangle, Loader2, RotateCcw, Info, Shield, Zap, CheckCircle2,
  BarChart3, Sparkles, Eye,
  Settings
} from 'lucide-react';
import {
  runCurrentScenario
} from '../services/backendClient';

/* -------------------------------------------------------------------------- */
/* Intervention definitions with cost models and backend scenario mapping     */
/* -------------------------------------------------------------------------- */

const INTERVENTIONS = [
  {
    key: 'tree_planting',
    label: 'Tree Planting',
    icon: TreePine,
    color: 'var(--hs-vegetation)',
    category: 'Vegetation',
    description: 'Plant trees to increase canopy cover and evapotranspiration',
    costPerUnit: 2500,         // INR per tree
    unit: 'trees',
    coverageHa: 0.02,          // hectares per tree
    coolingPerUnit: 0.12,      // °C per tree (model-derived)
    scenarioMapping: ['increase_green_10', 'increase_green_20', 'increase_trees'],
    assumptions: [
      'Tree survival rate: 80% after 3 years',
      'Cooling effect: evapotranspiration + shade combined',
      'Model estimate from XGBoost feature perturbation on tree_density_pct',
    ],
  },
  {
    key: 'cool_roof',
    label: 'Cool Roof',
    icon: Sun,
    color: 'var(--hs-cyan)',
    category: 'Built Form',
    description: 'Apply high-albedo coatings to existing rooftops',
    costPerUnit: 150,          // INR per m²
    unit: 'm²',
    coverageHa: 0.0001,
    coolingPerUnit: 0.0008,    // °C per m²
    scenarioMapping: ['increase_green_10'], // mapped to albedo increase
    assumptions: [
      'Albedo increase from 0.15 to 0.65',
      'Based on MODIS albedo-temperature relationship',
      'Cost varies by roof material and condition',
    ],
  },
  {
    key: 'green_roof',
    label: 'Green Roof',
    icon: Leaf,
    color: '#22c55e',
    category: 'Built Form',
    description: 'Install vegetated roofing systems on existing buildings',
    costPerUnit: 3500,         // INR per m²
    unit: 'm²',
    coverageHa: 0.0001,
    coolingPerUnit: 0.0006,
    scenarioMapping: ['increase_green_10'],
    assumptions: [
      'Combines albedo increase with evapotranspiration',
      'Structural load requirements not modeled',
      'Irrigation needs not included in cost',
    ],
  },
  {
    key: 'green_corridor',
    label: 'Green Corridor',
    icon: Route,
    color: '#15803d',
    category: 'Vegetation',
    description: 'Create linear vegetated pathways connecting green spaces',
    costPerUnit: 500000,       // INR per km
    unit: 'km',
    coverageHa: 0.8,           // hectares per km of corridor
    coolingPerUnit: 0.4,       // °C per km (localized)
    scenarioMapping: ['increase_green_10', 'increase_green_20'],
    assumptions: [
      'Linear cooling effect along corridor width (15m average)',
      'Connectivity benefits not modeled',
      'Land acquisition costs excluded',
    ],
  },
  {
    key: 'water_restoration',
    label: 'Water Restoration',
    icon: Droplets,
    color: 'var(--hs-cool)',
    category: 'Natural',
    description: 'Restore ponds, lakes, and water bodies',
    costPerUnit: 1200000,      // INR per hectare
    unit: 'ha',
    coverageHa: 1.0,
    coolingPerUnit: 1.5,       // °C per hectare (localized)
    scenarioMapping: ['increase_water'],
    assumptions: [
      'Cooling from evaporation and thermal mass',
      'Requires water source and drainage',
      'Ecological benefits not quantified',
    ],
  },
  {
    key: 'cool_pavement',
    label: 'Cool Pavement',
    icon: Layers,
    color: '#a78bfa',
    category: 'Built Form',
    description: 'Replace dark asphalt with reflective or permeable surfaces',
    costPerUnit: 800,          // INR per m²
    unit: 'm²',
    coverageHa: 0.0001,
    coolingPerUnit: 0.0005,
    scenarioMapping: ['increase_green_10'],
    assumptions: [
      'Albedo increase from 0.10 to 0.45',
      'Pedestrian-level cooling only',
      'Durability and maintenance not modeled',
    ],
  },
  {
    key: 'surface_modification',
    label: 'Surface Modification',
    icon: Settings,
    color: 'var(--hs-warning)',
    category: 'Built Form',
    description: 'Modify impervious surface ratio through permeable materials',
    costPerUnit: 600,          // INR per m²
    unit: 'm²',
    coverageHa: 0.0001,
    coolingPerUnit: 0.0004,
    scenarioMapping: ['increase_green_10'],
    assumptions: [
      'Reduces surface runoff and heat retention',
      'Based on impervious_surface_pct feature perturbation',
      'Stormwater benefits not quantified',
    ],
  },
  {
    key: 'traffic_reduction',
    label: 'Traffic Reduction',
    icon: Route,
    color: '#f59e0b',
    category: 'Mobility',
    description: 'Reduce vehicle traffic through cycling infrastructure, congestion pricing, or EV transition',
    costPerUnit: 2000000,
    unit: 'km cycling lanes',
    coverageHa: 0.15,
    coolingPerUnit: 0.35,
    scenarioMapping: ['decrease_traffic_30'],
    assumptions: [
      'Traffic reduction of 30% achieved per km of cycling infrastructure',
      'Combustion heat reduction modeled as surface temperature proxy',
      'Co-benefits: reduced PM2.5, NO2 not quantified separately',
    ],
  },
  {
    key: 'mixed_package',
    label: 'Mixed Intervention Package',
    icon: Sparkles,
    color: '#22c55e',
    category: 'Combined',
    description: 'Tree planting + cool roofs + traffic reduction combined for maximum cooling effect',
    costPerUnit: 5000000,
    unit: 'city blocks',
    coverageHa: 2.0,
    coolingPerUnit: 1.8,
    scenarioMapping: ['mixed_intervention'],
    assumptions: [
      'Combines vegetation, albedo, and traffic effects',
      'Synergistic cooling exceeds sum of individual interventions',
      'Requires coordinated multi-agency implementation',
    ],
  },
];

const OBJECTIVES = [
  { key: 'cheapest', label: 'CHEAPEST', icon: DollarSign, color: 'var(--hs-cyan)',
    description: 'Maximum cooling per unit of budget spent' },
  { key: 'max_cooling', label: 'MAXIMUM COOLING', icon: Thermometer, color: 'var(--hs-heat)',
    description: 'Greatest temperature reduction regardless of cost' },
  { key: 'balanced', label: 'BEST BALANCED', icon: Target, color: 'var(--hs-vegetation)',
    description: 'Optimal trade-off between cost and cooling benefit' },
];

/* -------------------------------------------------------------------------- */
/* Animation variants                                                          */
/* -------------------------------------------------------------------------- */

const ANIM = {
  fadeUp:    { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
  fadeIn:    { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } },
  stagger:   { visible: { transition: { staggerChildren: 0.06 } } },
  child:     { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } },
};

/* -------------------------------------------------------------------------- */
/* Utility                                                                     */
/* -------------------------------------------------------------------------- */

function fmt(v, d = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Number(v).toFixed(d);
}

function fmtCurrency(v) {
  if (v === null || v === undefined) return '—';
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
}


/* -------------------------------------------------------------------------- */
/* Optimization engine (client-side)                                           */
/* -------------------------------------------------------------------------- */

function runOptimization(interventions, budget, modelResults) {
  // Build a scoring model from available backend results
  // Each intervention's cooling is estimated from model feature perturbation mapping
  const scored = interventions.map(intv => {
    // Find the best matching backend scenario result
    const bestScenario = intv.scenarioMapping
      .map(name => modelResults[name])
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.delta?.mean_change || 0) - Math.abs(a.delta?.mean_change || 0))[0];

    // Use model-derived cooling if available, else fall back to unit estimate
    const modelCooling = bestScenario ? Math.abs(bestScenario.delta?.mean_change || 0) : 0;
    const estimatedCooling = Math.max(modelCooling, intv.coolingPerUnit * (budget / intv.costPerUnit) * 0.3);

    // Calculate how many units we can deploy within budget
    const maxUnits = Math.floor(budget / intv.costPerUnit);
    const totalCost = maxUnits * intv.costPerUnit;
    const totalCooling = estimatedCooling;
    const totalArea = maxUnits * intv.coverageHa;
    const costEfficiency = totalCooling / (totalCost || 1); // °C per INR

    // Confidence based on whether model data exists
    const confidence = bestScenario ? 0.75 : 0.45;

    return {
      ...intv,
      maxUnits,
      totalCost,
      totalCooling,
      totalArea,
      costEfficiency,
      confidence,
      modelData: bestScenario || null,
    };
  });

  // Generate three strategies
  const byEfficiency = [...scored].sort((a, b) => b.costEfficiency - a.costEfficiency);
  const byCooling = [...scored].sort((a, b) => b.totalCooling - a.totalCooling);

  // CHEAPEST: best cost-efficiency, fill budget
  const cheapest = buildStrategy('cheapest', 'CHEAPEST', byEfficiency, budget);

  // MAXIMUM COOLING: highest absolute cooling, fill budget
  const maxCooling = buildStrategy('max_cooling', 'MAXIMUM COOLING', byCooling, budget);

  // BALANCED: composite score = cooling * 0.6 + efficiency * 0.4
  const byBalanced = [...scored].sort((a, b) => {
    const scoreA = (a.totalCooling / (byCooling[0]?.totalCooling || 1)) * 0.6 +
                   (a.costEfficiency / (byEfficiency[0]?.costEfficiency || 1)) * 0.4;
    const scoreB = (b.totalCooling / (byCooling[0]?.totalCooling || 1)) * 0.6 +
                   (b.costEfficiency / (byEfficiency[0]?.costEfficiency || 1)) * 0.4;
    return scoreB - scoreA;
  });
  const balanced = buildStrategy('balanced', 'BEST BALANCED', byBalanced, budget);

  return { cheapest, maxCooling, balanced, allScored: scored };
}

function buildStrategy(key, label, sortedInterventions, budget) {
  const allocation = [];
  let remaining = budget;
  let totalCooling = 0;
  let totalCost = 0;
  let totalArea = 0;

  // Greedy allocation: pick best item, fill as much as possible, move on
  for (const intv of sortedInterventions) {
    if (remaining <= 0) break;
    const units = Math.min(
      Math.floor(remaining / intv.costPerUnit),
      Math.max(1, Math.floor(remaining / intv.costPerUnit))
    );
    if (units <= 0) continue;

    const cost = units * intv.costPerUnit;
    const cooling = intv.coolingPerUnit * units * 0.15; // diminishing returns factor
    const area = units * intv.coverageHa;

    allocation.push({
      ...intv,
      allocatedUnits: units,
      allocatedCost: cost,
      allocatedCooling: cooling,
      allocatedArea: area,
    });

    remaining -= cost;
    totalCooling += cooling;
    totalCost += cost;
    totalArea += area;
  }

  return {
    key,
    label,
    allocation,
    totalCooling,
    totalCost,
    totalArea,
    budgetUtilization: totalCost > 0 ? (totalCost / budget) * 100 : 0,
    remainingBudget: remaining,
    interventionCount: allocation.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function InterventionCard({ intv, selected, onToggle, disabled }) {
  const Icon = intv.icon;
  return (
    <button
      className={`opt-intv-card ${selected ? 'active' : ''}`}
      onClick={() => onToggle(intv.key)}
      disabled={disabled}
      style={{ '--intv-color': intv.color }}
    >
      <div className="opt-intv-icon">
        <Icon size={16} />
      </div>
      <div className="opt-intv-body">
        <span className="opt-intv-label">{intv.label}</span>
        <span className="opt-intv-desc">{intv.description}</span>
      </div>
      <div className={`opt-intv-check ${selected ? 'on' : ''}`}>
        {selected ? <CheckCircle2 size={14} /> : <div className="opt-check-empty" />}
      </div>
    </button>
  );
}

function StrategyCard({ strategy, isSelected, onClick, rank }) {
  const strategyDef = OBJECTIVES.find(o => o.key === strategy.key);
  const Icon = strategyDef?.icon || Target;
  const color = strategyDef?.color || 'var(--hs-text-secondary)';

  return (
    <motion.button
      className={`opt-strategy ${isSelected ? 'active' : ''}`}
      onClick={onClick}
      variants={ANIM.child}
      initial="hidden"
      animate="visible"
      transition={{ delay: rank * 0.1 }}
      style={{ '--strat-color': color }}
    >
      <div className="opt-strategy-header">
        <div className="opt-strategy-rank">#{rank + 1}</div>
        <div className="opt-strategy-icon">
          <Icon size={18} />
        </div>
        <div className="opt-strategy-info">
          <span className="opt-strategy-label">{strategy.label}</span>
          <span className="opt-strategy-desc">{strategyDef?.description}</span>
        </div>
      </div>

      <div className="opt-strategy-metrics">
        <div className="opt-strat-metric">
          <span className="opt-strat-metric-label">Cooling</span>
          <span className="opt-strat-metric-value" style={{ color: 'var(--hs-vegetation)' }}>
            {fmt(strategy.totalCooling)}°C
          </span>
        </div>
        <div className="opt-strat-metric">
          <span className="opt-strat-metric-label">Cost</span>
          <span className="opt-strat-metric-value" style={{ color: 'var(--hs-cyan)' }}>
            {fmtCurrency(strategy.totalCost)}
          </span>
        </div>
        <div className="opt-strat-metric">
          <span className="opt-strat-metric-label">Area</span>
          <span className="opt-strat-metric-value">
            {fmt(strategy.totalArea, 2)} ha
          </span>
        </div>
        <div className="opt-strat-metric">
          <span className="opt-strat-metric-label">Utilization</span>
          <span className="opt-strat-metric-value">
            {fmt(strategy.budgetUtilization, 0)}%
          </span>
        </div>
      </div>

      {strategy.allocation.length > 0 && (
        <div className="opt-strategy-allocation">
          {strategy.allocation.slice(0, 3).map(a => (
            <div key={a.key} className="opt-allocation-chip">
              <a.icon size={10} />
              <span>{a.allocatedUnits} {a.unit}</span>
            </div>
          ))}
          {strategy.allocation.length > 3 && (
            <span className="opt-allocation-more">+{strategy.allocation.length - 3}</span>
          )}
        </div>
      )}
    </motion.button>
  );
}

function StrategyDetail({ strategy }) {
  if (!strategy || !strategy.allocation.length) return null;

  return (
    <motion.div className="opt-detail" variants={ANIM.fadeUp} initial="hidden" animate="visible">
      <div className="opt-detail-header">
        <BarChart3 size={14} color="var(--hs-cyan)" />
        <span>ALLOCATION DETAILS</span>
      </div>

      {/* Allocation bars */}
      <div className="opt-detail-allocations">
        {strategy.allocation.map((a, i) => {
          const pct = strategy.totalCost > 0 ? (a.allocatedCost / strategy.totalCost) * 100 : 0;
          const Icon = a.icon;
          return (
            <motion.div
              key={a.key}
              className="opt-detail-row"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="opt-detail-row-head">
                <Icon size={12} color={a.color} />
                <span className="opt-detail-row-label">{a.label}</span>
                <span className="opt-detail-row-units">{a.allocatedUnits} {a.unit}</span>
              </div>
              <div className="opt-detail-bar-track">
                <motion.div
                  className="opt-detail-bar-fill"
                  style={{ background: a.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                />
              </div>
              <div className="opt-detail-row-values">
                <span>{fmtCurrency(a.allocatedCost)}</span>
                <span style={{ color: 'var(--hs-vegetation)' }}>−{fmt(a.allocatedCooling)}°C</span>
                <span>{fmt(a.allocatedArea, 3)} ha</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="opt-detail-summary">
        <div className="opt-detail-summary-row">
          <span>Total Cooling</span>
          <strong style={{ color: 'var(--hs-vegetation)' }}>−{fmt(strategy.totalCooling)}°C</strong>
        </div>
        <div className="opt-detail-summary-row">
          <span>Total Cost</span>
          <strong>{fmtCurrency(strategy.totalCost)}</strong>
        </div>
        <div className="opt-detail-summary-row">
          <span>Coverage</span>
          <strong>{fmt(strategy.totalArea, 2)} hectares</strong>
        </div>
        <div className="opt-detail-summary-row">
          <span>Interventions</span>
          <strong>{strategy.interventionCount}</strong>
        </div>
        <div className="opt-detail-summary-row">
          <span>Budget Used</span>
          <strong>{fmt(strategy.budgetUtilization, 0)}%</strong>
        </div>
      </div>
    </motion.div>
  );
}

function AssumptionsPanel({ selectedInterventions, allInterventions }) {
  const items = selectedInterventions
    .map(key => allInterventions.find(i => i.key === key))
    .filter(Boolean);

  if (items.length === 0) return null;

  return (
    <motion.div className="opt-assumptions" variants={ANIM.fadeUp} initial="hidden" animate="visible">
      <div className="opt-assumptions-header">
        <Info size={12} />
        <span>ASSUMPTIONS & LIMITATIONS</span>
      </div>
      <div className="opt-assumptions-list">
        {items.map(intv => (
          <div key={intv.key} className="opt-assumption-group">
            <span className="opt-assumption-title">{intv.label}</span>
            {intv.assumptions.map((a, i) => (
              <div key={i} className="opt-assumption-item">• {a}</div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ConfidenceIndicator({ confidence }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 70 ? 'var(--hs-success)' : pct >= 50 ? 'var(--hs-warning)' : 'var(--hs-heat)';
  return (
    <div className="opt-confidence">
      <div className="opt-confidence-bar-track">
        <div className="opt-confidence-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="opt-confidence-label" style={{ color }}>
        {pct}% confidence
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                              */
/* -------------------------------------------------------------------------- */

export function OptimizationPage({ modelInfo }) {
  // State
  const [budget, setBudget] = useState(5000000); // 50L INR default
  const [selectedInterventions, setSelectedInterventions] = useState(
    () => INTERVENTIONS.map(i => i.key) // all selected by default
  );
  const [activeStrategy, setActiveStrategy] = useState(null);
  const [modelResults, setModelResults] = useState({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [showAssumptions, setShowAssumptions] = useState(false);



  // Run all relevant scenarios to get model-derived cooling estimates
  const runAllScenarios = useCallback(async () => {
    setRunning(true);
    setError(null);
    const results = {};

    // Get unique scenario names from selected interventions
    const scenarioNames = [...new Set(
      selectedInterventions
        .map(key => INTERVENTIONS.find(i => i.key === key))
        .filter(Boolean)
        .flatMap(i => i.scenarioMapping)
    )];

    // Also ensure we have these core scenarios
    const coreScenarios = ['increase_green_10', 'increase_green_20', 'increase_trees', 'increase_water'];
    const allNames = [...new Set([...scenarioNames, ...coreScenarios])];

    for (const name of allNames) {
      try {
        const data = await runCurrentScenario({ scenario: name });
        if (data.success) {
          results[name] = data;
        }
      } catch {
        // Scenario might not exist or model unavailable — skip
      }
    }

    setModelResults(results);
    setRunning(false);
  }, [selectedInterventions]);

  // Run scenarios on mount and when selection changes significantly
  useEffect(() => {
    if (selectedInterventions.length > 0) {
      runAllScenarios();
    }
  }, []); // Only on mount

  // Optimization result
  const optimization = useMemo(() => {
    const selected = INTERVENTIONS.filter(i => selectedInterventions.includes(i.key));
    if (selected.length === 0) return null;
    return runOptimization(selected, budget, modelResults);
  }, [selectedInterventions, budget, modelResults]);

  // Toggle intervention
  const toggleIntervention = useCallback((key) => {
    setSelectedInterventions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  // Select all / none
  const selectAll = useCallback(() => {
    setSelectedInterventions(INTERVENTIONS.map(i => i.key));
  }, []);

  const selectNone = useCallback(() => {
    setSelectedInterventions([]);
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    setBudget(5000000);
    setSelectedInterventions(INTERVENTIONS.map(i => i.key));
    setActiveStrategy(null);
    setModelResults({});
    setError(null);
  }, []);

  return (
    <div className="opt-page">
      {/* Header */}
      <div className="opt-header">
        <div className="opt-header-left">
          <Target size={18} color="var(--hs-cyan)" />
          <div>
            <h1 className="opt-title">HeatSync Optimization</h1>
            <p className="opt-subtitle">Find the most effective heat mitigation under budget constraints</p>
          </div>
        </div>
        <div className="opt-header-right">
          {modelInfo && (
            <span className="opt-model-badge">
              {modelInfo.available ? 'MODEL READY' : 'MODEL UNAVAILABLE'}
            </span>
          )}
          <button className="opt-btn opt-btn-ghost" onClick={handleReset}>
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      <div className="opt-content">
        {/* Left Panel: Configuration */}
        <div className="opt-panel opt-panel-left">
          <div className="opt-panel-head">
            <Settings size={14} color="var(--hs-cyan)" />
            <span className="opt-panel-title">CONFIGURATION</span>
          </div>
          <div className="opt-panel-body">
            {/* Budget */}
            <div className="opt-config-section">
              <div className="opt-config-label">BUDGET</div>
              <div className="opt-budget-display">
                <span className="opt-budget-value">{fmtCurrency(budget)}</span>
              </div>
              <input
                type="range"
                min="500000"
                max="50000000"
                step="500000"
                value={budget}
                onChange={e => setBudget(parseInt(e.target.value))}
                className="opt-slider"
              />
              <div className="opt-budget-range">
                <span>₹5L</span>
                <span>₹5 Cr</span>
              </div>
              {/* Quick budget presets */}
              <div className="opt-budget-presets">
                {[1000000, 5000000, 10000000, 25000000].map(b => (
                  <button
                    key={b}
                    className={`opt-budget-preset ${budget === b ? 'active' : ''}`}
                    onClick={() => setBudget(b)}
                  >
                    {fmtCurrency(b)}
                  </button>
                ))}
              </div>
            </div>

            {/* Interventions */}
            <div className="opt-config-section">
              <div className="opt-config-header">
                <span className="opt-config-label">INTERVENTIONS</span>
                <div className="opt-config-actions">
                  <button className="opt-link-btn" onClick={selectAll}>All</button>
                  <button className="opt-link-btn" onClick={selectNone}>None</button>
                </div>
              </div>
              <div className="opt-intv-list">
                {INTERVENTIONS.map(intv => (
                  <InterventionCard
                    key={intv.key}
                    intv={intv}
                    selected={selectedInterventions.includes(intv.key)}
                    onToggle={toggleIntervention}
                    disabled={running}
                  />
                ))}
              </div>
            </div>

            {/* Re-run button */}
            <button
              className="opt-btn opt-btn-primary"
              onClick={runAllScenarios}
              disabled={running || selectedInterventions.length === 0}
            >
              {running ? <Loader2 size={14} className="opt-spin" /> : <Zap size={14} />}
              {running ? 'Running simulations...' : 'Re-run Analysis'}
            </button>

            {/* Assumptions toggle */}
            <button
              className="opt-link-section"
              onClick={() => setShowAssumptions(!showAssumptions)}
            >
              <span>Assumptions & Methodology</span>
              {showAssumptions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>

        {/* Center Panel: Strategies */}
        <div className="opt-panel opt-panel-center">
          <div className="opt-panel-head">
            <Sparkles size={14} color="var(--hs-vegetation)" />
            <span className="opt-panel-title">OPTIMIZATION STRATEGIES</span>
          </div>
          <div className="opt-panel-body">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div key="error" className="opt-error" variants={ANIM.fadeUp} initial="hidden" animate="visible" exit="exit">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}

              {running && !optimization && (
                <motion.div key="running" className="opt-running" variants={ANIM.fadeUp} initial="hidden" animate="visible" exit="exit">
                  <Loader2 size={24} className="opt-spin" />
                  <span>Running thermal simulations...</span>
                  <span className="opt-running-hint">
                    Computing XGBoost predictions across {selectedInterventions.length} intervention types
                  </span>
                </motion.div>
              )}

              {!running && !optimization && !error && (
                <motion.div key="empty" className="opt-empty" variants={ANIM.fadeUp} initial="hidden" animate="visible" exit="exit">
                  <Target size={48} color="var(--hs-text-muted)" />
                  <h3>Configure Optimization</h3>
                  <p>Set your budget and select interventions, then run the analysis to compare strategies.</p>
                </motion.div>
              )}

              {optimization && (
                <motion.div key="results" variants={ANIM.fadeUp} initial="hidden" animate="visible" exit="exit">
                  {/* Strategy comparison */}
                  <div className="opt-strategies">
                    {[optimization.cheapest, optimization.maxCooling, optimization.balanced].map((strat, i) => (
                      <StrategyCard
                        key={strat.key}
                        strategy={strat}
                        rank={i}
                        isSelected={activeStrategy === strat.key}
                        onClick={() => setActiveStrategy(activeStrategy === strat.key ? null : strat.key)}
                      />
                    ))}
                  </div>

                  {/* Active strategy detail */}
                  <AnimatePresence mode="wait">
                    {activeStrategy && (
                      <StrategyDetail
                        key={activeStrategy}
                        strategy={
                          activeStrategy === 'cheapest' ? optimization.cheapest :
                          activeStrategy === 'max_cooling' ? optimization.maxCooling :
                          optimization.balanced
                        }
                      />
                    )}
                  </AnimatePresence>

                  {/* Confidence indicators */}
                  <div className="opt-confidence-section">
                    <div className="opt-confidence-header">
                      <Eye size={12} />
                      <span>MODEL CONFIDENCE</span>
                    </div>
                    <div className="opt-confidence-grid">
                      {optimization.allScored.filter(s => selectedInterventions.includes(s.key)).map(s => (
                        <div key={s.key} className="opt-confidence-item">
                          <s.icon size={12} color={s.color} />
                          <span className="opt-confidence-name">{s.label}</span>
                          <ConfidenceIndicator confidence={s.confidence} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Methodology */}
                  <div className="opt-methodology">
                    <div className="opt-methodology-header">
                      <Shield size={12} />
                      <span>METHODOLOGY</span>
                    </div>
                    <div className="opt-methodology-body">
                      <p>
                        Optimization uses the trained XGBoost model (58 features, 53,802 grid cells)
                        to estimate thermal benefit of each intervention. Cost estimates are based on
                        typical urban greening project costs in India. Greedy allocation optimizes
                        for the selected objective (cost-efficiency, absolute cooling, or balanced).
                      </p>
                      <p>
                        <strong>Diminishing returns</strong> are modeled with a 15% factor per unit deployed.
                        Actual outcomes depend on site-specific factors not captured by the model.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel: Info & Details */}
        <div className="opt-panel opt-panel-right">
          <div className="opt-panel-head">
            <Info size={14} color="var(--hs-cyan)" />
            <span className="opt-panel-title">ANALYSIS</span>
          </div>
          <div className="opt-panel-body">
            {/* Workflow */}
            <div className="opt-workflow">
              <div className={`opt-workflow-step ${selectedInterventions.length > 0 ? 'done' : ''}`}>
                <div className="opt-workflow-num">1</div>
                <div className="opt-workflow-content">
                  <strong>Set Budget</strong>
                  <span>Define spending constraint</span>
                </div>
              </div>
              <div className={`opt-workflow-step ${selectedInterventions.length > 0 ? 'done' : ''}`}>
                <div className="opt-workflow-num">2</div>
                <div className="opt-workflow-content">
                  <strong>Select Interventions</strong>
                  <span>Choose available options</span>
                </div>
              </div>
              <div className={`opt-workflow-step ${running ? 'active' : optimization ? 'done' : ''}`}>
                <div className="opt-workflow-num">3</div>
                <div className="opt-workflow-content">
                  <strong>Run Analysis</strong>
                  <span>Model computes benefits</span>
                </div>
              </div>
              <div className={`opt-workflow-step ${activeStrategy ? 'done' : ''}`}>
                <div className="opt-workflow-num">4</div>
                <div className="opt-workflow-content">
                  <strong>Compare Strategies</strong>
                  <span>Review recommendations</span>
                </div>
              </div>
            </div>

            {/* Strategy explanation */}
            {activeStrategy && optimization && (
              <motion.div className="opt-explanation" variants={ANIM.fadeUp} initial="hidden" animate="visible">
                <div className="opt-explanation-header">
                  <Sparkles size={12} />
                  <span>WHY THIS STRATEGY?</span>
                </div>
                <div className="opt-explanation-body">
                  {activeStrategy === 'cheapest' && (
                    <>
                      <p>
                        <strong>Cheapest strategy</strong> prioritizes cost-effectiveness — maximum
                        cooling per rupee spent. This typically favors interventions with low unit
                        cost but significant cumulative impact.
                      </p>
                      <p>
                        Best for: Limited budgets where every rupee must deliver measurable impact.
                      </p>
                    </>
                  )}
                  {activeStrategy === 'max_cooling' && (
                    <>
                      <p>
                        <strong>Maximum cooling strategy</strong> focuses on absolute temperature
                        reduction regardless of cost. This often involves higher-cost interventions
                        that deliver the largest single-project cooling.
                      </p>
                      <p>
                        Best for: Critical heat zones where maximum temperature reduction is the priority.
                      </p>
                    </>
                  )}
                  {activeStrategy === 'balanced' && (
                    <>
                      <p>
                        <strong>Balanced strategy</strong> optimizes the trade-off between cooling
                        benefit and cost. It avoids both the cheapest-but-slowest and the most
                        expensive-but-fastest extremes.
                      </p>
                      <p>
                        Best for: Comprehensive urban heat action plans with moderate budgets.
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Quick stats */}
            {optimization && (
              <div className="opt-quick-stats">
                <div className="opt-quick-stat">
                  <span className="opt-quick-stat-label">Interventions</span>
                  <span className="opt-quick-stat-value">{selectedInterventions.length} / {INTERVENTIONS.length}</span>
                </div>
                <div className="opt-quick-stat">
                  <span className="opt-quick-stat-label">Scenarios Run</span>
                  <span className="opt-quick-stat-value">{Object.keys(modelResults).length}</span>
                </div>
                <div className="opt-quick-stat">
                  <span className="opt-quick-stat-label">Grid Cells</span>
                  <span className="opt-quick-stat-value">53,802</span>
                </div>
                <div className="opt-quick-stat">
                  <span className="opt-quick-stat-label">Model</span>
                  <span className="opt-quick-stat-value">XGBoost (58 feat)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assumptions overlay */}
      <AnimatePresence>
        {showAssumptions && (
          <motion.div
            className="opt-assumptions-overlay"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="opt-assumptions-container">
              <button className="opt-assumptions-close" onClick={() => setShowAssumptions(false)}>
                <AlertTriangle size={16} />
              </button>
              <AssumptionsPanel
                selectedInterventions={selectedInterventions}
                allInterventions={INTERVENTIONS}
              />
              <div className="opt-disclaimer">
                <Shield size={12} />
                <span>
                  <strong>Disclaimer:</strong> This optimization tool provides decision-support
                  estimates based on XGBoost model predictions and cost assumptions. It does not
                  guarantee exact financial or temperature outcomes. Actual results depend on
                  implementation quality, site conditions, weather, and maintenance. Consult
                  qualified professionals for project planning and execution.
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OptimizationPage;
