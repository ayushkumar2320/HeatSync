import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flame, Layers } from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { heatClass } from '../services/thematicData';

import { DigitalTwinMap3D } from '../components/DigitalTwinMap3D';

const INITIAL_LAYERS = {
  CITY: { buildings: true, roads: true, water: true, green: true, trees: true, boundary: true },
  VEGETATION: { ndvi: false, green_cover: false, vegetation_density: false },
  'LAND COVER': { land_cover: false },
  HEAT: { lst: false, predicted_lst: true, heat_class: false },
  'AIR QUALITY': { aqi: false, pm25: false, pm10: false, no2: false, so2: false, o3: false, co: false },
  TERRAIN: { elevation: false, slope: false, aspect: false, hillshade: false, terrain_3d: false },
};

export function HeatMapPage({ currentPrediction, availability, overlayMeta }) {
  const { prediction: snapshotPrediction } = useLiveData();
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [opacities] = useState({});
  const [currentHeat] = useState(null);

  const predictedLst = currentPrediction?.predicted_lst_c ?? snapshotPrediction?.predicted_lst_c;
  const gridSummary = currentPrediction?.grid_summary;

  const setLayer = useCallback((group, key, value) => {
    setLayers(prev => {
      const next = {
        CITY: { ...prev.CITY },
        VEGETATION: { ...prev.VEGETATION },
        'LAND COVER': { ...prev['LAND COVER'] },
        HEAT: { ...prev.HEAT },
        'AIR QUALITY': { ...prev['AIR QUALITY'] },
        TERRAIN: { ...prev.TERRAIN },
      };

      if (key === 'terrain_3d') {
        next.TERRAIN.terrain_3d = value;
        return next;
      }

      if (value) {
        // Exclusively show the chosen thematic base layer
        ['VEGETATION', 'LAND COVER', 'HEAT', 'AIR QUALITY'].forEach(g => {
          Object.keys(next[g]).forEach(k => { next[g][k] = false; });
        });
        const keep3d = next.TERRAIN.terrain_3d;
        Object.keys(next.TERRAIN).forEach(k => { next.TERRAIN[k] = false; });
        next.TERRAIN.terrain_3d = keep3d;

        next[group][key] = true;
      } else {
        next[group][key] = false;
      }
      return next;
    });
  }, []);

  const mapProps = {
    layers,
    opacities,
    availability,
    overlayMeta,
    currentPrediction: currentPrediction || currentHeat,
    // Hide DigitalTwinMap3D internal overlays — this page provides its own
    showInfoPanel: false,
    showCameraControls: false,
    showCoords: false,
    showSourceCard: false,
    showScenarioLegend: false,
  };

  return (
    <div className="hs-heatmap-page">
      {/* Full-screen map */}
      <div className="hs-heatmap-map">
        <DigitalTwinMap3D {...mapProps} />
      </div>

      {/* Zone TOP-LEFT: Thermal intelligence */}
      <motion.div
        className="map-overlay map-zone-top-left hs-heatmap-telemetry"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="hs-tele-header">
          <Flame size={14} color="var(--hs-orange)" />
          <span className="hs-label">THERMAL INTELLIGENCE</span>
        </div>

        <div className="hs-tele-metrics">
          <div className="hs-tele-metric">
            <span className="hs-label">CURRENT</span>
            <span className="hs-telemetry-lg" style={{ color: 'var(--hs-orange)' }}>
              {predictedLst ? `${predictedLst.toFixed(1)}°` : '—'}
            </span>
          </div>
          {gridSummary && (
            <>
              <div className="hs-tele-metric">
                <span className="hs-label">AVERAGE</span>
                <span className="hs-telemetry" style={{ fontSize: 'var(--hs-text-lg)' }}>
                  {gridSummary.mean_lst?.toFixed(1)}°
                </span>
              </div>
              <div className="hs-tele-metric">
                <span className="hs-label">MAX</span>
                <span className="hs-telemetry" style={{ fontSize: 'var(--hs-text-lg)', color: 'var(--hs-red)' }}>
                  {gridSummary.max_lst?.toFixed(1)}°
                </span>
              </div>
              <div className="hs-tele-metric">
                <span className="hs-label">MIN</span>
                <span className="hs-telemetry" style={{ fontSize: 'var(--hs-text-lg)', color: 'var(--hs-green)' }}>
                  {gridSummary.min_lst?.toFixed(1)}°
                </span>
              </div>
            </>
          )}
        </div>

        <div className="hs-tele-class">
          <span className="hs-label">CLASS</span>
          <span className="hs-tele-class-badge" style={{
            color: heatClass(predictedLst) === 'Very Hot' || heatClass(predictedLst) === 'Hot'
              ? 'var(--hs-red)' : 'var(--hs-amber)'
          }}>
            {heatClass(predictedLst) || '—'}
          </span>
        </div>
      </motion.div>

      {/* Zone TOP-RIGHT: Layer controls */}
      <motion.div
        className="map-overlay map-zone-top-right hs-heatmap-layers"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="hs-layer-header">
          <Layers size={14} color="var(--hs-cyan)" />
          <span className="hs-label">LAYERS</span>
        </div>
        <div className="hs-layer-list">
          {[
            { group: 'HEAT', key: 'predicted_lst', label: 'Predicted LST' },
            { group: 'HEAT', key: 'lst', label: 'Observed LST' },
            { group: 'HEAT', key: 'heat_class', label: 'Heat Class' },
            { group: 'VEGETATION', key: 'ndvi', label: 'NDVI' },
            { group: 'AIR QUALITY', key: 'aqi', label: 'AQI' },
            { group: 'TERRAIN', key: 'elevation', label: 'Elevation' },
            { group: 'TERRAIN', key: 'terrain_3d', label: '3D Terrain' },
          ].map(({ group, key, label }) => (
            <button
              key={key}
              className={`hs-layer-toggle ${layers[group]?.[key] ? 'active' : ''}`}
              onClick={() => setLayer(group, key, !layers[group]?.[key])}
            >
              <span className="hs-layer-dot" style={{
                background: layers[group]?.[key] ? 'var(--hs-cyan)' : 'var(--hs-text-muted)'
              }} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default HeatMapPage;
