import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Loader2, AlertTriangle, RotateCcw,
  Thermometer, BarChart3, Eye, Printer
} from 'lucide-react';
import {
  fetchCurrentHeatPredictions, fetchModelInfo, fetchScenarios,
  runCurrentScenario, fetchCurrentHeat
} from '../services/backendClient';
import {
  fetchCoolingPotential, fetchInterventions
} from '../services/cityClient';
import ReportPreview from '../components/reports/ReportPreview';

/* -------------------------------------------------------------------------- */
/* Report types                                                                */
/* -------------------------------------------------------------------------- */

const REPORT_TYPES = [
  {
    key: 'current',
    label: 'Current Heat Assessment',
    icon: Thermometer,
    description: 'Current thermal conditions, hotspots, and environmental drivers',
    sections: [1, 2, 3, 4, 5, 10, 11, 12],
  },
  {
    key: 'scenario',
    label: 'Scenario Impact Report',
    icon: BarChart3,
    description: 'Before/after comparison for a selected intervention scenario',
    sections: [1, 2, 3, 6, 7, 8, 10, 11, 12],
  },
  {
    key: 'full',
    label: 'Comprehensive Report',
    icon: Eye,
    description: 'Complete analysis with all sections including interventions',
    sections: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
];

const SCENARIO_PRESETS = [
  { key: 'increase_green_10', label: 'Moderate Greening (+10% green)' },
  { key: 'increase_green_20', label: 'Aggressive Greening (+20% green)' },
  { key: 'increase_trees', label: 'Tree Planting' },
  { key: 'increase_water', label: 'Water Bodies' },
  { key: 'decrease_buildings_10', label: 'Light Densification' },
  { key: 'decrease_buildings_20', label: 'Heavy Densification' },
];

/* -------------------------------------------------------------------------- */
/* Animation                                                                   */
/* -------------------------------------------------------------------------- */

const ANIM = {
  fadeUp: { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
};

/* -------------------------------------------------------------------------- */
/* Main component                                                              */
/* -------------------------------------------------------------------------- */

export function ReportsPage(_props) {
  const { currentPrediction } = _props;
  // Report config
  const [reportType, setReportType] = useState('current');
  const [selectedScenario, setSelectedScenario] = useState('increase_green_10');

  // Data state
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  // Available scenarios
  const [scenarios, setScenarios] = useState([]);

  // Load scenarios
  useEffect(() => {
    fetchScenarios()
      .then(data => setScenarios(data || []))
      .catch(() => {});
  }, []);

  // Gather all data for the report
  const gatherData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReportData(null);
    setProgress('Initializing...');

    const data = {};

    try {
      // Step 1: Model info
      setProgress('Loading model information...');
      try {
        data.model = await fetchModelInfo();
      } catch {
        data.model = { available: false };
      }

      // Step 2: Current heat predictions
      setProgress('Fetching heat predictions (53,802 cells)...');
      try {
        data.heat = await fetchCurrentHeatPredictions();
      } catch {
        // Fallback to single prediction
        try {
          const single = await fetchCurrentHeat();
          data.heat = {
            prediction_count: 0,
            grid_summary: single?.prediction ? {
              mean_lst: single.prediction.predicted_lst,
              min_lst: single.prediction.predicted_lst,
              max_lst: single.prediction.predicted_lst,
            } : null,
            generated_at: single?.generated_at,
            model: single?.model,
          };
        } catch {
          data.heat = null;
        }
      }

      // Step 3: Weather (from current prediction prop)
      if (currentPrediction) {
        data.weather = currentPrediction.weather || null;
      }

      // Step 4: Hotspots
      setProgress('Identifying heat hotspots...');
      try {
        const { fetchJson } = await import('../services/backendClient');
        data.hotspots = await fetchJson('/city/hotspots?limit=20');
      } catch {
        data.hotspots = { hotspots: [] };
      }

      // Step 5: Cooling potential
      setProgress('Computing cooling potential...');
      try {
        data.coolingPotential = await fetchCoolingPotential();
      } catch {
        data.coolingPotential = { cells: [] };
      }

      // Step 6: Interventions
      setProgress('Ranking interventions...');
      try {
        data.interventions = await fetchInterventions(10);
      } catch {
        data.interventions = { interventions: [] };
      }

      // Step 7: Environment summary
      setProgress('Loading environment summary...');
      try {
        const { fetchEnvironmentSummary } = await import('../services/thematicData');
        data.environment = await fetchEnvironmentSummary();
      } catch {
        data.environment = null;
      }

      // Step 8: Freshness
      setProgress('Checking data freshness...');
      try {
        const { fetchJson } = await import('../services/backendClient');
        data.freshness = await fetchJson('/live/snapshot');
      } catch {
        data.freshness = { weather: {}, air_quality: {} };
      }

      // Step 9: Scenario (if needed)
      if (reportType === 'scenario' || reportType === 'full') {
        setProgress(`Running scenario simulation (${selectedScenario})...`);
        try {
          data.scenario = await runCurrentScenario({ scenario: selectedScenario });
        } catch {
          data.scenario = null;
        }
      }

      setReportData(data);
      setProgress('Report ready');
    } catch (err) {
      setError(err.message || 'Failed to gather report data');
    } finally {
      setLoading(false);
    }
  }, [reportType, selectedScenario, currentPrediction]);

  // PDF export (print-based)
  const handleExportPDF = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked. Please allow popups for PDF export.');
      return;
    }

    const previewEl = document.getElementById('report-preview');
    if (!previewEl) return;

    // Get the CSS
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>HeatSync Report</title>
        ${styles}
        <style>
          @page { margin: 15mm; size: A4; }
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { margin: 0; padding: 0; font-family: 'IBM Plex Sans', -apple-system, sans-serif; }
          .rpt-preview { max-width: 100%; padding: 0; }
        </style>
      </head>
      <body>
        ${previewEl.outerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, []);

  return (
    <div className="hs-page-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <motion.div className="hs-page-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <FileText size={20} color="var(--hs-blue)" />
        <div>
          <h1 className="hs-display" style={{ fontSize: 'var(--hs-text-2xl)' }}>Reports</h1>
          <p className="hs-body" style={{ fontSize: 'var(--hs-text-sm)' }}>
            Professional urban heat intelligence reports from model predictions
          </p>
        </div>
      </motion.div>

      <div className="rpt-workspace">
        {/* Left: Configuration */}
        <div className="rpt-config-panel">
          <div className="rpt-config-section">
            <div className="rpt-config-label">REPORT TYPE</div>
            {REPORT_TYPES.map(rt => {
              const Icon = rt.icon;
              return (
                <button
                  key={rt.key}
                  className={`rpt-type-btn ${reportType === rt.key ? 'active' : ''}`}
                  onClick={() => setReportType(rt.key)}
                  disabled={loading}
                >
                  <Icon size={14} />
                  <div className="rpt-type-info">
                    <span className="rpt-type-label">{rt.label}</span>
                    <span className="rpt-type-desc">{rt.description}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {(reportType === 'scenario' || reportType === 'full') && (
            <div className="rpt-config-section">
              <div className="rpt-config-label">SCENARIO</div>
              <select
                className="rpt-select"
                value={selectedScenario}
                onChange={e => setSelectedScenario(e.target.value)}
                disabled={loading}
              >
                {SCENARIO_PRESETS.map(sp => (
                  <option key={sp.key} value={sp.key}>{sp.label}</option>
                ))}
                {scenarios.filter(s => !SCENARIO_PRESETS.find(p => p.key === s.name)).map(s => (
                  <option key={s.name} value={s.name}>{s.name.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}

          <div className="rpt-config-section">
            <div className="rpt-config-label">INCLUDE SECTIONS</div>
            <div className="rpt-section-chips">
              {REPORT_TYPES.find(rt => rt.key === reportType)?.sections.map(s => (
                <span key={s} className="rpt-section-chip">
                  {s}. {['', 'Executive Summary', 'Study Area', 'Current Heat', 'Hotspots',
                    'Environmental Drivers', 'Scenario Analysis', 'Before/After',
                    'Thermal Impact', 'Interventions', 'Confidence', 'Data Sources', 'Metadata'][s]}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="rpt-actions">
            <button
              className="rpt-btn rpt-btn-primary"
              onClick={gatherData}
              disabled={loading}
            >
              {loading ? <Loader2 size={14} className="rpt-spin" /> : <Eye size={14} />}
              {loading ? 'Generating...' : 'Generate Report'}
            </button>

            {reportData && (
              <>
                <button
                  className="rpt-btn rpt-btn-export"
                  onClick={handleExportPDF}
                >
                  <Printer size={14} />
                  Export PDF
                </button>
                <button
                  className="rpt-btn rpt-btn-ghost"
                  onClick={() => { setReportData(null); setError(null); }}
                >
                  <RotateCcw size={14} />
                  Clear
                </button>
              </>
            )}
          </div>

          {/* Progress */}
          {loading && progress && (
            <div className="rpt-progress">
              <Loader2 size={12} className="rpt-spin" />
              <span>{progress}</span>
            </div>
          )}

          {error && (
            <div className="rpt-error">
              <AlertTriangle size={12} />
              <span>{error}</span>
            </div>
          )}

          {/* Data summary */}
          {reportData && !loading && (
            <div className="rpt-data-summary">
              <div className="rpt-config-label">DATA LOADED</div>
              <div className="rpt-summary-row">
                <span>Predictions</span>
                <span>{reportData.heat?.prediction_count?.toLocaleString() || 'N/A'} cells</span>
              </div>
              <div className="rpt-summary-row">
                <span>Hotspots</span>
                <span>{reportData.hotspots?.hotspots?.length || 0}</span>
              </div>
              <div className="rpt-summary-row">
                <span>Interventions</span>
                <span>{reportData.interventions?.interventions?.length || 0}</span>
              </div>
              {reportData.scenario && (
                <div className="rpt-summary-row">
                  <span>Scenario</span>
                  <span>{
                    typeof reportData.scenario.scenario === 'string'
                      ? reportData.scenario.scenario.replace(/_/g, ' ')
                      : reportData.scenario.scenario?.name
                        ? reportData.scenario.scenario.name.replace(/_/g, ' ')
                        : 'Run'
                  }</span>
                </div>
              )}
              <div className="rpt-summary-row">
                <span>Model</span>
                <span>{reportData.model?.available ? 'Ready' : 'N/A'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="rpt-preview-panel">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="loading" className="rpt-preview-loading" variants={ANIM.fadeUp} initial="hidden" animate="visible" exit="exit">
                <Loader2 size={32} className="rpt-spin" />
                <span>Gathering data from all sources...</span>
                <span className="rpt-loading-hint">{progress}</span>
              </motion.div>
            )}

            {!loading && !reportData && (
              <motion.div key="empty" className="rpt-preview-empty" variants={ANIM.fadeUp} initial="hidden" animate="visible" exit="exit">
                <FileText size={48} color="var(--hs-text-muted)" />
                <h3>Configure and Generate</h3>
                <p>Select a report type and click Generate to create a professional urban heat intelligence report.</p>
              </motion.div>
            )}

            {!loading && reportData && (
              <motion.div key="report" variants={ANIM.fadeUp} initial="hidden" animate="visible" exit="exit" style={{ flex: 1, overflow: 'auto' }}>
                <ReportPreview data={reportData} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
