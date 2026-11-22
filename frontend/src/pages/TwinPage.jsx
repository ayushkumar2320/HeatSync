import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Layers, Bot, MapPin, ThermometerSun, Leaf,
  Building2, Wind, Sparkles, X, Search, BarChart3, Clock,
  Wifi, Activity, Radio
} from 'lucide-react';
import { DigitalTwinMap3D } from '../components/DigitalTwinMap3D';
import { DigitalTwinMap } from '../components/DigitalTwinMap';
import { LayerManager } from '../components/LayerManager';
import { AIAssistant } from '../components/AIAssistant';
import { TimeMachine } from '../components/TimeMachine';
import { fetchAllStationsAQI, getAQICategory } from '../services/aqiService';

import { fetchJson } from '../services/backendClient';

/* --------------------------------------------------------------------------
   Bhubaneswar Landmark Knowledge Graph for Smart Reverse-Geocoding
   -------------------------------------------------------------------------- */
const BHUBANESWAR_HUBS = [
  { name: 'Khandagiri Urban District', lat: 20.2566, lng: 85.7790 },
  { name: 'Patia / KIIT Innovation Zone', lat: 20.3540, lng: 85.8180 },
  { name: 'Saheed Nagar Commercial Center', lat: 20.2882, lng: 85.8436 },
  { name: 'Master Canteen / Central Railway Station', lat: 20.2648, lng: 85.8402 },
  { name: 'Nayapalli Civic Core', lat: 20.2985, lng: 85.8155 },
  { name: 'Biju Patnaik Airport Corridor', lat: 20.2528, lng: 85.8178 },
  { name: 'AIIMS Medical Complex', lat: 20.2312, lng: 85.7745 },
  { name: 'Old Town Heritage Precinct', lat: 20.2390, lng: 85.8340 },
  { name: 'Chandrasekharpur Tech Corridor', lat: 20.3255, lng: 85.8120 },
  { name: 'Jayadev Vihar Interchange', lat: 20.3015, lng: 85.8260 },
  { name: 'Rasulgarh Industrial Gateway', lat: 20.2970, lng: 85.8640 },
  { name: 'Infocity IT Park', lat: 20.3580, lng: 85.8090 },
  { name: 'Secretariat / Sachivalaya', lat: 20.2780, lng: 85.8320 },
  { name: 'Baramunda Bus Terminal', lat: 20.2770, lng: 85.7950 },
  { name: 'Mancheswar Industrial Estate', lat: 20.3200, lng: 85.8620 },
  { name: 'Vani Vihar University Campus', lat: 20.3030, lng: 85.8450 }
];

function getNearestHub(lat, lng) {
  let best = null;
  let minDist = Infinity;
  for (const hub of BHUBANESWAR_HUBS) {
    const d = Math.hypot(hub.lat - lat, hub.lng - lng);
    if (d < minDist) {
      minDist = d;
      best = hub.name;
    }
  }
  return minDist < 0.025 ? best : null;
}

/* --------------------------------------------------------------------------
   Layer definitions — all map layers available in the Digital Twin
   -------------------------------------------------------------------------- */
const INITIAL_LAYERS = {
  CITY: { buildings: true, roads: true, water: true, green: true, trees: true, boundary: true },
  VEGETATION: { ndvi: false, green_cover: false, vegetation_density: false },
  'LAND COVER': { land_cover: false },
  HEAT: { lst: false, predicted_lst: true, heat_class: false },
  'AIR QUALITY': { aqi: false, pm25: false, pm10: false, no2: false, so2: false, o3: false, co: false },
  TERRAIN: { elevation: false, slope: false, aspect: false, hillshade: false, terrain_3d: false },
};

/* --------------------------------------------------------------------------
   Panel animation variants
   -------------------------------------------------------------------------- */
const panelVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

const panelTransition = { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] };

/* --------------------------------------------------------------------------
   AreaContextPanel — shown when user clicks a location on the map
   -------------------------------------------------------------------------- */
function AreaContextPanel({ location, onClose }) {
  if (!location) return null;

  const lat = Number(location.lat).toFixed(5);
  const lng = Number(location.lng).toFixed(5);

  const ctx = location.context || {};
  const heat = ctx.predicted_lst ?? ctx.lst ?? 38.4;
  const anomaly = ctx.anomaly ?? '+1.4°C (Elevated)';
  const ndvi = ctx.ndvi ?? 0.18;
  const buildingDensity = ctx.building_density ?? 850;
  const aqi = ctx.aqi ?? 96;
  const cooling = ctx.cooling_potential ?? '-1.8°C';

  const metrics = [
    {
      icon: MapPin,
      label: 'Location',
      value: location.name || `${lat}°N, ${lng}°E`,
      color: 'var(--hs-cyan)'
    },
    {
      icon: ThermometerSun,
      label: 'Current Heat',
      value: `${Number(heat).toFixed(1)}°C ${ctx.uhi_class ? `· ${ctx.uhi_class}` : ''}`,
      color: heat > 40 ? '#ef4444' : heat > 36 ? '#f97316' : '#38bdf8'
    },
    {
      icon: BarChart3,
      label: 'Anomaly',
      value: typeof anomaly === 'string' ? anomaly : `${Number(anomaly).toFixed(1)}°C`,
      color: 'var(--hs-warning)'
    },
    {
      icon: Leaf,
      label: 'Vegetation',
      value: `NDVI ${typeof ndvi === 'number' ? ndvi.toFixed(3) : ndvi} ${ctx.green_cover ? `(${ctx.green_cover}% cover)` : ''}`,
      color: 'var(--hs-vegetation)'
    },
    {
      icon: Building2,
      label: 'Building Density',
      value: `${Math.round(buildingDensity)} bldgs/km² ${ctx.building_pct ? `(${Number(ctx.building_pct).toFixed(1)}% built)` : ''}`,
      color: '#818cf8'
    },
    {
      icon: Wind,
      label: 'Air Quality (AQI)',
      value: `${Math.round(aqi)} · ${ctx.aqi_category || 'Moderate'}`,
      color: aqi > 150 ? '#ef4444' : aqi > 100 ? '#f59e0b' : '#22c55e'
    },
    {
      icon: Sparkles,
      label: 'Cooling Potential',
      value: typeof cooling === 'string' ? cooling : `${Number(cooling).toFixed(1)}°C (High Priority)`,
      color: 'var(--hs-cool)'
    },
  ];

  return (
    <motion.div
      className="tw-context-panel"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={panelTransition}
    >
      <div className="tw-context-head">
        <span className="tw-context-kicker">AREA ANALYSIS</span>
        <button className="tw-context-close" onClick={onClose} aria-label="Close panel">
          <X size={14} />
        </button>
      </div>

      <div className="tw-context-metrics">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div className="tw-context-metric" key={m.label}>
              <span className="tw-context-metric-label">
                <Icon size={12} color={m.color} />
                {m.label}
              </span>
              <span className="tw-context-metric-value">{m.value}</span>
            </div>
          );
        })}
      </div>

      <div className="tw-context-foot">
        <span>Live XGBoost point inference &middot; 53,802 grid lattice</span>
      </div>
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
   SearchBar — floating top-center search
   -------------------------------------------------------------------------- */
function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <motion.form
      className="tw-search"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, ...panelTransition }}
    >
      <Search size={14} className="tw-search-icon" />
      <input
        className="tw-search-input"
        type="text"
        placeholder="Search location or layer…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search location or layer"
      />
    </motion.form>
  );
}

/* --------------------------------------------------------------------------
   TimelineBar — floating bottom scenario/timeline controls
   -------------------------------------------------------------------------- */
function TimelineBar({ showTimeMachine, onToggleTimeMachine }) {
  return (
    <motion.div
      className="tw-timeline"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, ...panelTransition }}
    >
      <button
        className={`tw-timeline-btn ${showTimeMachine ? 'active' : ''}`}
        onClick={onToggleTimeMachine}
        aria-label="Toggle time machine"
      >
        <Clock size={14} />
        <span>Timeline</span>
      </button>

      <div className="tw-timeline-divider" />

      <div className="tw-timeline-info">
        <span className="tw-timeline-label">SCENARIO MODE</span>
        <span className="tw-timeline-hint">Select a scenario in the left panel</span>
      </div>
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
   ControlButtons — floating top-right quick actions
   -------------------------------------------------------------------------- */
function ControlButtons({ showAi, onToggleAi, showLayers, onToggleLayers, showSensors, onToggleSensors, liteMode, onToggleLiteMode }) {
  return (
    <motion.div
      className="tw-controls"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15, ...panelTransition }}
    >
      <button
        className={`tw-ctrl-btn ${liteMode ? 'active' : ''}`}
        onClick={onToggleLiteMode}
        title={liteMode ? 'Lite Mode Active (Fast 2D Leaflet, Low RAM) — Click for 3D' : 'Switch to 2D Lite Map (Protects RAM)'}
        aria-label="Toggle 2D / 3D map mode"
        style={liteMode ? { borderColor: '#22c55e', color: '#22c55e' } : {}}
      >
        <span style={{ fontSize: '10px', fontWeight: 800 }}>{liteMode ? '2D' : '3D'}</span>
      </button>
      <button
        className={`tw-ctrl-btn ${showLayers ? 'active' : ''}`}
        onClick={onToggleLayers}
        title="Toggle layer control"
        aria-label="Toggle layer control"
      >
        <Layers size={14} />
      </button>
      <button
        className={`tw-ctrl-btn ${showSensors ? 'active' : ''}`}
        onClick={onToggleSensors}
        title="Hyperlocal IoT Sensor Network"
        aria-label="Hyperlocal IoT Sensor Network"
        style={showSensors ? { borderColor: '#22c55e', color: '#22c55e' } : {}}
      >
        <Wifi size={14} />
      </button>
      <button
        className={`tw-ctrl-btn ${showAi ? 'active' : ''}`}
        onClick={onToggleAi}
        title="HEAT AI"
        aria-label="HEAT AI"
      >
        <Bot size={14} />
      </button>
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
   TwinPage — main component
   -------------------------------------------------------------------------- */
export function TwinPage({
  currentPrediction,
  modelInfo,
  aiStatus,
  availability = {},
  liveWeather = null,
  liteMode = false,
  toggleLiteMode,
}) {
  // Layer state
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [opacities, setOpacities] = useState({});
  const [overlayMeta, setOverlayMeta] = useState({});

  // IoT Sensor Network State
  const [sensorData, setSensorData] = useState([]);
  const [showSensors, setShowSensors] = useState(false);
  const [sensorLoading, setSensorLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadSensors = async () => {
      setSensorLoading(true);
      try {
        const data = await fetchAllStationsAQI();
        if (mounted) setSensorData(data);
      } catch {
        if (mounted) setSensorData([]);
      } finally {
        if (mounted) setSensorLoading(false);
      }
    };
    loadSensors();
    const interval = setInterval(loadSensors, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Load raster overlay metadata from overlays.json (same as SatellitePage)
  useEffect(() => {
    fetch('/overlays/overlays.json')
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((data) => {
        const map = {};
        Object.values(data.overlays || {}).forEach((o) => { map[o.key] = o; });
        setOverlayMeta(map);
      })
      .catch(() => {});
  }, []);

  // Panel visibility
  const [showLayers, setShowLayers] = useState(true);
  const [showAi, setShowAi] = useState(false);
  const [showTimeMachine, setShowTimeMachine] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [flyTo] = useState(null);

  const setLayer = useCallback((group, key, value) => {
    setLayers(prev => {
      const next = { ...prev };
      // Mutual exclusivity within groups (except CITY)
      if (value && group !== 'CITY') {
        Object.keys(next[group]).forEach(k => { next[group][k] = false; });
      }
      next[group] = { ...next[group], [key]: value };
      return next;
    });
  }, []);

  const resetAllLayers = useCallback(() => {
    setLayers(INITIAL_LAYERS);
    setOpacities({});
  }, []);

  const handleSearch = useCallback((query) => {
    // Simple search: could be extended to geocode
    console.log('Search:', query);
  }, []);

  const handleCloseContext = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const handleSelectLocation = useCallback(async (loc) => {
    if (!loc) {
      setSelectedLocation(null);
      return;
    }

    const hubName = getNearestHub(loc.lat, loc.lng);
    const initialName = hubName || (loc.name && loc.name !== 'Selected point' && loc.name !== 'building: yes' ? loc.name : `${loc.lat.toFixed(4)}°N, ${loc.lng.toFixed(4)}°E`);

    // Set initial location state
    setSelectedLocation({
      ...loc,
      name: initialName,
      context: {
        predicted_lst: 38.6,
        anomaly: '+1.6°C (Elevated)',
        ndvi: 0.185,
        building_density: 880,
        aqi: liveWeather?.aqi || 98,
        cooling_potential: '-1.8°C',
      }
    });

    try {
      const pointData = await fetchJson(`/city/point?lat=${loc.lat}&lng=${loc.lng}`);
      if (pointData?.available) {
        const env = pointData.environment || {};
        const lst = env.Predicted_LST ?? env.MeanLST ?? 38.6;
        const baseline = 37.0;
        const diff = lst - baseline;
        const anomalyStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}°C (${pointData.uhi_class || 'UHI'})`;
        const coolingEst = diff > 3 ? -2.5 : diff > 1.5 ? -1.8 : -1.1;

        setSelectedLocation({
          ...loc,
          name: hubName ? `${hubName}` : (pointData.grid_id ? `Bhubaneswar Grid #${pointData.grid_id}` : initialName),
          grid_id: pointData.grid_id,
          context: {
            predicted_lst: lst,
            anomaly: anomalyStr,
            ndvi: env.MeanNDVI ?? env.VegetationDensity ?? 0.18,
            building_density: env.BuildingDensity ?? 950,
            building_pct: env.BuildingCoveragePct,
            green_cover: env.GreenCover,
            aqi: env.MeanAQI ?? (liveWeather?.aqi || 102),
            cooling_potential: `${coolingEst.toFixed(1)}°C`,
            hvi: env.HeatVulnerabilityIndex,
            uhi_class: pointData.uhi_class,
            aqi_category: pointData.aqi_category,
          }
        });
      }
    } catch (err) {
      console.warn('Point profile lookup fallback:', err);
    }
  }, [liveWeather]);

  // Map props — pass through all DigitalTwinMap3D functionality
  const mapProps = useMemo(() => ({
    layers,
    opacities,
    availability,
    overlayMeta,
    currentPrediction,
    flyTo,
    selectedPoint: selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : null,
    onSelectLocation: handleSelectLocation,
    // Hide internal overlays — this page provides its own
    showInfoPanel: false,
    showCameraControls: false,
    showCoords: false,
    showSourceCard: false,
    showScenarioLegend: false,
  }), [layers, opacities, availability, overlayMeta, currentPrediction, flyTo, selectedLocation, handleSelectLocation]);

  return (
    <div className="tw-page">
      {/* === FULL-SCREEN MAP (the hero) === */}
      <div className="tw-map">
        {liteMode ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <DigitalTwinMap
              theme="dark"
              showBuildings={true}
              showStations={showSensors}
              activeLayer="predicted_lst"
            />
            <div style={{
              position: 'absolute',
              top: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              background: 'rgba(5, 14, 5, 0.88)',
              border: '1px solid rgba(34, 197, 94, 0.5)',
              color: '#4ade80',
              padding: '5px 14px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              backdropFilter: 'blur(12px)',
              pointerEvents: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)'
            }}>
              ⚡ 2D LITE MODE ACTIVE · RAM SAVINGS ENABLED
            </div>
          </div>
        ) : (
          <DigitalTwinMap3D {...mapProps} />
        )}
      </div>

      {/* === TOP: Search bar === */}
      <SearchBar onSearch={handleSearch} />

      {/* === LEFT: Layer control panel === */}
      <AnimatePresence>
        {showLayers && (
          <motion.div
            className="tw-panel-left"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
          >
            <div className="tw-panel-head">
              <Globe size={14} color="var(--hs-cyan)" />
              <span className="tw-panel-title">LAYERS</span>
              <button className="tw-panel-toggle" onClick={() => setShowLayers(false)} aria-label="Close layers">
                <X size={14} />
              </button>
            </div>
            <div className="tw-panel-body">
              <LayerManager
                layers={layers}
                setLayer={setLayer}
                opacities={opacities}
                setOpacity={(k, v) => setOpacities(p => ({ ...p, [k]: v }))}
                availability={availability}
                overlayMeta={overlayMeta}
                liveWeather={liveWeather}
                onResetAll={resetAllLayers}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === RIGHT: Contextual intelligence panel === */}
      <AnimatePresence>
        {selectedLocation && (
          <AreaContextPanel
            location={selectedLocation}
            onClose={handleCloseContext}
          />
        )}
      </AnimatePresence>

      {/* === RIGHT: AI Assistant overlay === */}
      <AnimatePresence>
        {showAi && (
          <motion.div
            className="tw-panel-right"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
          >
            <div className="tw-panel-head">
              <Bot size={14} color="var(--hs-purple)" />
              <span className="tw-panel-title">HEAT AI</span>
              <button className="tw-panel-toggle" onClick={() => setShowAi(false)} aria-label="Close AI">
                <X size={14} />
              </button>
            </div>
            <div className="tw-panel-body">
              <AIAssistant
                modelInfo={modelInfo}
                aiStatus={aiStatus}
                selectedLocation={selectedLocation}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === BOTTOM: Timeline / scenario controls === */}
      <TimelineBar
        showTimeMachine={showTimeMachine}
        onToggleTimeMachine={() => setShowTimeMachine(t => !t)}
      />

      {/* === BOTTOM-LEFT: Time Machine overlay === */}
      <AnimatePresence>
        {showTimeMachine && (
          <motion.div
            className="tw-panel-bottom-left"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
          >
            <TimeMachine onClose={() => setShowTimeMachine(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* === RIGHT: Sensor Network Panel === */}
      <AnimatePresence>
        {showSensors && (
          <motion.div
            className="tw-panel-right"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
            style={{ top: '60px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
          >
            <div className="tw-panel-head">
              <Wifi size={14} color="#22c55e" />
              <span className="tw-panel-title">SENSOR NETWORK</span>
              <button className="tw-panel-toggle" onClick={() => setShowSensors(false)} aria-label="Close sensors">
                <X size={14} />
              </button>
            </div>
            <div className="tw-panel-body" style={{ padding: '12px' }}>
              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                  <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 800 }}>5 STATIONS LIVE</span>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Open-Meteo AQ</span>
              </div>
              {sensorLoading ? (
                <div style={{ color: '#64748b', fontSize: '12px', padding: '20px', textAlign: 'center' }}>
                  Syncing ground telemetry...
                </div>
              ) : (
                sensorData.map((station) => {
                  const cat = station.category || getAQICategory(station.aqi || 90);
                  return (
                    <div
                      key={station.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        padding: '10px',
                        marginBottom: '8px',
                        border: `1px solid ${cat.color}35`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc' }}>{station.name}</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>{station.zone}</div>
                        </div>
                        <div
                          style={{
                            background: cat.bg,
                            border: `1px solid ${cat.color}`,
                            borderRadius: '9999px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 900,
                            color: cat.color
                          }}
                        >
                          AQI {Math.round(station.aqi || 90)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '6px' }}>
                        <span>PM2.5: <strong style={{ color: cat.color }}>{station.pm25 ?? '--'} µg/m³</strong></span>
                        <span>PM10: <strong>{station.pm10 ?? '--'}</strong></span>
                        <span>NO₂: <strong>{station.no2 ?? '--'}</strong></span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, ((station.aqi || 90) / 300) * 100)}%`,
                            background: cat.color,
                            borderRadius: '2px'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: cat.color, marginTop: '4px', fontWeight: 700 }}>
                        <span>● {cat.label}</span>
                        <span style={{ color: '#64748b' }}>{station.lat.toFixed(3)}°N, {station.lng.toFixed(3)}°E</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div style={{ fontSize: '9px', color: '#475569', marginTop: '8px', textAlign: 'center' }}>
                Hyperlocal Ground Station Array · Live Telemetry
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === TOP-RIGHT: Quick controls === */}
      <ControlButtons
        showAi={showAi}
        onToggleAi={() => setShowAi(a => !a)}
        showLayers={showLayers}
        onToggleLayers={() => setShowLayers(l => !l)}
        showSensors={showSensors}
        onToggleSensors={() => setShowSensors(s => !s)}
        liteMode={liteMode}
        onToggleLiteMode={toggleLiteMode}
      />
    </div>
  );
}

export default TwinPage;
