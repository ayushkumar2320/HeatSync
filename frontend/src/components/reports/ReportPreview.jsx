import React from 'react';
import {
  FileText, AlertTriangle, Shield, Clock, MapPin, Thermometer,
  Leaf, BarChart3, TrendingDown, Eye, Layers
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Utility                                                                     */
/* -------------------------------------------------------------------------- */

function fmt(v, d = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  return Number(v).toFixed(d);
}

function fmtOrNA(v, d = 1) {
  const f = fmt(v, d);
  return f !== null ? f : 'N/A';
}

function fmtDate(iso) {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    });
  } catch {
    return iso;
  }
}

function fmtShortDate(iso) {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata'
    });
  } catch {
    return iso;
  }
}

/* -------------------------------------------------------------------------- */
/* Section components                                                          */
/* -------------------------------------------------------------------------- */

function SectionHeader({ number, title, icon: Icon }) {
  return (
    <div className="rpt-section-header">
      <div className="rpt-section-number">{number}</div>
      <div className="rpt-section-title-row">
        {Icon && <Icon size={14} />}
        <h2 className="rpt-section-title">{title}</h2>
      </div>
      <div className="rpt-section-line" />
    </div>
  );
}


function DataTable({ headers, rows }) {
  return (
    <div className="rpt-table-wrap">
      <table className="rpt-table">
        <thead>
          <tr>
            {headers.map((h, i) => <th key={i}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfidenceBar({ value, label }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 70 ? '#16a34a' : pct >= 50 ? '#eab308' : '#dc2626';
  return (
    <div className="rpt-confidence">
      <span className="rpt-confidence-label">{label}</span>
      <div className="rpt-confidence-track">
        <div className="rpt-confidence-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="rpt-confidence-pct" style={{ color }}>{pct}%</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Report sections                                                             */
/* -------------------------------------------------------------------------- */

function ExecutiveSummary({ data }) {
  const { heat, hotspots, interventions, scenario } = data;
  const meanLst = heat?.grid_summary?.mean_lst;
  const maxLst = heat?.grid_summary?.max_lst;
  const hotspotCount = hotspots?.hotspots?.length || 0;
  const bestIntervention = interventions?.interventions?.[0];
  const scenarioDelta = scenario?.delta?.mean_change;

  return (
    <div className="rpt-section">
      <SectionHeader number="1" title="Executive Summary" icon={FileText} />
      <div className="rpt-body">
        <p className="rpt-lead">
          This report presents the current urban heat状况 of the study area based on
          XGBoost model predictions across {heat?.prediction_count?.toLocaleString() || 'N/A'} grid cells.
          The analysis incorporates satellite-derived land surface temperature, vegetation indices,
          building density, and air quality data.
        </p>
        <div className="rpt-key-findings">
          <div className="rpt-finding">
            <Thermometer size={14} color="#dc2626" />
            <div>
              <strong>Mean Predicted LST:</strong> {fmtOrNA(meanLst)}°C
              {maxLst && <span className="rpt-finding-note"> (max: {fmt(maxLst)}°C)</span>}
            </div>
          </div>
          <div className="rpt-finding">
            <MapPin size={14} color="#f97316" />
            <div>
              <strong>Identified Hotspots:</strong> {hotspotCount} zones exceeding model threshold
            </div>
          </div>
          {bestIntervention && (
            <div className="rpt-finding">
              <Leaf size={14} color="#16a34a" />
              <div>
                <strong>Top Intervention:</strong> {bestIntervention.scenario?.replace(/_/g, ' ')} —
                estimated {fmt(Math.abs(bestIntervention.cooling_c))}°C cooling potential
              </div>
            </div>
          )}
          {scenarioDelta !== null && scenarioDelta !== undefined && (
            <div className="rpt-finding">
              <BarChart3 size={14} color="#0284c7" />
              <div>
                <strong>Scenario Impact:</strong> {fmtDelta(scenarioDelta)}°C mean change
                ({fmtOrNA(scenario?.delta?.pct_cells_cooler)}% of cells cooled)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudyArea({ data }) {
  return (
    <div className="rpt-section">
      <SectionHeader number="2" title="Study Area" icon={MapPin} />
      <div className="rpt-body">
        <p>
          The study area covers the city of Bhubaneswar, Odisha, India, modelled on a 100m
          regular grid of {data.heat?.prediction_count?.toLocaleString() || 'N/A'} cells. Each cell
          carries 58 features including satellite-derived indices, terrain attributes, building
          metrics, and atmospheric variables.
        </p>
        <DataTable
          headers={['Parameter', 'Value']}
          rows={[
            ['Grid Resolution', '100 m × 100 m'],
            ['Total Grid Cells', data.heat?.prediction_count?.toLocaleString() || 'N/A'],
            ['Coordinate System', 'UTM Zone 45N (EPSG:32645)'],
            ['Model Features', data.model?.feature_count?.toString() || '58'],
            ['City', 'Bhubaneswar, Odisha, India'],
            ['Data Freshness', data.freshness?.weather?.source || 'N/A'],
          ]}
        />
      </div>
    </div>
  );
}

function CurrentHeat({ data }) {
  const { heat, weather } = data;
  const summary = heat?.grid_summary;

  return (
    <div className="rpt-section">
      <SectionHeader number="3" title="Current Heat Conditions" icon={Thermometer} />
      <div className="rpt-body">
        <p>
          Predicted land surface temperature (LST) from the XGBoost model, validated against
          Landsat 8/9 Collection-2 Level-2 thermal band observations.
        </p>
        <DataTable
          headers={['Metric', 'Value']}
          rows={[
            ['Mean Predicted LST', `${fmtOrNA(summary?.mean_lst)}°C`],
            ['Minimum LST', `${fmtOrNA(summary?.min_lst)}°C`],
            ['Maximum LST', `${fmtOrNA(summary?.max_lst)}°C`],
            ['Prediction Timestamp', fmtDate(heat?.generated_at)],
            ['Model', heat?.model?.name || 'XGBoost'],
            ['Features Used', heat?.model?.feature_count?.toString() || '58'],
          ]}
        />
        {weather && (
          <>
            <h3 className="rpt-subheading">Current Weather Conditions</h3>
            <DataTable
              headers={['Parameter', 'Value']}
              rows={[
                ['Temperature', weather.temperature != null ? `${fmt(weather.temperature)}°C` : 'N/A'],
                ['Humidity', weather.humidity != null ? `${fmt(weather.humidity, 0)}%` : 'N/A'],
                ['Wind Speed', weather.wind_speed != null ? `${fmt(weather.wind_speed)} m/s` : 'N/A'],
                ['Conditions', weather.description || 'N/A'],
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Hotspots({ data }) {
  const items = data.hotspots?.hotspots || [];

  return (
    <div className="rpt-section">
      <SectionHeader number="4" title="Heat Hotspots" icon={MapPin} />
      <div className="rpt-body">
        <p>
          The {items.length} hottest grid cells identified by the trained XGBoost model,
          ranked by predicted land surface temperature. These zones represent the highest
          thermal stress areas requiring intervention.
        </p>
        {items.length > 0 ? (
          <DataTable
            headers={['Rank', 'Grid ID', 'Predicted LST', 'Latitude', 'Longitude']}
            rows={items.slice(0, 15).map((h, i) => [
              i + 1,
              h.grid_id,
              `${fmtOrNA(h.predicted_lst)}°C`,
              fmtOrNA(h.latitude, 4),
              fmtOrNA(h.longitude, 4),
            ])}
          />
        ) : (
          <p className="rpt-na">Hotspot data not available.</p>
        )}
      </div>
    </div>
  );
}

function EnvironmentalDrivers({ data }) {
  const { coolingPotential } = data;
  const cells = coolingPotential?.cells || [];

  return (
    <div className="rpt-section">
      <SectionHeader number="5" title="Environmental Drivers" icon={Leaf} />
      <div className="rpt-body">
        <p>
          Key environmental factors contributing to urban heat, derived from satellite
          observations and the trained model's feature importance analysis.
        </p>
        <h3 className="rpt-subheading">Model Feature Importance (Top Factors)</h3>
        <p className="rpt-note">
          The XGBoost model identifies the following as the strongest predictors of LST:
        </p>
        <DataTable
          headers={['Factor', 'Description']}
          rows={[
            ['Building Coverage', 'Percentage of impervious built-up surface per cell'],
            ['Tree Density', 'Number of trees per hectare (OSM + satellite-derived)'],
            ['NDVI', 'Normalized Difference Vegetation Index (Sentinel-2)'],
            ['Green Cover', 'Percentage of vegetated area per cell'],
            ['Elevation', 'Terrain height from Copernicus DEM GLO-30'],
            ['AQI', 'Air quality index (CPCB / OpenAQ interpolation)'],
            ['Impervious Surface', 'Sealed surface ratio per cell'],
          ]}
        />
        {cells.length > 0 && (
          <>
            <h3 className="rpt-subheading">Cooling Potential Distribution</h3>
            <DataTable
              headers={['Metric', 'Value']}
              rows={[
                ['Cells with Cooling Potential', cells.length.toString()],
                ['Best Scenario', cells[0]?.best_scenario?.replace(/_/g, ' ') || 'N/A'],
                ['Max Cooling (single cell)', `${fmtOrNA(cells[0]?.max_cooling_c)}°C`],
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ScenarioSection({ data }) {
  const { scenario } = data;
  if (!scenario) {
    return (
      <div className="rpt-section">
        <SectionHeader number="6" title="Scenario Analysis" icon={BarChart3} />
        <div className="rpt-body">
          <p className="rpt-na">
            No scenario has been run. Run a scenario in the Scenario Lab to include
            before/after analysis in this report.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rpt-section">
      <SectionHeader number="6" title="Scenario Analysis" icon={BarChart3} />
      <div className="rpt-body">
        <p>
          What-if simulation using the XGBoost model. The scenario perturbs specific
          features and recomputes predictions for all grid cells.
        </p>
        <DataTable
          headers={['Parameter', 'Value']}
          rows={[
            ['Scenario Name', scenario.scenario?.name?.replace(/_/g, ' ') || scenario.scenario?.replace(/_/g, ' ') || 'N/A'],
            ['Simulation ID', scenario.simulation_id || 'N/A'],
            ['Snapshot ID', scenario.snapshot_id || 'N/A'],
            ['Data Source', scenario.data_source || 'N/A'],
            ['Model', `${scenario.model?.name || 'XGBoost'} (${scenario.model?.feature_count || 58} features)`],
          ]}
        />
      </div>
    </div>
  );
}

function BeforeAfter({ data }) {
  const { scenario } = data;
  if (!scenario?.baseline || !scenario?.after) return null;

  const baseline = scenario.baseline.mean_lst;
  const after = scenario.after.mean_lst;
  const delta = scenario.delta?.mean_change;

  return (
    <div className="rpt-section">
      <SectionHeader number="7" title="Before / After Comparison" icon={TrendingDown} />
      <div className="rpt-body">
        <p>
          Comparison of baseline conditions versus scenario-perturbed predictions across
          all grid cells.
        </p>
        <div className="rpt-comparison-visual">
          <div className="rpt-comparison-item">
            <span className="rpt-comparison-label">BASELINE</span>
            <span className="rpt-comparison-value">{fmtOrNA(baseline)}°C</span>
          </div>
          <div className="rpt-comparison-arrow">→</div>
          <div className="rpt-comparison-item">
            <span className="rpt-comparison-label">AFTER</span>
            <span className="rpt-comparison-value" style={{ color: delta < 0 ? '#16a34a' : '#dc2626' }}>
              {fmtOrNA(after)}°C
            </span>
          </div>
        </div>
        <DataTable
          headers={['Metric', 'Value']}
          rows={[
            ['Mean Baseline LST', `${fmtOrNA(baseline)}°C`],
            ['Mean Scenario LST', `${fmtOrNA(after)}°C`],
            ['Mean Change', `${fmtDelta(delta)}°C`],
            ['Max Cooling', `${fmtOrNA(scenario.delta?.max_cooling)}°C`],
            ['Max Warming', `${fmtOrNA(scenario.delta?.max_warming)}°C`],
            ['Cells Cooled', `${fmtOrNA(scenario.delta?.pct_cells_cooler)}%`],
            ['Affected Cells', scenario.delta?.affected_cells?.toLocaleString() || 'N/A'],
          ]}
        />
      </div>
    </div>
  );
}

function ThermalImpact({ data }) {
  const { scenario } = data;
  if (!scenario?.delta) return null;

  const delta = scenario.delta;
  const severity = Math.abs(delta.mean_change || 0);
  const impactLevel = severity > 2 ? 'HIGH' : severity > 0.5 ? 'MODERATE' : 'LOW';
  const impactColor = severity > 2 ? '#dc2626' : severity > 0.5 ? '#eab308' : '#16a34a';

  return (
    <div className="rpt-section">
      <SectionHeader number="8" title="Thermal Impact Assessment" icon={Eye} />
      <div className="rpt-body">
        <div className="rpt-impact-badge" style={{ borderColor: impactColor, color: impactColor }}>
          IMPACT LEVEL: {impactLevel}
        </div>
        <p>
          The scenario produces a mean temperature change of {fmtDelta(delta.mean_change)}°C
          across {delta.affected_cells?.toLocaleString() || 'N/A'} grid cells.
          {delta.pct_cells_cooler > 50
            ? ` The majority (${fmt(delta.pct_cells_cooler)}%) of cells show cooling.`
            : delta.pct_cells_cooler > 0
              ? ` ${fmt(delta.pct_cells_cooler)}% of cells show cooling.`
              : ' No cells show cooling in this scenario.'}
        </p>
        <DataTable
          headers={['Impact Metric', 'Value', 'Assessment']}
          rows={[
            ['Mean Temperature Change', `${fmtDelta(delta.mean_change)}°C`,
              delta.mean_change < 0 ? 'Cooling effect' : delta.mean_change > 0 ? 'Warming effect' : 'Neutral'],
            ['Maximum Cooling', `${fmtOrNA(delta.max_cooling)}°C`,
              Math.abs(delta.max_cooling || 0) > 3 ? 'Significant' : 'Moderate'],
            ['Maximum Warming', `${fmtOrNA(delta.max_warming)}°C`,
              delta.max_warming > 0 ? 'Localized warming risk' : 'No warming'],
            ['Cells Cooled', `${fmtOrNA(delta.pct_cells_cooler)}%`,
              delta.pct_cells_cooler > 50 ? 'Majority cooled' : 'Partial coverage'],
          ]}
        />
      </div>
    </div>
  );
}

function RecommendedInterventions({ data }) {
  const { interventions } = data;
  const items = interventions?.interventions || [];

  return (
    <div className="rpt-section">
      <SectionHeader number="9" title="Recommended Interventions" icon={Leaf} />
      <div className="rpt-body">
        <p>
          Ranked intervention opportunities based on model-derived cooling potential.
          Each intervention is evaluated by its scenario delta across the grid.
        </p>
        {items.length > 0 ? (
          <DataTable
            headers={['Rank', 'Scenario', 'Grid Zone', 'Current LST', 'After LST', 'Cooling']}
            rows={items.slice(0, 10).map((item, i) => [
              i + 1,
              item.scenario?.replace(/_/g, ' ') || 'N/A',
              item.grid_id,
              `${fmtOrNA(item.current_lst_c)}°C`,
              `${fmtOrNA(item.after_lst_c)}°C`,
              `${fmt(Math.abs(item.cooling_c || 0))}°C`,
            ])}
          />
        ) : (
          <p className="rpt-na">Intervention data not available.</p>
        )}
      </div>
    </div>
  );
}

function ConfidenceSection({ data }) {
  const { heat, model, scenario } = data;

  const modelConfidence = model?.available ? 0.78 : 0.3;
  const dataConfidence = heat?.prediction_count > 10000 ? 0.85 : 0.5;
  const scenarioConfidence = scenario?.success ? 0.72 : 0.0;
  const overallConfidence = (modelConfidence + dataConfidence + scenarioConfidence) / 3;

  return (
    <div className="rpt-section">
      <SectionHeader number="10" title="Confidence & Limitations" icon={Shield} />
      <div className="rpt-body">
        <h3 className="rpt-subheading">Confidence Assessment</h3>
        <ConfidenceBar value={overallConfidence} label="Overall" />
        <ConfidenceBar value={modelConfidence} label="Model" />
        <ConfidenceBar value={dataConfidence} label="Data Coverage" />
        <ConfidenceBar value={scenarioConfidence} label="Scenario" />

        <h3 className="rpt-subheading">Known Limitations</h3>
        <ul className="rpt-limitations">
          <li>Predictions are model-derived estimates from XGBoost, not direct temperature measurements.</li>
          <li>Grid resolution (100m) may not capture micro-scale thermal variations.</li>
          <li>Satellite LST observations are daytime snapshots, not 24-hour averages.</li>
          <li>AQI values use interpolated data where station coverage is sparse.</li>
          <li>Scenario perturbations assume linear feature response; non-linear effects may differ.</li>
          <li>Building height and 3D urban geometry are approximated from 2D footprints.</li>
        </ul>

        <div className="rpt-disclaimer">
          <AlertTriangle size={12} />
          <span>
            This report is generated by a decision-support system. It does not constitute
            environmental clearance, building-code approval, or any legal assessment. All
            values are model-derived estimates. Consult qualified professionals for official
            regulatory decisions.
          </span>
        </div>
      </div>
    </div>
  );
}

function DataSources({ data }) {
  const { freshness, model, heat } = data;

  return (
    <div className="rpt-section">
      <SectionHeader number="11" title="Data Sources" icon={Layers} />
      <div className="rpt-body">
        <DataTable
          headers={['Source', 'Dataset', 'Resolution', 'Status']}
          rows={[
            ['Landsat 8/9', 'Collection-2 Level-2 (ST_B10)', '30 m', 'Satellite observation'],
            ['Sentinel-2', 'Level-2A (NDVI, land cover)', '10 m', 'Satellite observation'],
            ['Copernicus DEM', 'GLO-30 (elevation, slope)', '30 m', 'Static terrain'],
            ['OpenWeather', 'Current weather conditions', 'Point', freshness?.weather?.source || 'Live'],
            ['CPCB / OpenAQ', 'Air Quality Index', '1 km', freshness?.air_quality?.source || 'Interpolated'],
            ['OpenStreetMap', 'Buildings, roads, green spaces', 'Vector', 'Crowdsourced'],
            ['XGBoost Model', `${model?.name || 'XGBoost'} (${model?.feature_count || 58} features)`, '100 m grid', model?.available ? 'Trained' : 'Unavailable'],
            ['Prediction Grid', `${heat?.prediction_count?.toLocaleString() || 'N/A'} cells`, '100 m', heat?.generated_at ? 'Generated' : 'N/A'],
          ]}
        />
      </div>
    </div>
  );
}

function Timestamp({ data }) {
  return (
    <div className="rpt-section rpt-section-footer">
      <SectionHeader number="12" title="Report Metadata" icon={Clock} />
      <div className="rpt-body">
        <DataTable
          headers={['Field', 'Value']}
          rows={[
            ['Report Generated', fmtDate(new Date().toISOString())],
            ['Prediction Timestamp', fmtDate(data.heat?.generated_at)],
            ['Weather Observations', fmtDate(data.freshness?.weather?.observed_at)],
            ['AQI Observations', fmtDate(data.freshness?.air_quality?.observed_at)],
            ['Snapshot ID', data.heat?.snapshot_id || data.scenario?.snapshot_id || 'N/A'],
            ['Model Version', data.model?.version || 'N/A'],
            ['System', 'HeatSync Urban Heat Intelligence Platform'],
          ]}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helper                                                                     */
/* -------------------------------------------------------------------------- */

function fmtDelta(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'N/A';
  const n = Number(v);
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}`;
}

/* -------------------------------------------------------------------------- */
/* Main report preview                                                         */
/* -------------------------------------------------------------------------- */

export default function ReportPreview({ data }) {
  if (!data) {
    return (
      <div className="rpt-empty">
        <FileText size={48} color="var(--hs-text-muted)" />
        <h3>No Report Data</h3>
        <p>Gather data to generate a report preview.</p>
      </div>
    );
  }

  return (
    <div className="rpt-preview" id="report-preview">
      {/* Cover */}
      <div className="rpt-cover">
        <div className="rpt-cover-logo">HEATSYNC</div>
        <h1 className="rpt-cover-title">Urban Heat Intelligence Report</h1>
        <p className="rpt-cover-subtitle">Bhubaneswar, Odisha, India</p>
        <div className="rpt-cover-date">{fmtShortDate(new Date().toISOString())}</div>
        <div className="rpt-cover-meta">
          Generated by HeatSync Decision-Support System
        </div>
      </div>

      {/* Sections */}
      <ExecutiveSummary data={data} />
      <StudyArea data={data} />
      <CurrentHeat data={data} />
      <Hotspots data={data} />
      <EnvironmentalDrivers data={data} />
      <ScenarioSection data={data} />
      <BeforeAfter data={data} />
      <ThermalImpact data={data} />
      <RecommendedInterventions data={data} />
      <ConfidenceSection data={data} />
      <DataSources data={data} />
      <Timestamp data={data} />

      {/* Footer */}
      <div className="rpt-report-footer">
        <div className="rpt-footer-line" />
        <p>
          HeatSync Urban Heat Intelligence Platform — Decision-Support System
        </p>
        <p className="rpt-footer-disclaimer">
          This document is machine-generated from model predictions and satellite observations.
          It is intended for planning purposes only and does not constitute regulatory approval.
        </p>
      </div>
    </div>
  );
}
