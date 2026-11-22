import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Satellite, Thermometer, Leaf, Droplets, Building2,
  Activity, AlertTriangle, Eye, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import SatelliteLayerViewer from '../components/satellite/SatelliteLayerViewer';
import ObservationTimeline from '../components/satellite/ObservationTimeline';
import LayerMetadata from '../components/satellite/LayerMetadata';
import IndexLegend from '../components/satellite/IndexLegend';

/* -------------------------------------------------------------------------- */
/* Real overlay definitions from overlays.json                                */
/* -------------------------------------------------------------------------- */
const OVERLAY_DEFS = {
  lst: {
    key: 'lst',
    icon: Thermometer,
    color: 'var(--hs-heat)',
    title: 'Land Surface Temperature',
    shortTitle: 'LST',
    description: 'Observed land surface temperature from thermal infrared band (Band 10). This is surface skin temperature, not air temperature.',
    source: 'Landsat 8/9 Collection-2 Level-2 (ST_B10)',
    resolution: '30 m',
    unit: '°C',
    type: 'continuous',
  },
  ndvi: {
    key: 'ndvi',
    icon: Leaf,
    color: 'var(--hs-vegetation)',
    title: 'Normalized Difference Vegetation Index',
    shortTitle: 'NDVI',
    description: 'Normalized difference of near-infrared and red bands. Values range from −1 to +1; healthy vegetation typically > 0.30.',
    source: 'Sentinel-2 Level-2A',
    resolution: '10 m',
    unit: 'index',
    type: 'continuous',
  },
  ndwi: {
    key: 'ndwi',
    icon: Droplets,
    color: 'var(--hs-water)',
    title: 'Normalized Difference Water Index',
    shortTitle: 'NDWI',
    description: 'Water body detection using green and near-infrared bands. Values > 0.3 indicate open water.',
    source: 'Sentinel-2 Level-2A (not yet processed)',
    resolution: '10 m',
    unit: 'index',
    type: 'continuous',
    available: false,
    unavailableReason: 'NDWI has not been computed by the GIS pipeline. Run gis-engine with NDWI band math enabled.',
  },
  landcover: {
    key: 'landcover',
    icon: Layers,
    color: 'var(--hs-infrastructure)',
    title: 'Land Cover Classification',
    shortTitle: 'Land Cover',
    description: 'Rule-based classification from NDVI thresholds: Water (< 0.05), Built-up (0.05–0.15), Bare Land (0.15–0.30), Vegetation (≥ 0.30).',
    source: 'Sentinel-2 Level-2A (rule-based)',
    resolution: '10 m',
    unit: 'class',
    type: 'categorical',
  },
  builtup: {
    key: 'builtup',
    icon: Building2,
    color: 'var(--hs-infrastructure)',
    title: 'Built-up Area',
    shortTitle: 'Built-up',
    description: 'Impervious surface detection from spectral indices. Derived from Sentinel-2 bands using built-up index thresholds.',
    source: 'Sentinel-2 (not yet processed)',
    resolution: '10 m',
    unit: 'class',
    type: 'categorical',
    available: false,
    unavailableReason: 'Dedicated built-up layer has not been generated. Land Cover classification includes built-up as one category.',
  },
  vegstress: {
    key: 'vegetation_density',
    icon: Activity,
    color: 'var(--hs-warning)',
    title: 'Vegetation Stress Index',
    shortTitle: 'Veg. Stress',
    description: 'Vegetation density classification derived from NDVI. Low density (< 0.10) indicates stressed or absent vegetation; high (> 0.60) indicates dense canopy.',
    source: 'Sentinel-2 Level-2A (NDVI-derived classes)',
    resolution: '10 m',
    unit: 'class',
    type: 'categorical',
  },
};

const SECTION_ORDER = ['lst', 'ndvi', 'ndwi', 'landcover', 'builtup', 'vegstress'];

/* -------------------------------------------------------------------------- */
/* Single observation section                                                 */
/* -------------------------------------------------------------------------- */
function ObservationSection({ def, overlayMeta, isExpanded, onToggle }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const Icon = def.icon;
  const isAvailable = def.available !== false && !!overlayMeta;
  const dateMeta = overlayMeta || null;

  return (
    <motion.div
      className={`sat-section ${isExpanded ? 'expanded' : ''}`}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Section header */}
      <button className="sat-section-header" onClick={onToggle}>
        <div className="sat-section-header-left">
          <div className="sat-section-icon" style={{ background: isAvailable ? def.color : 'var(--hs-bg-tertiary)' }}>
            <Icon size={16} color={isAvailable ? '#fff' : 'var(--hs-text-muted)'} />
          </div>
          <div className="sat-section-titles">
            <h2 className="sat-section-title">{def.title}</h2>
            <div className="sat-section-meta-line">
              <span className="sat-section-source">{def.source}</span>
              <span className="sat-section-sep">·</span>
              <span className="sat-section-res">{def.resolution}</span>
              {!isAvailable && (
                <>
                  <span className="sat-section-sep">·</span>
                  <span className="sat-section-unavail-tag">
                    <AlertTriangle size={10} /> UNAVAILABLE
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="sat-section-header-right">
          {isAvailable && (
            <span className="sat-section-value-range" style={{ color: def.color }}>
              {overlayMeta.vmin?.toFixed(1)} – {overlayMeta.vmax?.toFixed(1)} {def.unit}
            </span>
          )}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="sat-section-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="sat-section-content">
              {/* Large imagery viewer */}
              <div className="sat-section-viewer">
                {isAvailable ? (
                  <SatelliteLayerViewer
                    overlayMeta={overlayMeta}
                    layerKey={`sat-${def.key}`}
                    opacity={85}
                  />
                ) : (
                  <div className="sat-section-unavailable">
                    <AlertTriangle size={32} style={{ color: 'var(--hs-text-muted)' }} />
                    <p>{def.unavailableReason || 'Data unavailable for this layer.'}</p>
                    <code>python gis-engine/main.py</code>
                  </div>
                )}
              </div>

              {/* Right sidebar: metadata + legend */}
              <div className="sat-section-sidebar">
                {/* Description */}
                <div className="sat-section-desc">
                  <Eye size={12} />
                  <p>{def.description}</p>
                </div>

                {/* Layer metadata */}
                <LayerMetadata
                  title={def.shortTitle}
                  source={def.source}
                  resolution={def.resolution}
                  date={dateMeta?.date || overlayMeta?.generated_at || null}
                  cloudCover={dateMeta?.cloud_cover}
                  validPixels={dateMeta?.valid_pixel_pct}
                  sceneId={dateMeta?.scene_id}
                  vmin={overlayMeta?.vmin}
                  vmax={overlayMeta?.vmax}
                  unit={def.unit}
                  available={isAvailable}
                  unavailableReason={def.unavailableReason}
                />

                {/* Index legend */}
                {isAvailable && overlayMeta?.stops && (
                  <IndexLegend
                    title={def.shortTitle}
                    type={overlayMeta.type || def.type}
                    stops={overlayMeta.stops}
                    unit={def.unit}
                    vmin={overlayMeta.vmin}
                    vmax={overlayMeta.vmax}
                    note={def.key === 'lst' ? 'Satellite-observed LST — not air temperature' : undefined}
                  />
                )}

                {/* Timeline for LST (has real Landsat dates) */}
                {def.key === 'lst' && isAvailable && (
                  <ObservationTimeline
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ======================================================================== */
/* Main Satellite Page                                                       */
/* ======================================================================== */
export function SatellitePage() {
  const [overlays, setOverlays] = useState({});
  const [expandedSection, setExpandedSection] = useState('lst');

  // Load overlay metadata from overlays.json
  useEffect(() => {
    fetch('/overlays/overlays.json')
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((data) => {
        const map = {};
        Object.values(data.overlays || {}).forEach((o) => { map[o.key] = o; });
        setOverlays(map);
      })
      .catch(() => {});
  }, []);

  // Fetch date metadata when LST timeline date changes
  // (handled inside ObservationTimeline now)

  return (
    <div className="sat-page">
      {/* Page header */}
      <motion.div
        className="sat-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Satellite size={22} color="var(--hs-cool)" />
        <div>
          <h1 className="hs-display" style={{ fontSize: 'var(--hs-text-2xl)' }}>Satellite Analytics</h1>
          <p className="hs-body" style={{ fontSize: 'var(--hs-text-sm)', color: 'var(--hs-text-tertiary)' }}>
            Earth observation data — Landsat 8/9 thermal, Sentinel-2 multispectral
          </p>
        </div>
        <div className="sat-header-badges">
          <span className="sat-badge sat-badge-landsat">LANDSAT 8/9</span>
          <span className="sat-badge sat-badge-sentinel">SENTINEL-2</span>
        </div>
      </motion.div>

      {/* Quick status bar */}
      <div className="sat-status-bar">
        {SECTION_ORDER.map((key) => {
          const def = OVERLAY_DEFS[key];
          const Icon = def.icon;
          return (
            <button
              key={key}
              className={`sat-status-item ${expandedSection === key ? 'active' : ''}`}
              onClick={() => setExpandedSection(expandedSection === key ? null : key)}
              style={{ '--status-color': def.color }}
            >
              <Icon size={12} />
              <span>{def.shortTitle}</span>
              <span className={`sat-status-dot ${overlays[key] ? 'available' : def.available === false ? 'unavailable' : 'unknown'}`} />
            </button>
          );
        })}
      </div>

      {/* Observation sections */}
      <div className="sat-sections">
        {SECTION_ORDER.map((key) => {
          const def = OVERLAY_DEFS[key];
          return (
            <ObservationSection
              key={key}
              def={def}
              overlayMeta={overlays[key]}
              isExpanded={expandedSection === key}
              onToggle={() => setExpandedSection(expandedSection === key ? null : key)}
            />
          );
        })}
      </div>

      {/* Footer note */}
      <div className="sat-footer">
        <span>
          Data provenance: All satellite layers are real observations processed through the GIS pipeline.
          No synthetic or interpolated imagery. Overlay PNGs are georeferenced GeoTIFF renders.
        </span>
      </div>
    </div>
  );
}

export default SatellitePage;
