import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Building2, Layers, RotateCcw, Route, Trees, Waves,
  MapPin, Maximize, Minimize, Orbit, Home, Camera, Crosshair
} from 'lucide-react';
import { fetchBoundary, fetchLayerGeoJson, fetchCurrentHeatPredictions } from '../services/backendClient';
import { computeAreaStats, featureDisplayName } from '../services/areaStats';

const LOCAL_LAYER_BASE = '/3d-layers';
const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] };
const LAYER_FILES = {
  buildings: 'web_3d_buildings',
  roads: 'web_3d_roads',
  green: 'web_3d_green_spaces',
  natural: 'web_3d_natural_water_green',
  water: 'web_3d_water',
  trees: 'web_3d_trees'
};

const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: 'OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm-base',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-saturation': -0.45,
        'raster-brightness-min': 0.12,
        'raster-brightness-max': 0.92
      }
    }
  ]
};

// Thematic layer key -> overlay asset key (overlays.json).
const OVERLAY_BY_KEY = {
  ndvi: 'ndvi', green_cover: 'green_cover', vegetation_density: 'vegetation_density',
  land_cover: 'landcover',
  lst: 'lst', predicted_lst: 'predicted_lst', heat_class: 'heat_classes',
  aqi: 'aqi', pm25: 'pm25', pm10: 'pm10', no2: 'no2', so2: 'so2', o3: 'o3', co: 'co',
  elevation: 'elevation', slope: 'slope', aspect: 'aspect', hillshade: 'hillshade'
};

const COOLING_CLASS_COLORS = {
  'VERY HIGH': '#1a9641', HIGH: '#66bd63', MODERATE: '#fee08b', LOW: '#d73027'
};

function normalizeImageBounds(coords) {
  if (!Array.isArray(coords) || coords.length !== 4) return coords;
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  // MapLibre requires: [top-left (NW), top-right (NE), bottom-right (SE), bottom-left (SW)]
  return [
    [minLng, maxLat],
    [maxLng, maxLat],
    [maxLng, minLat],
    [minLng, minLat]
  ];
}

function boundsFromGeoJson(geojson) {
  const coords = [];
  const walk = (value) => {
    if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      coords.push(value);
      return;
    }
    if (Array.isArray(value)) value.forEach(walk);
  };
  geojson?.features?.forEach((feature) => walk(feature.geometry?.coordinates));
  if (!coords.length) return null;
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}

async function fetchLocalGeoJson(fileName) {
  const response = await fetch(`${LOCAL_LAYER_BASE}/${fileName}.geojson`);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function loadGeoJson(layerName, localFile) {
  try {
    const data = await fetchLayerGeoJson(layerName);
    return { data, source: 'Backend layer catalogue' };
  } catch {
    try {
      const data = await fetchLocalGeoJson(localFile);
      return { data, source: 'Local real OSM web layer fallback' };
    } catch (err) {
      return { data: EMPTY_COLLECTION, source: `Unavailable: ${err.message}` };
    }
  }
}

async function loadBoundary() {
  try {
    const data = await fetchBoundary();
    return { data, source: 'Backend boundary API' };
  } catch {
    const data = await fetchLocalGeoJson('boundary');
    return { data, source: 'Local repository boundary fallback' };
  }
}

function addOrUpdateSource(map, id, data) {
  const source = map.getSource(id);
  if (source) {
    source.setData(data);
    return;
  }
  map.addSource(id, { type: 'geojson', data });
}

function addLayerIfMissing(map, layer, beforeId) {
  if (!map.getLayer(layer.id)) {
    if (beforeId && !map.getLayer(beforeId)) {
      map.addLayer(layer);
    } else if (beforeId && map.getLayer(beforeId)) {
      map.addLayer(layer, beforeId);
    } else {
      map.addLayer(layer);
    }
  }
}

function removeLayerIfPresent(map, id) {
  if (map.getLayer(id)) map.removeLayer(id);
}

function removeSourceIfPresent(map, id) {
  if (map.getSource(id)) map.removeSource(id);
}

function setVisibility(map, ids, visible) {
  ids.forEach((id) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  });
}

function firstProperty(properties, keys, fallback = 'Unnamed feature') {
  for (const key of keys) {
    const value = properties?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return fallback;
}

// ------------------------------------------------------------------ #
// Scenario overlay helpers (unchanged from the existing implementation)
// ------------------------------------------------------------------ #
function fieldDomain(features, key) {
  let min = Infinity;
  let max = -Infinity;
  for (const feature of features) {
    const value = feature.properties?.[key];
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

function buildScenarioStyle(geojson, mode) {
  const features = geojson?.features || [];
  if (mode === 'DIFFERENCE') {
    const { min, max } = fieldDomain(features, 'delta_lst');
    return {
      expression: ['interpolate', ['linear'], ['get', 'delta_lst'], min, '#2166ac', 0, '#f7f7f7', max, '#b2182b'],
      domain: { min, max, delta: true }
    };
  }
  const key = mode === 'CURRENT' ? 'baseline_lst' : 'scenario_lst';
  const { min, max } = fieldDomain(features, key);
  const mid = (min + max) / 2;
  return {
    expression: ['interpolate', ['linear'], ['get', key], min, '#2c7bb6', mid, '#fdae61', max, '#d7191c'],
    domain: { min, max, delta: false }
  };
}

function scenarioGradient(domain) {
  if (domain.delta) {
    const span = domain.max - domain.min || 1;
    const zeroPct = ((-domain.min) / span) * 100;
    return {
      css: `linear-gradient(to right, #2166ac 0%, #f7f7f7 ${zeroPct}%, #b2182b 100%)`,
      zeroPct
    };
  }
  return { css: 'linear-gradient(to right, #2c7bb6 0%, #fdae61 50%, #d7191c 100%)', zeroPct: null };
}

const fmtCellValue = (value, signed = false) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const rounded = Number(value).toFixed(2);
  return signed && value > 0 ? `+${rounded}` : rounded;
};

/**
 * Normalize a grid_id from any property shape to a string.
 * Supports grid_id, Grid_ID, gridid, GRID_ID fallbacks.
 */
function normalizeGridId(properties) {
  const id = properties?.grid_id ?? properties?.Grid_ID ?? properties?.gridid ?? properties?.GRID_ID;
  return id != null ? String(id) : null;
}

// ------------------------------------------------------------------ #
export function DigitalTwinMap3D({
  layers = {},
  opacities = {},
  availability = {},
  overlayMeta = {},
  scenarioOverlay = null,
  currentPrediction = null,
  historicalLayerData = null,
  historicalDate = null,
  onScenarioModeChange = () => {},
  onSelectLocation = () => {},
  hotspots = null,
  showHotspots = false,
  coolingGeoJson = null,
  showCooling = false,
  routeData = null,
  flyTo = null,
  selectedPoint = null,
  theme = 'light',
  liveWeather = null,
  onMapClick = null,
  customBuilding = null,
  onBuildingDrag = null,
  onBuildingMove = null,
  // Overlay visibility — parent pages can hide internal overlays
  // when they provide their own UI in the same zone.
  showInfoPanel = true,
  showCameraControls = true,
  showCoords = true,
  showSourceCard = true,
  showScenarioLegend = true,
  showVulnerableZones = false,
}) {
  const containerRef = useRef(null);
  const buildingMarkersRef = useRef([]);
  const vulnerableMarkersRef = useRef([]);
  const mapRef = useRef(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onSelectLocationRef = useRef(onSelectLocation);
  onSelectLocationRef.current = onSelectLocation;
  const popupRef = useRef(null);
  const boundaryRef = useRef(null);
  const collectionsRef = useRef({});
  const scenarioRef = useRef(scenarioOverlay);
  scenarioRef.current = scenarioOverlay;
  const historicalRef = useRef(historicalLayerData);
  historicalRef.current = historicalLayerData;
  const cellHandlersBoundRef = useRef(false);
  const markerRef = useRef(null);
  const currentHeatGridRef = useRef(null);
  const staticGridGeoJsonRef = useRef(null);
  const gridGeometryMapRef = useRef(null);
  const heatGridHandlersBoundRef = useRef(false);
  const [staticGridReady, setStaticGridReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapMode] = useState('current');
  const [counts, setCounts] = useState({ buildings: 0, roads: 0, green: 0, water: 0, trees: 0 });
  const [status, setStatus] = useState({ loading: true, message: 'Loading 3D city layers', source: '' });
  const [cursorLngLat, setCursorLngLat] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [orbiting, setOrbiting] = useState(false);
  const orbitRef = useRef(null);

  // ------------------------------------------------------------------ #
  // Map bootstrap
  // ------------------------------------------------------------------ #
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_RASTER_STYLE,
      center: [85.8275, 20.2636],
      zoom: 12.0,
      pitch: 62,
      bearing: -22,
      maxPitch: 85,
      antialias: true
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 140, unit: 'metric' }), 'bottom-left');

    // Keep the canvas sized to its container: the map can mount while the
    // layout is still settling (zero-height container -> MapLibre's 300 px
    // default), and the panel resizes on tablet/mobile breakpoints.
    const containerEl = containerRef.current;
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.resize();
      });
      resizeObserver.observe(containerEl);
    }
    const onWindowResize = () => { if (mapRef.current) mapRef.current.resize(); };
    window.addEventListener('resize', onWindowResize);

    map.on('mousemove', (e) => setCursorLngLat([Number(e.lngLat.lng.toFixed(5)), Number(e.lngLat.lat.toFixed(5))]));
    map.on('mouseout', () => setCursorLngLat(null));

    map.on('load', async () => {
      setMapReady(true);
      setStatus({ loading: true, message: 'Loading boundary and real OSM layers', source: '' });

      try {
        const [boundaryResult, buildingsResult, roadsResult, greenResult, naturalResult, waterResult, treesResult] = await Promise.all([
          loadBoundary(),
          loadGeoJson(LAYER_FILES.buildings, LAYER_FILES.buildings),
          loadGeoJson(LAYER_FILES.roads, LAYER_FILES.roads),
          loadGeoJson(LAYER_FILES.green, LAYER_FILES.green),
          loadGeoJson(LAYER_FILES.natural, LAYER_FILES.natural),
          loadGeoJson(LAYER_FILES.water, LAYER_FILES.water),
          loadGeoJson(LAYER_FILES.trees, LAYER_FILES.trees)
        ]);

        boundaryRef.current = boundaryResult.data;
        collectionsRef.current = {
          buildings: buildingsResult.data,
          roads: roadsResult.data,
          green: greenResult.data,
          natural: naturalResult.data,
          water: waterResult.data
        };

        // Terrain source (real DEM tiles, terrarium encoding) — added once.
        addOrUpdateSource(map, 'dem-tiles', {
          type: 'raster-dem',
          tiles: ['/terrain/{z}/{x}/{y}.png'],
          tileSize: 256,
          encoding: 'terrarium',
          maxzoom: 14,
          attribution: 'Copernicus DEM GLO-30 / SRTM'
        });

        const addGeo = (id, data) => {
          addOrUpdateSource(map, id, data);
        };
        addGeo('boundary', boundaryResult.data);
        addGeo('buildings', buildingsResult.data);
        addGeo('roads', roadsResult.data);
        addGeo('green-spaces', greenResult.data);
        addGeo('natural-water-green', naturalResult.data);
        addGeo('water', waterResult.data);
        addGeo('trees', treesResult.data);

        // Boundary
        addLayerIfMissing(map, {
          id: 'boundary-fill', type: 'fill', source: 'boundary',
          paint: { 'fill-color': theme === 'dark' ? '#0f172a' : '#dbeafe', 'fill-opacity': 0.1 }
        });
        addLayerIfMissing(map, {
          id: 'boundary-line', type: 'line', source: 'boundary',
          paint: { 'line-color': '#38bdf8', 'line-width': 2.4, 'line-opacity': 0.9 }
        });

        // Water + green (under overlays so heat can sit on the ground)
        addLayerIfMissing(map, {
          id: 'water-fill', type: 'fill', source: 'water',
          paint: { 'fill-color': '#0ea5e9', 'fill-opacity': 0.62 }
        });
        addLayerIfMissing(map, {
          id: 'natural-water-fill', type: 'fill', source: 'natural-water-green',
          filter: ['in', ['get', 'natural'], ['literal', ['water', 'wetland']]],
          paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.45 }
        });
        addLayerIfMissing(map, {
          id: 'green-fill', type: 'fill', source: 'green-spaces',
          paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.45 }
        });
        addLayerIfMissing(map, {
          id: 'natural-green-fill', type: 'fill', source: 'natural-water-green',
          filter: ['in', ['get', 'natural'], ['literal', ['wood', 'tree', 'tree_row', 'scrub', 'grassland']]],
          paint: { 'fill-color': '#16a34a', 'fill-opacity': 0.4 }
        });

        // Roads
        addLayerIfMissing(map, {
          id: 'roads-major', type: 'line', source: 'roads',
          filter: ['in', ['get', 'highway'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]],
          paint: { 'line-color': '#f97316', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 15, 5], 'line-opacity': 0.92 }
        });
        addLayerIfMissing(map, {
          id: 'roads-local', type: 'line', source: 'roads',
          filter: ['!', ['in', ['get', 'highway'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]]],
          paint: { 'line-color': '#e2e8f0', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.4, 15, 2], 'line-opacity': 0.6 }
        });

        // 3D Terrain elevation mesh across the entire digital twin
        try {
          map.setTerrain({ source: 'dem-tiles', exaggeration: 1.8 });
        } catch {
          // Fallback if terrain is not active
        }

        // Configure 3D directional lighting for realistic building facade shadows & highlights
        try {
          map.setLight({
            anchor: 'viewport',
            color: '#ffffff',
            intensity: 0.65,
            position: [1.5, 180, 50]
          });
        } catch {
          // Ignored if style does not support setLight
        }

        // Crisp 3D Building Base Outline / Anchor
        addLayerIfMissing(map, {
          id: 'building-outlines',
          type: 'line',
          source: 'buildings',
          paint: {
            'line-color': theme === 'dark' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(37, 99, 235, 0.35)',
            'line-width': 1.2,
            'line-opacity': 0.85
          }
        });

        // Buildings (Towering Volumetric 3D extrusion with realistic urban heights & architectural palettes)
        addLayerIfMissing(map, {
          id: 'building-extrusion',
          type: 'fill-extrusion',
          source: 'buildings',
          paint: {
            'fill-extrusion-color': [
              'case',
              ['==', ['get', 'building'], 'commercial'], '#38bdf8',
              ['==', ['get', 'building'], 'office'], '#0ea5e9',
              ['==', ['get', 'building'], 'apartments'], '#818cf8',
              ['==', ['get', 'building'], 'residential'], '#6366f1',
              ['==', ['get', 'building'], 'hospital'], '#f43f5e',
              ['==', ['get', 'building'], 'civic'], '#06b6d4',
              ['==', ['get', 'building'], 'school'], '#10b981',
              ['==', ['get', 'building'], 'university'], '#a855f7',
              ['==', ['get', 'height_source'], 'visual_default_not_measured'], '#7c3aed',
              ['==', ['get', 'height_source'], 'OSM_LEVELS_ESTIMATED'], '#8b5cf6',
              '#6366f1'
            ],
            'fill-extrusion-height': [
              'case',
              ['>', ['to-number', ['get', 'render_height_m'], 0], 0], ['to-number', ['get', 'render_height_m']],
              ['>', ['to-number', ['get', 'height_m'], 0], 0], ['to-number', ['get', 'height_m']],
              ['>', ['to-number', ['get', 'height'], 0], 0], ['to-number', ['get', 'height']],
              ['>', ['to-number', ['get', 'levels'], 0], 0], ['*', ['to-number', ['get', 'levels']], 4.2],
              ['>', ['to-number', ['get', 'building:levels'], 0], 0], ['*', ['to-number', ['get', 'building:levels']], 4.2],
              ['==', ['get', 'building'], 'office'], 55,
              ['==', ['get', 'building'], 'apartments'], 44,
              ['==', ['get', 'building'], 'commercial'], 36,
              ['==', ['get', 'building'], 'hospital'], 32,
              ['==', ['get', 'building'], 'university'], 28,
              ['==', ['get', 'building'], 'civic'], 26,
              ['==', ['get', 'building'], 'school'], 20,
              ['==', ['get', 'building'], 'residential'], 24,
              24 // Boosted 24m default extrusion for rich 3D cityscape
            ],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.92,
            'fill-extrusion-vertical-gradient': true
          }
        });

        // Trees — real OSM records, clustered at low zoom, individual at high zoom.
        addLayerIfMissing(map, {
          id: 'trees-cluster',
          type: 'circle',
          source: 'trees',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#15803d',
            'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 30, 22],
            'circle-opacity': 0.85,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#dcfce7'
          }
        });
        addLayerIfMissing(map, {
          id: 'trees-cluster-count',
          type: 'symbol',
          source: 'trees',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 11,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
          },
          paint: { 'text-color': '#ffffff' }
        });
        addLayerIfMissing(map, {
          id: 'trees-point',
          type: 'circle',
          source: 'trees',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#16a34a',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 17, 6],
            'circle-opacity': 0.9,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#f0fdf4'
          },
          minzoom: 12
        });

        // Interactive hover popups
        const interactiveIds = ['building-extrusion', 'roads-major', 'roads-local', 'green-fill', 'natural-green-fill', 'water-fill', 'natural-water-fill', 'trees-point', 'trees-cluster'];
        interactiveIds.forEach((id) => {
          map.on('mousemove', id, (e) => showHoverPopup(map, popupRef, e, liveWeather));
          map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', id, () => {
            map.getCanvas().style.cursor = '';
            if (popupRef.current) popupRef.current.remove();
          });
        });

        // Click anywhere -> nearest real data (scenario cell clicks handled separately)
        map.on('click', (e) => {
          let cellHits = [];
          if (map.getLayer('scenario-cells-fill')) {
            cellHits = map.queryRenderedFeatures(e.point, { layers: ['scenario-cells-fill'] });
          }
          if (cellHits.length) return;
          const feature = map.queryRenderedFeatures(e.point)[0] || null;
          const name = feature ? featureDisplayName(feature) : 'Selected point';
          const stats = computeAreaStats(collectionsRef.current, e.lngLat.lng, e.lngLat.lat, 150);
          onSelectLocationRef.current?.({ name, lat: e.lngLat.lat, lng: e.lngLat.lng, stats });
          onMapClickRef.current?.(e.lngLat);
        });

        const bounds = boundsFromGeoJson(boundaryResult.data);
        if (bounds) {
          map.fitBounds(bounds, { padding: 50, pitch: 58, bearing: -22, duration: 1000 });
        }

        setCounts({
          buildings: buildingsResult.data.features?.length || 0,
          roads: roadsResult.data.features?.length || 0,
          green: (greenResult.data.features?.length || 0) + (naturalResult.data.features?.length || 0),
          water: waterResult.data.features?.length || 0,
          trees: treesResult.data.features?.length || 0
        });

        setStatus({
          loading: false,
          message: 'Full Bhubaneswar 3D city — real OSM geometry + real DEM terrain',
          source: `Boundary: ${boundaryResult.source}. Buildings: ${buildingsResult.source}. Roads: ${roadsResult.source}.`
        });
      } catch (error) {
        setStatus({ loading: false, message: '3D map loaded, but city layers are unavailable', source: error.message });
      }
    });

    mapRef.current = map;
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', onWindowResize);
      if (popupRef.current) popupRef.current.remove();
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // ------------------------------------------------------------------ #
  // Load static grid geometry (once, cached for the lifetime of the map)
  // ------------------------------------------------------------------ #
  useEffect(() => {
    fetch('/3d-layers/predicted_lst_grid.geojson')
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load grid geometry: ${response.status}`);
        return response.json();
      })
      .then((geojson) => {
        staticGridGeoJsonRef.current = geojson;
        const map = new Map();
        for (const feature of geojson.features || []) {
          const gid = normalizeGridId(feature.properties);
          if (gid) map.set(gid, feature);
        }
        gridGeometryMapRef.current = map;
        setStaticGridReady(true);
        console.log(`Heat grid: Static geometry loaded — ${map.size} features`);
      })
      .catch((err) => {
        console.error('Heat grid: Failed to load static geometry', err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------ #
  // City layer visibility
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    setVisibility(map, ['building-extrusion'], layers.CITY?.buildings !== false);
    setVisibility(map, ['roads-major', 'roads-local'], layers.CITY?.roads !== false);
    setVisibility(map, ['green-fill', 'natural-green-fill'], layers.CITY?.green !== false);
    setVisibility(map, ['water-fill', 'natural-water-fill'], layers.CITY?.water !== false);
    setVisibility(map, ['trees-point', 'trees-cluster', 'trees-cluster-count'], layers.CITY?.trees !== false);
    setVisibility(map, ['boundary-fill', 'boundary-line'], layers.CITY?.boundary !== false);
  }, [mapReady, layers]);

  // ------------------------------------------------------------------ #
  // Thermal map mode synchronization (CURRENT / SCENARIO / DIFFERENCE)
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const applyMode = () => {
      const modes = {
        current: { current: 'visible', scenario: 'none', difference: 'none' },
        scenario: { current: 'none', scenario: 'visible', difference: 'none' },
        difference: { current: 'none', scenario: 'none', difference: 'visible' }
      };
      const vis = modes[mapMode];
      if (map.getLayer('current-prediction-layer')) {
        map.setLayoutProperty('current-prediction-layer', 'visibility', vis.current);
      }
      if (map.getLayer('scenario-prediction-layer')) {
        map.setLayoutProperty('scenario-prediction-layer', 'visibility', vis.scenario);
      }
      if (map.getLayer('scenario-delta-layer')) {
        map.setLayoutProperty('scenario-delta-layer', 'visibility', vis.difference);
      }
    };

    applyMode();
  }, [mapMode, mapReady]);

  // ------------------------------------------------------------------ #
  // Terrain 3D toggle (with health check)
  // ------------------------------------------------------------------ #
  const [terrainStatus, setTerrainStatus] = useState('unchecked'); // unchecked | loading | available | unavailable | error

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const enabled = layers.TERRAIN?.terrain_3d === true && availability.terrain_3d !== false;
    if (enabled) {
      setTerrainStatus('loading');
      try {
        map.setTerrain({ source: 'dem-tiles', exaggeration: 1 });
        // Check if terrain actually loaded by waiting for terrain event
        const onTerrainLoaded = () => {
          setTerrainStatus('available');
          map.off('terrain', onTerrainLoaded);
        };
        const onTerrainError = (e) => {
          console.warn('Terrain loading failed:', e.error?.message || e);
          setTerrainStatus('unavailable');
          map.off('error', onTerrainError);
        };
        map.on('terrain', onTerrainLoaded);
        map.on('error', onTerrainError);
        // Fallback timeout
        setTimeout(() => {
          if (terrainStatus === 'loading') setTerrainStatus('available');
        }, 5000);
      } catch (e) {
        console.warn('setTerrain failed:', e);
        setTerrainStatus('error');
      }
    } else {
      map.setTerrain(null);
      setTerrainStatus('unchecked');
    }
  }, [mapReady, layers, availability]);

  // ------------------------------------------------------------------ #
  // Raster overlays (image sources from the real GeoTIFF renderings)
  // ------------------------------------------------------------------ #
  const [internalOverlayMeta, setInternalOverlayMeta] = useState(overlayMeta || {});

  useEffect(() => {
    if (overlayMeta && Object.keys(overlayMeta).length > 0) {
      setInternalOverlayMeta(overlayMeta);
      return;
    }
    fetch('/overlays/overlays.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.overlays) {
          const map = {};
          Object.values(data.overlays).forEach((o) => { map[o.key] = o; });
          setInternalOverlayMeta(map);
        }
      })
      .catch((err) => console.warn('DigitalTwinMap3D: Failed to load overlays.json', err));
  }, [overlayMeta]);

  const effectiveOverlayMeta = (overlayMeta && Object.keys(overlayMeta).length > 0) ? overlayMeta : internalOverlayMeta;

  const overlayEntries = useMemo(
    () => Object.entries(OVERLAY_BY_KEY).filter(([key, asset]) => key !== 'predicted_lst' && effectiveOverlayMeta[asset]),
    [effectiveOverlayMeta]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    overlayEntries.forEach(([key, asset]) => {
      const meta = effectiveOverlayMeta[asset];
      const group = Object.keys(layers).find((g) => layers[g] && layers[g][key] === true);
      const visible = Boolean(group) && availability[key] !== false;
      const layerId = `overlay-${key}`;
      const sourceId = `overlay-src-${key}`;
      if (visible && meta?.url && meta?.bounds_wgs84) {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'image',
            url: meta.url,
            coordinates: normalizeImageBounds(meta.bounds_wgs84)
          });
        }
        if (!map.getLayer(layerId)) {
          addLayerIfMissing(map, {
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': (opacities[key] ?? 80) / 100,
              'raster-fade-duration': 0
            },
            layout: { visibility: 'visible' }
          }, 'roads-major'); // below roads so the 3D city stays visible
        } else {
          map.setPaintProperty(layerId, 'raster-opacity', (opacities[key] ?? 80) / 100);
          map.setLayoutProperty(layerId, 'visibility', 'visible');
        }
      } else {
        removeLayerIfPresent(map, layerId);
        removeSourceIfPresent(map, sourceId);
      }
    });
  }, [mapReady, overlayEntries, effectiveOverlayMeta, layers, availability, opacities]);

  // ------------------------------------------------------------------ #
  // Current predicted LST heat grid overlay
  // Architecture: static geometry (local file) + dynamic predictions (backend).
  // Geometry is loaded once and cached; only predictions are re-fetched.
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const predLstVisible = layers.HEAT?.predicted_lst === true;

    if (!predLstVisible) {
      // Hide layer but preserve data — avoid re-downloading geometry on toggle
      if (map.getLayer('current-heat-fill')) {
        map.setLayoutProperty('current-heat-fill', 'visibility', 'none');
      }
      return;
    }

    // If we already have merged data, just show the existing layer
    if (currentHeatGridRef.current && map.getLayer('current-heat-fill')) {
      map.setLayoutProperty('current-heat-fill', 'visibility', 'visible');
      return;
    }

    // Wait for the static geometry to be loaded before merging
    if (!staticGridReady || !gridGeometryMapRef.current) {
      return; // Will re-run when staticGridReady changes
    }

    const geometryMap = gridGeometryMapRef.current;

    // Fetch dynamic predictions from /api/prediction/heat/current
    fetchCurrentHeatPredictions()
      .then((result) => {
        if (!result?.success || !result?.predictions?.length) {
          console.warn('Heat grid: No prediction data available from backend');
          return;
        }

        const predictions = result.predictions;

        // Build a lookup: grid_id (string) → predicted_lst
        const predMap = new Map();
        for (const p of predictions) {
          const gid = normalizeGridId(p);
          if (gid && gid !== 'undefined' && gid !== 'null') {
            predMap.set(gid, p.predicted_lst);
          }
        }

        // Merge: iterate over static geometry and attach dynamic predictions
        const features = [];
        let matchedCount = 0;
        let unmatchedGeometryCount = 0;
        let unmatchedPredictionCount = predMap.size;

        for (const [gid, geometryFeature] of geometryMap) {
          const predicted_lst = predMap.get(gid);
          if (predicted_lst !== undefined && predicted_lst !== null) {
            matchedCount++;
            unmatchedPredictionCount--;
            features.push({
              type: 'Feature',
              properties: {
                grid_id: gid,
                predicted_lst: predicted_lst,
                source: 'XGBoost (current)',
                generated_at: result.generated_at || null,
              },
              geometry: geometryFeature.geometry,
            });
          } else {
            unmatchedGeometryCount++;
          }
        }

        // Diagnostics
        let minLst = Infinity;
        let maxLst = -Infinity;
        for (const f of features) {
          const v = f.properties.predicted_lst;
          if (typeof v === 'number' && Number.isFinite(v)) {
            if (v < minLst) minLst = v;
            if (v > maxLst) maxLst = v;
          }
        }

        console.log(
          '[Heat Grid Diagnostics]\n' +
          `  Static geometry features: ${geometryMap.size}\n` +
          `  Backend predictions:      ${predictions.length}\n` +
          `  Matched features:         ${matchedCount}\n` +
          `  Unmatched geometry:       ${unmatchedGeometryCount}\n` +
          `  Unmatched predictions:    ${unmatchedPredictionCount}\n` +
          `  Min LST:                  ${Number.isFinite(minLst) ? minLst.toFixed(1) + ' \u00b0C' : 'N/A'}\n` +
          `  Max LST:                  ${Number.isFinite(maxLst) ? maxLst.toFixed(1) + ' \u00b0C' : 'N/A'}`
        );

        // Prominent warning if match rate is below 90%
        if (geometryMap.size > 0 && matchedCount / geometryMap.size < 0.9) {
          console.warn(
            `[Heat Grid WARNING] Only ${(matchedCount / geometryMap.size * 100).toFixed(1)}% match rate ` +
            `(${matchedCount}/${geometryMap.size}). ` +
            `Check grid_id normalization between geometry and predictions.`
          );
        }

        if (!features.length) {
          console.warn('Heat grid: No features after merge — check grid_id matching between geometry and predictions');
          return;
        }

        if (!Number.isFinite(minLst) || !Number.isFinite(maxLst)) {
          console.warn('Heat grid: No valid predicted LST values');
          return;
        }

        const fc = { type: 'FeatureCollection', features };
        addOrUpdateSource(map, 'current-heat-grid', fc);

        if (!map.getLayer('current-heat-fill')) {
          addLayerIfMissing(map, {
            id: 'current-heat-fill',
            type: 'fill',
            source: 'current-heat-grid',
            layout: { visibility: 'visible' },
            paint: {
              'fill-color': [
                'interpolate', ['linear'], ['get', 'predicted_lst'],
                minLst, '#313695',
                minLst + (maxLst - minLst) * 0.2, '#74add1',
                minLst + (maxLst - minLst) * 0.4, '#abd9e9',
                minLst + (maxLst - minLst) * 0.6, '#fee090',
                minLst + (maxLst - minLst) * 0.8, '#f46d43',
                maxLst, '#a50026',
              ],
              'fill-opacity': 0.65,
            },
          }, 'roads-major');
        } else {
          map.setLayoutProperty('current-heat-fill', 'visibility', 'visible');
        }

        // Click / hover handlers — bind only once
        if (!heatGridHandlersBoundRef.current) {
          heatGridHandlersBoundRef.current = true;
          map.on('click', 'current-heat-fill', (e) => {
            const p = e.features?.[0]?.properties || {};
            if (popupRef.current) popupRef.current.remove();
            popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 12, maxWidth: '240px' })
              .setLngLat(e.lngLat)
              .setHTML(`<div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.55">
                <strong style="font-size:12.5px">Grid ${p.grid_id}</strong>
                <div style="color:#94a3b8;font-size:11px">CURRENT PREDICTED LST</div>
                <div style="margin-top:6px;display:grid;grid-template-columns:auto auto;gap:2px 12px">
                  <span style="color:#94a3b8">Predicted LST</span>
                  <span style="font-weight:700;color:#dc2626">${p.predicted_lst != null ? Number(p.predicted_lst).toFixed(1) + ' °C' : '—'}</span>
                  <span style="color:#94a3b8">Source</span>
                  <span style="font-weight:600">XGBoost (current data)</span>
                </div>
              </div>`)
              .addTo(map);
          });
          map.on('mousemove', 'current-heat-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'current-heat-fill', () => {
            map.getCanvas().style.cursor = '';
            if (popupRef.current) popupRef.current.remove();
          });
        }

        currentHeatGridRef.current = fc;
      })
      .catch((err) => {
        console.error('Heat grid: Failed to load predictions from backend', err);
      });
  }, [mapReady, layers.HEAT?.predicted_lst, staticGridReady]);

  // REMOVED: fetchScenarioCellsForGeometry - no longer needed
  // REMOVED: renderHeatAsPoints fallback - we now use authoritative Predicted_LST.geojson geometry

  // ------------------------------------------------------------------ #
  // Scenario cell overlay (CURRENT / SCENARIO / DIFFERENCE)
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const overlay = scenarioOverlay;
    const hasData = overlay?.geojson?.features?.length > 0;

    if (!hasData) {
      // Hide scenario layers when no data - never remove sources
      if (map.getLayer('scenario-prediction-layer')) {
        map.setLayoutProperty('scenario-prediction-layer', 'visibility', 'none');
      }
      if (map.getLayer('scenario-delta-layer')) {
        map.setLayoutProperty('scenario-delta-layer', 'visibility', 'none');
      }
      return;
    }

    const data = overlay.geojson;

    // === Build scenario prediction source ===
    // The geojson features have properties: grid_id, baseline_lst, scenario_lst, delta_lst
    if (!map.getSource('scenario-prediction-source')) {
      map.addSource('scenario-prediction-source', { type: 'geojson', data });
    } else {
      map.getSource('scenario-prediction-source').setData(data);
    }

    // === Build scenario delta source ===
    // Ensure all features have delta_lst (compute if not present)
    const deltaFeatures = data.features.map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        grid_id: f.properties.grid_id,
        baseline_lst: f.properties.baseline_lst,
        scenario_lst: f.properties.scenario_lst,
        delta_lst: f.properties.delta_lst !== undefined
          ? f.properties.delta_lst
          : f.properties.scenario_lst != null && f.properties.baseline_lst != null
            ? f.properties.scenario_lst - f.properties.baseline_lst
            : null
      }
    }));
    const deltaFC = { type: 'FeatureCollection', features: deltaFeatures };

    if (!map.getSource('scenario-delta-source')) {
      map.addSource('scenario-delta-source', { type: 'geojson', data: deltaFC });
    } else {
      map.getSource('scenario-delta-source').setData(deltaFC);
    }

    const activeMode = (overlay.mode || 'DIFFERENCE').toLowerCase();

    // === Scenario prediction layer ===
    // Realistic thermal color ramp (blue -> green -> yellow -> red)
    const scenarioColorExpr = [
      'interpolate', ['linear'], ['get', 'scenario_lst'],
      24, 'rgba(49, 54, 149, 0.70)',
      30, 'rgba(69, 117, 180, 0.70)',
      34, 'rgba(116, 173, 209, 0.70)',
      38, 'rgba(253, 174, 97, 0.75)',
      42, 'rgba(244, 109, 67, 0.80)',
      46, 'rgba(215, 48, 39, 0.85)',
      52, 'rgba(165, 0, 38, 0.90)'
    ];

    if (!map.getLayer('scenario-prediction-layer')) {
      map.addLayer({
        id: 'scenario-prediction-layer',
        type: 'fill',
        source: 'scenario-prediction-source',
        paint: {
          'fill-color': scenarioColorExpr,
          'fill-opacity': 0.75
        },
        layout: { visibility: activeMode === 'scenario' ? 'visible' : 'none' }
      }, 'roads-major');
    } else {
      map.setPaintProperty('scenario-prediction-layer', 'fill-color', scenarioColorExpr);
      map.setPaintProperty('scenario-prediction-layer', 'fill-opacity', 0.75);
      map.setLayoutProperty('scenario-prediction-layer', 'visibility', activeMode === 'scenario' ? 'visible' : 'none');
    }

    // === Scenario delta layer ===
    // Negative = cooling (blue/cyan), Zero = TRANSPARENT (reveals map/buildings), Positive = warming (red/orange)
    const deltaColorExpr = [
      'interpolate', ['linear'], ['get', 'delta_lst'],
      -3.0, 'rgba(33, 102, 172, 0.85)',
      -1.5, 'rgba(67, 147, 195, 0.75)',
      -0.2, 'rgba(146, 197, 222, 0.40)',
      0.0,  'rgba(255, 255, 255, 0.00)', // Completely transparent on 0 delta!
      0.2,  'rgba(244, 165, 130, 0.40)',
      1.5,  'rgba(214, 96, 77, 0.75)',
      3.0,  'rgba(178, 24, 43, 0.85)'
    ];

    if (!map.getLayer('scenario-delta-layer')) {
      map.addLayer({
        id: 'scenario-delta-layer',
        type: 'fill',
        source: 'scenario-delta-source',
        paint: {
          'fill-color': deltaColorExpr,
          'fill-opacity': 0.80
        },
        layout: { visibility: activeMode === 'difference' ? 'visible' : 'none' }
      }, 'roads-major');
    } else {
      map.setPaintProperty('scenario-delta-layer', 'fill-color', deltaColorExpr);
      map.setPaintProperty('scenario-delta-layer', 'fill-opacity', 0.80);
      map.setLayoutProperty('scenario-delta-layer', 'visibility', activeMode === 'difference' ? 'visible' : 'none');
    }
  }, [mapReady, scenarioOverlay]);

  // ------------------------------------------------------------------ #
  // Hotspots layer
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visible = showHotspots && hotspots?.length > 0;
    const sourceId = 'hotspots-src';
    if (visible) {
      const fc = {
        type: 'FeatureCollection',
        features: hotspots.map((h, i) => ({
          type: 'Feature',
          properties: { rank: i + 1, lst: h.predicted_lst, grid_id: h.grid_id },
          geometry: { type: 'Point', coordinates: [h.longitude, h.latitude] }
        }))
      };
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data: fc });
      } else {
        map.getSource(sourceId).setData(fc);
      }
      if (!map.getLayer('hotspots-layer')) {
        map.addLayer({
          id: 'hotspots-layer', type: 'circle', source: sourceId,
          paint: {
            'circle-color': '#dc2626',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 16, 13],
            'circle-opacity': 0.85,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff'
          }
        });
        map.on('click', 'hotspots-layer', (e) => {
          const p = e.features[0].properties;
          onSelectLocation({ name: `Hotspot #${p.rank} — Grid ${p.grid_id}`, lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
        map.on('mousemove', 'hotspots-layer', (e) => {
          const p = e.features[0].properties;
          map.getCanvas().style.cursor = 'pointer';
          if (popupRef.current) popupRef.current.remove();
          popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 10, maxWidth: '200px' })
            .setLngLat(e.lngLat)
            .setHTML(`<div style="font-family:Inter,sans-serif;font-size:12px"><strong>#${p.rank} hotspot</strong><br/>Grid ${p.grid_id} · ${Number(p.lst).toFixed(1)} °C predicted LST</div>`)
            .addTo(map);
        });
        map.on('mouseleave', 'hotspots-layer', () => {
          map.getCanvas().style.cursor = '';
          if (popupRef.current) popupRef.current.remove();
        });
      }
    } else {
      removeLayerIfPresent(map, 'hotspots-layer');
      removeSourceIfPresent(map, sourceId);
    }
  }, [mapReady, showHotspots, hotspots, onSelectLocation]);

  // ------------------------------------------------------------------ #
  // Cooling potential layer
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visible = showCooling && coolingGeoJson?.features?.length > 0;
    if (visible) {
      if (!map.getSource('cooling-src')) {
        map.addSource('cooling-src', { type: 'geojson', data: coolingGeoJson });
      } else {
        map.getSource('cooling-src').setData(coolingGeoJson);
      }
      if (!map.getLayer('cooling-layer')) {
        addLayerIfMissing(map, {
          id: 'cooling-layer', type: 'fill', source: 'cooling-src',
          paint: {
            'fill-color': ['match', ['get', 'cooling_class'],
              'VERY HIGH', COOLING_CLASS_COLORS['VERY HIGH'],
              'HIGH', COOLING_CLASS_COLORS.HIGH,
              'MODERATE', COOLING_CLASS_COLORS.MODERATE,
              'LOW', COOLING_CLASS_COLORS.LOW,
              '#94a3b8'],
            'fill-opacity': 0.5
          }
        }, 'roads-major');
        map.on('mousemove', 'cooling-layer', (e) => {
          const p = e.features[0].properties;
          map.getCanvas().style.cursor = 'pointer';
          if (popupRef.current) popupRef.current.remove();
          popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 10, maxWidth: '220px' })
            .setLngLat(e.lngLat)
            .setHTML(`<div style="font-family:Inter,sans-serif;font-size:12px">
              <strong>${p.cooling_class} cooling potential</strong><br/>
              Zone ${p.grid_id} · up to −${Math.abs(Number(p.max_cooling_c)).toFixed(1)} °C (${p.best_scenario})</div>`)
            .addTo(map);
        });
        map.on('mouseleave', 'cooling-layer', () => {
          map.getCanvas().style.cursor = '';
          if (popupRef.current) popupRef.current.remove();
        });
      }
    } else {
      removeLayerIfPresent(map, 'cooling-layer');
      removeSourceIfPresent(map, 'cooling-src');
    }
  }, [mapReady, showCooling, coolingGeoJson]);

  // ------------------------------------------------------------------ #
  // Historical thermal layer (Landsat LST from Time Machine)
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const data = historicalLayerData;
    const hasData = data?.features?.features?.length > 0;

    if (!hasData) {
      removeLayerIfPresent(map, 'historical-thermal-fill');
      removeSourceIfPresent(map, 'historical-thermal');
      return;
    }

    // Add or update the historical thermal source
    if (!map.getSource('historical-thermal')) {
      map.addSource('historical-thermal', { type: 'geojson', data: data.features });
    } else {
      map.getSource('historical-thermal').setData(data.features);
    }

    // Calculate the LST domain for color mapping
    const features = data.features.features || [];
    let minLst = Infinity;
    let maxLst = -Infinity;
    for (const f of features) {
      const lst = f.properties?.lst;
      if (lst !== null && lst !== undefined && !Number.isNaN(lst)) {
        if (lst < minLst) minLst = lst;
        if (lst > maxLst) maxLst = lst;
      }
    }

    if (minLst === Infinity || maxLst === -Infinity) return;

    const mid = (minLst + maxLst) / 2;
    const expression = [
      'interpolate', ['linear'], ['get', 'lst'],
      minLst, '#2c7bb6',
      mid, '#fdae61',
      maxLst, '#d7191c'
    ];

    // Add or update the historical thermal layer
    if (map.getLayer('historical-thermal-fill')) {
      map.setPaintProperty('historical-thermal-fill', 'fill-color', expression);
      map.setPaintProperty('historical-thermal-fill', 'fill-opacity', 0.55);
      map.setLayoutProperty('historical-thermal-fill', 'visibility', 'visible');
    } else {
      addLayerIfMissing(map, {
        id: 'historical-thermal-fill',
        type: 'fill',
        source: 'historical-thermal',
        paint: {
          'fill-color': expression,
          'fill-opacity': 0.55
        }
      }, 'roads-major'); // below roads so the 3D city stays visible
    }

    // Add click handler for historical cells
    const onHistoricalClick = (e) => {
      const props = e.features?.[0]?.properties || {};
      const lst = props.lst;
      const cellId = props.cell_id;
      const valid = props.valid;

      if (popupRef.current) popupRef.current.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 12, maxWidth: '220px' })
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.55">
            <strong style="font-size:12.5px">Cell ${cellId}</strong>
            <div style="color:#94a3b8;font-size:11px">HISTORICAL OBSERVED LST</div>
            <div style="margin-top:6px;display:grid;grid-template-columns:auto auto;gap:2px 12px">
              <span style="color:#94a3b8">LST</span>
              <span style="font-weight:700;color:#dc2626">${valid && lst != null ? Number(lst).toFixed(1) + ' °C' : 'No data'}</span>
              <span style="color:#94a3b8">Source</span>
              <span style="font-weight:600">Landsat</span>
              <span style="color:#94a3b8">Date</span>
              <span style="font-weight:600">${historicalRef.current?.date || '—'}</span>
            </div>
            <div style="margin-top:6px;color:#b45309;font-size:10px;font-weight:600">
              Satellite-observed LST — not model prediction
            </div>
          </div>`
        )
        .addTo(map);
    };

    if (!cellHandlersBoundRef.current) {
      map.on('click', 'historical-thermal-fill', onHistoricalClick);
      map.on('mousemove', 'historical-thermal-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'historical-thermal-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    }
  }, [mapReady, historicalLayerData, historicalDate]);

  // ------------------------------------------------------------------ #
  // ------------------------------------------------------------------ #
  // Route layers (fastest, coolest, balanced + markers)
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapReady ? mapRef.current : null;
    if (!map || !mapReady) return;

    const f = routeData?.fastest;
    const c = routeData?.coolest;
    const b = routeData?.balanced;
    const selected = routeData?.selectedRoute || 'coolest';

    const addRoute = (id, geometry, color) => {
      const sourceId = `route-${id}`;
      const layerId = `route-line-${id}`;
      const glowLayerId = `route-glow-${id}`;

      if (!geometry || !geometry.coordinates || !geometry.coordinates.length) {
        removeLayerIfPresent(map, glowLayerId);
        removeLayerIfPresent(map, layerId);
        removeSourceIfPresent(map, sourceId);
        return;
      }

      const isSelected = selected === id;
      const data = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry }] };
      addOrUpdateSource(map, sourceId, data);

      // Glow layer for selected route
      if (isSelected) {
        if (!map.getLayer(glowLayerId)) {
          addLayerIfMissing(map, {
            id: glowLayerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': color,
              'line-width': 9,
              'line-opacity': 0.35,
              'line-blur': 3
            }
          });
        } else {
          map.setPaintProperty(glowLayerId, 'line-color', color);
          map.setPaintProperty(glowLayerId, 'line-opacity', 0.35);
        }
      } else {
        removeLayerIfPresent(map, glowLayerId);
      }

      // Core route line
      if (!map.getLayer(layerId)) {
        addLayerIfMissing(map, {
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': color,
            'line-width': isSelected ? 5.5 : 2.5,
            'line-opacity': isSelected ? 0.98 : 0.45,
            ...(isSelected ? {} : { 'line-dasharray': [3, 2] })
          }
        });
      } else {
        map.setPaintProperty(layerId, 'line-color', color);
        map.setPaintProperty(layerId, 'line-width', isSelected ? 5.5 : 2.5);
        map.setPaintProperty(layerId, 'line-opacity', isSelected ? 0.98 : 0.45);
        if (isSelected) {
          map.setPaintProperty(layerId, 'line-dasharray', [1, 0]);
        } else {
          map.setPaintProperty(layerId, 'line-dasharray', [3, 2]);
        }
      }
    };

    addRoute('fastest', f?.geometry, '#0284c7');
    addRoute('coolest', c?.geometry, '#16a34a');
    addRoute('balanced', b?.geometry, '#a78bfa');

    const allCoords = [];
    if (f?.geometry?.coordinates) allCoords.push(...f.geometry.coordinates);
    if (c?.geometry?.coordinates) allCoords.push(...c.geometry.coordinates);
    if (b?.geometry?.coordinates) allCoords.push(...b.geometry.coordinates);

    if (allCoords.length >= 2) {
      const bounds = new maplibregl.LngLatBounds();
      allCoords.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      map.fitBounds(bounds, { padding: 90, pitch: 52, duration: 1000 });
    }
  }, [mapReady, routeData]);

  // ------------------------------------------------------------------ #
  // Fly-to (search results, hotspots, interventions, sites)
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !flyTo) return;

    let targetLng = null;
    let targetLat = null;

    if (Array.isArray(flyTo) && flyTo.length >= 2) {
      [targetLng, targetLat] = flyTo;
    } else if (Array.isArray(flyTo.center) && flyTo.center.length >= 2) {
      [targetLng, targetLat] = flyTo.center;
    } else if (typeof flyTo.lng === 'number' && typeof flyTo.lat === 'number') {
      targetLng = flyTo.lng;
      targetLat = flyTo.lat;
    } else if (typeof flyTo.longitude === 'number' && typeof flyTo.latitude === 'number') {
      targetLng = flyTo.longitude;
      targetLat = flyTo.latitude;
    }

    if (targetLng == null || targetLat == null || Number.isNaN(targetLng) || Number.isNaN(targetLat)) {
      return;
    }

    map.flyTo({
      center: [Number(targetLng), Number(targetLat)],
      zoom: flyTo.zoom ?? 14,
      pitch: flyTo.pitch ?? 58,
      duration: 1400
    });
  }, [mapReady, flyTo]);

  // ------------------------------------------------------------------ #
  // Selected-point marker
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapReady ? mapRef.current : null;
    if (!map || !mapReady) return;
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (selectedPoint) {
      const el = document.createElement('div');
      el.className = 'map-selected-marker';
      el.innerHTML = '<span class="marker-pin"></span>';
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([selectedPoint.lng, selectedPoint.lat])
        .addTo(map);
    }
  }, [mapReady, selectedPoint]);

  // ------------------------------------------------------------------ #
  // Proposed Custom Buildings (Single or Multi-Building Planning Studio)
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapReady ? mapRef.current : null;
    if (!map || !mapReady) return;

    const sourceId = 'custom-proposed-building-src';
    const fillLayerId = 'custom-proposed-building-fill';
    const haloLayerId = 'custom-proposed-building-halo';

    // Normalize to array
    const rawList = Array.isArray(customBuilding)
      ? customBuilding
      : customBuilding && typeof customBuilding === 'object' && typeof customBuilding.lat === 'number'
        ? [customBuilding]
        : [];

    const buildingList = rawList.filter(b => b && typeof b.lat === 'number' && typeof b.lng === 'number');

    if (!buildingList.length) {
      removeLayerIfPresent(map, fillLayerId);
      removeLayerIfPresent(map, haloLayerId);
      removeSourceIfPresent(map, sourceId);
      return;
    }

    const features = [];

    buildingList.forEach((bldg, idx) => {
      const {
        lat, lng, floors = 4, footprint = 800, orientation = 0,
        color = '#8b5cf6', thermalDelta = 0, name = `Building ${idx + 1}`
      } = bldg;

      const heightM = Number(bldg.height_m ?? (floors * 3.3));
      const sideM = Math.sqrt(Math.max(100, footprint));
      const hw = sideM / 2;
      const hl = sideM / 2;
      const rad = (orientation * Math.PI) / 180;

      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const mToLat = 1 / 111320;
      const mToLng = 1 / (111320 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));

      // 4 corners of proposed building
      const corners = [
        [-hw * cos - -hl * sin, -hw * sin + -hl * cos],
        [hw * cos - -hl * sin, hw * sin + -hl * cos],
        [hw * cos - hl * sin, hw * sin + hl * cos],
        [-hw * cos - hl * sin, -hw * sin + hl * cos],
      ];

      const polyCoords = corners.map(([dx, dy]) => [lng + dx * mToLng, lat + dy * mToLat]);
      polyCoords.push(polyCoords[0]);

      // Surrounding thermal buffer halo
      const haloBufferM = sideM * 0.65;
      const haloCorners = [
        [-(hw + haloBufferM) * cos - -(hl + haloBufferM) * sin, -(hw + haloBufferM) * sin + -(hl + haloBufferM) * cos],
        [(hw + haloBufferM) * cos - -(hl + haloBufferM) * sin, (hw + haloBufferM) * sin + -(hl + haloBufferM) * cos],
        [(hw + haloBufferM) * cos - (hl + haloBufferM) * sin, (hw + haloBufferM) * sin + (hl + haloBufferM) * cos],
        [-(hw + haloBufferM) * cos - (hl + haloBufferM) * sin, -(hw + haloBufferM) * sin + (hl + haloBufferM) * cos],
      ];
      const haloCoords = haloCorners.map(([dx, dy]) => [lng + dx * mToLng, lat + dy * mToLat]);
      haloCoords.push(haloCoords[0]);

      // Building 3D extrusion feature
      features.push({
        type: 'Feature',
        properties: {
          is_building: true,
          id: bldg.id || `custom-bldg-${idx}`,
          name: name,
          height: heightM,
          color: color
        },
        geometry: {
          type: 'Polygon',
          coordinates: [polyCoords]
        }
      });

      // Halo feature
      features.push({
        type: 'Feature',
        properties: {
          is_halo: true,
          id: `halo-${idx}`,
          halo_color: thermalDelta <= 0 ? '#22c55e' : '#ef4444'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [haloCoords]
        }
      });
    });

    // Compute and add the Buildable Parcel & Open Space Zone Envelope
    const centerLat = buildingList.reduce((sum, b) => sum + b.lat, 0) / buildingList.length;
    const centerLng = buildingList.reduce((sum, b) => sum + b.lng, 0) / buildingList.length;
    const parcelRadiusM = 105;
    const mToLat = 1 / 111320;
    const mToLng = 1 / (111320 * Math.max(0.1, Math.cos((centerLat * Math.PI) / 180)));

    const parcelCorners = [];
    for (let i = 0; i <= 12; i++) {
      const angle = (i * 30 * Math.PI) / 180;
      parcelCorners.push([
        centerLng + Math.cos(angle) * parcelRadiusM * mToLng,
        centerLat + Math.sin(angle) * parcelRadiusM * mToLat
      ]);
    }

    features.push({
      type: 'Feature',
      properties: {
        is_parcel: true,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [parcelCorners]
      }
    });

    const featureCollection = {
      type: 'FeatureCollection',
      features
    };

    addOrUpdateSource(map, sourceId, featureCollection);

    const parcelFillId = 'custom-parcel-fill-layer';
    const parcelLineId = 'custom-parcel-line-layer';

    // Parcel Open Space Fill
    if (!map.getLayer(parcelFillId)) {
      addLayerIfMissing(map, {
        id: parcelFillId,
        type: 'fill',
        source: sourceId,
        filter: ['==', ['get', 'is_parcel'], true],
        paint: {
          'fill-color': '#22c55e',
          'fill-opacity': 0.08
        }
      }, 'roads-major');
    }

    // Parcel Boundary Dashed Outline
    if (!map.getLayer(parcelLineId)) {
      addLayerIfMissing(map, {
        id: parcelLineId,
        type: 'line',
        source: sourceId,
        filter: ['==', ['get', 'is_parcel'], true],
        paint: {
          'line-color': '#22c55e',
          'line-width': 2,
          'line-dasharray': [3, 2],
          'line-opacity': 0.8
        }
      }, 'roads-major');
    }

    // Thermal ground halo
    if (!map.getLayer(haloLayerId)) {
      addLayerIfMissing(map, {
        id: haloLayerId,
        type: 'fill',
        source: sourceId,
        filter: ['==', ['get', 'is_halo'], true],
        paint: {
          'fill-color': ['get', 'halo_color'],
          'fill-opacity': 0.38
        }
      }, 'roads-major');
    } else {
      map.setPaintProperty(haloLayerId, 'fill-color', ['get', 'halo_color']);
    }

    // 3D Building extrusion
    if (!map.getLayer(fillLayerId)) {
      addLayerIfMissing(map, {
        id: fillLayerId,
        type: 'fill-extrusion',
        source: sourceId,
        filter: ['==', ['get', 'is_building'], true],
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.95,
          'fill-extrusion-vertical-gradient': true
        }
      });
    } else {
      map.setPaintProperty(fillLayerId, 'fill-extrusion-color', ['get', 'color']);
      map.setPaintProperty(fillLayerId, 'fill-extrusion-height', ['get', 'height']);
    }
  }, [mapReady, customBuilding]);

  // ------------------------------------------------------------------ #
  // Draggable Building Cursor Markers
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapReady ? mapRef.current : null;
    if (!map || !mapReady) return;

    // Clean up previous building markers
    buildingMarkersRef.current.forEach(m => m.remove());
    buildingMarkersRef.current = [];

    const rawList = Array.isArray(customBuilding)
      ? customBuilding
      : customBuilding && typeof customBuilding === 'object' && typeof customBuilding.lat === 'number'
        ? [customBuilding]
        : [];

    const buildingList = rawList.filter(b => b && typeof b.lat === 'number' && typeof b.lng === 'number');

    buildingList.forEach((bldg, idx) => {
      const bldgId = bldg.id || `custom-bldg-${idx}`;
      const bldgName = bldg.name || `Tower ${idx + 1}`;
      const bldgColor = bldg.color || '#38bdf8';

      const el = document.createElement('div');
      el.className = 'custom-bldg-drag-anchor';
      el.style.cursor = 'grab';
      el.style.userSelect = 'none';
      el.style.pointerEvents = 'auto';
      el.innerHTML = `
        <div style="
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(12px);
          border: 2px solid ${bldgColor};
          border-radius: 9999px;
          padding: 4px 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
          font-family: inherit;
          white-space: nowrap;
          transform: translate(-50%, -100%);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        ">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${bldgColor}; box-shadow:0 0 8px ${bldgColor};"></span>
          <span style="color:#f8fafc; font-size:11px; font-weight:800; letter-spacing:0.02em;">${bldgName}</span>
          <span style="color:#38bdf8; font-size:9px; font-weight:700; background:rgba(56, 189, 248, 0.15); padding:1px 4px; border-radius:3px;">DRAG ME</span>
        </div>
      `;

      const marker = new maplibregl.Marker({
        element: el,
        draggable: true,
        anchor: 'bottom'
      })
        .setLngLat([bldg.lng, bldg.lat])
        .addTo(map);

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.08)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });
      el.addEventListener('mousedown', () => {
        el.style.cursor = 'grabbing';
      });

      marker.on('drag', () => {
        const { lng, lat } = marker.getLngLat();
        if (onBuildingDrag) {
          onBuildingDrag(bldgId, { lat, lng });
        }
      });

      marker.on('dragend', () => {
        el.style.cursor = 'grab';
        const { lng, lat } = marker.getLngLat();
        if (onBuildingMove) {
          onBuildingMove(bldgId, { lat, lng });
        } else if (onBuildingDrag) {
          onBuildingDrag(bldgId, { lat, lng });
        }
      });

      buildingMarkersRef.current.push(marker);
    });

    return () => {
      buildingMarkersRef.current.forEach(m => m.remove());
      buildingMarkersRef.current = [];
    };
  }, [mapReady, customBuilding, onBuildingDrag, onBuildingMove]);

  // ------------------------------------------------------------------ #
  // Vulnerable Population Zones Overlay
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapReady ? mapRef.current : null;
    if (!map || !mapReady) return;

    const srcId = 'vulnerable-zones-src';
    const fillId = 'vulnerable-zones-fill';
    const outlineId = 'vulnerable-zones-outline';

    if (!showVulnerableZones) {
      removeLayerIfPresent(map, fillId);
      removeLayerIfPresent(map, outlineId);
      removeSourceIfPresent(map, srcId);
      // Remove any popup markers
      vulnerableMarkersRef.current.forEach(m => m.remove());
      vulnerableMarkersRef.current = [];
      return;
    }

    // Synthetic vulnerable zone polygons (high HVI areas in Bhubaneswar)
    const zones = [
      { name: 'Khandagiri Slums', lat: 20.2566, lng: 85.7790, hvi: 0.89, pop: 18500, risk: 'Critical' },
      { name: 'Old Town Dense Core', lat: 20.2390, lng: 85.8340, hvi: 0.82, pop: 24000, risk: 'Critical' },
      { name: 'Rasulgarh Workers Colony', lat: 20.2970, lng: 85.8640, hvi: 0.76, pop: 11200, risk: 'High' },
      { name: 'Dumduma Resettlement', lat: 20.2390, lng: 85.7890, hvi: 0.71, pop: 8300, risk: 'High' },
      { name: 'Baramunda Transit Camp', lat: 20.2770, lng: 85.7950, hvi: 0.85, pop: 6800, risk: 'Critical' },
      { name: 'Mancheswar Labor Quarter', lat: 20.3290, lng: 85.8560, hvi: 0.68, pop: 9500, risk: 'High' },
    ];

    const d = 0.003;
    const features = zones.map(z => ({
      type: 'Feature',
      properties: {
        zone_name: z.name,
        hvi: z.hvi,
        vulnerable_pop: z.pop,
        risk_level: z.risk,
        fill_color: z.risk === 'Critical' ? '#ef4444' : '#f97316',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [z.lng - d, z.lat - d],
          [z.lng + d, z.lat - d],
          [z.lng + d, z.lat + d],
          [z.lng - d, z.lat + d],
          [z.lng - d, z.lat - d],
        ]]
      }
    }));

    addOrUpdateSource(map, srcId, { type: 'FeatureCollection', features });

    if (!map.getLayer(fillId)) {
      addLayerIfMissing(map, {
        id: fillId,
        type: 'fill-extrusion',
        source: srcId,
        paint: {
          'fill-extrusion-color': ['get', 'fill_color'],
          'fill-extrusion-height': ['*', ['get', 'hvi'], 12],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.5,
        }
      });
    }

    if (!map.getLayer(outlineId)) {
      addLayerIfMissing(map, {
        id: outlineId,
        type: 'line',
        source: srcId,
        paint: {
          'line-color': ['get', 'fill_color'],
          'line-width': 2,
          'line-dasharray': [3, 2],
          'line-opacity': 0.85,
        }
      });
    }

    // Popup on click
    const handleVulClick = (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties;
      new maplibregl.Popup({ offset: 20, closeButton: false })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:sans-serif;padding:4px;min-width:160px">
            <div style="font-weight:800;color:${p.fill_color};margin-bottom:4px">⚠ ${p.zone_name}</div>
            <div style="font-size:11px;color:#334155">HVI: <b>${Number(p.hvi).toFixed(2)}</b> · Risk: <b style='color:${p.fill_color}'>${p.risk_level}</b></div>
            <div style="font-size:11px;color:#334155">Vulnerable Population: <b>${Number(p.vulnerable_pop).toLocaleString()}</b></div>
            <div style="font-size:10px;color:#64748b;margin-top:4px">Priority cooling intervention zone</div>
          </div>
        `)
        .addTo(map);
    };

    if (map.getLayer(fillId)) {
      map.on('click', fillId, handleVulClick);
      map.on('mouseenter', fillId, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', fillId, () => { map.getCanvas().style.cursor = ''; });
    }

    return () => {
      removeLayerIfPresent(map, fillId);
      removeLayerIfPresent(map, outlineId);
      removeSourceIfPresent(map, srcId);
    };
  }, [mapReady, showVulnerableZones]);

  // ------------------------------------------------------------------ #
  // Orbit control
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (orbiting) {
      let raf;
      const spin = () => {
        map.easeTo({ bearing: map.getBearing() + 0.35, duration: 40 });
        orbitRef.current = raf = requestAnimationFrame(spin);
      };
      raf = requestAnimationFrame(spin);
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [mapReady, orbiting]);

  // ------------------------------------------------------------------ #
  // City-layer opacity
  // ------------------------------------------------------------------ #
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const apply = (ids, paint, pct) => {
      ids.forEach((id) => { if (map.getLayer(id)) map.setPaintProperty(id, paint, (pct ?? 80) / 100); });
    };
    apply(['building-extrusion'], 'fill-extrusion-opacity', opacities.buildings);
    apply(['roads-major', 'roads-local'], 'line-opacity', opacities.roads);
    apply(['green-fill', 'natural-green-fill'], 'fill-opacity', opacities.green);
    apply(['water-fill', 'natural-water-fill'], 'fill-opacity', opacities.water);
    apply(['trees-point', 'trees-cluster'], 'circle-opacity', opacities.trees);
  }, [mapReady, opacities]);

  // ------------------------------------------------------------------ #
  // Camera presets
  // ------------------------------------------------------------------ #
  const resetCamera = (preset = 'city') => {
    const map = mapRef.current;
    if (!map) return;
    if (preset === 'city') {
      const bounds = boundsFromGeoJson(boundaryRef.current);
      if (bounds) map.fitBounds(bounds, { padding: 40, pitch: 62, bearing: -22, duration: 1200 });
      return;
    }
    const target = selectedPoint || { lat: 20.2636, lng: 85.8275 };
    const zoom = preset === 'street' ? 16.8 : preset === 'district' ? 14.8 : 13.5;
    const pitch = preset === 'street' ? 78 : preset === 'district' ? 68 : 62;
    const bearing = preset === 'street' ? -45 : preset === 'district' ? 35 : -22;
    map.flyTo({ center: [target.lng, target.lat], zoom, pitch, bearing, duration: 1200 });
  };

  const toggleFullscreen = () => {
    const el = containerRef.current?.closest('.map-stage') || containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    } else {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => setIsFullscreen(false));
    }
  };

  const overlayHasData = scenarioOverlay?.geojson?.features?.length > 0;
  const overlayStyle = overlayHasData ? buildScenarioStyle(scenarioOverlay.geojson, scenarioOverlay.mode || 'DIFFERENCE') : null;
  const overlayLegend = overlayStyle ? scenarioGradient(overlayStyle.domain) : null;

  return (
    <div className="maplibre-shell">
      <div ref={containerRef} className="maplibre-container" />

      {/* Top-left: unified info panel (title + stats in flex column) */}
      {showInfoPanel && (
      <div className="map-overlay map-zone-top-left maplibre-info-panel">
        <div className="maplibre-info-header">
          <div className="maplibre-kicker"><Layers size={13} /> Bhubaneswar 3D Digital Twin</div>
          <strong>OSM / GIS-based city</strong>
          <span>{status.message}</span>
        </div>
        <div className="maplibre-stats-row" aria-label="Loaded 3D city layer counts">
          <span className="maplibre-stat-badge"><Building2 size={12} /> {counts.buildings.toLocaleString()} bldgs</span>
          <span className="maplibre-stat-badge"><Route size={12} /> {counts.roads.toLocaleString()} roads</span>
          <span className="maplibre-stat-badge"><Trees size={12} /> {counts.trees.toLocaleString()} trees</span>
          <span className="maplibre-stat-badge"><Waves size={12} /> {counts.water.toLocaleString()} water</span>
        </div>
      </div>
      )}

      {/* Top-right: Camera presets */}
      {showCameraControls && (
      <div className="map-overlay map-zone-top-right maplibre-camera" role="toolbar" aria-label="Camera controls">
        <button type="button" onClick={() => resetCamera('city')} title="City view — full Bhubaneswar" className="cam-btn active">
          <Home size={15} /> City
        </button>
        <button type="button" onClick={() => resetCamera('neighborhood')} title="Neighborhood view" className="cam-btn">
          <Camera size={15} /> District
        </button>
        <button type="button" onClick={() => resetCamera('street')} title="Street view" className="cam-btn">
          <Building2 size={15} /> Street
        </button>
        <button
          type="button"
          className={`cam-btn ${orbiting ? 'orbiting' : ''}`}
          onClick={() => setOrbiting((v) => !v)}
          title={orbiting ? 'Stop orbit' : 'Orbit around the city'}
        >
          <Orbit size={15} /> {orbiting ? 'Stop' : 'Orbit'}
        </button>
        <button type="button" onClick={() => resetCamera('city')} title="Reset camera" className="cam-btn">
          <RotateCcw size={15} /> Reset
        </button>
        <button
          type="button"
          className="cam-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
        >
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          {isFullscreen ? 'Exit' : 'Full'}
        </button>
      </div>
      )}

      {/* Scenario overlay legend — zone: below top-right */}
      {showScenarioLegend && overlayHasData && overlayLegend && (
        <div className="map-overlay map-zone-scenario-legend maplibre-scenario-card" aria-label="Cell-level scenario overlay">
          <div className="maplibre-kicker" style={{ marginBottom: '5px' }}><MapPin size={13} /> Scenario cells</div>
          <strong title={scenarioOverlay.scenario} style={{ fontSize: '0.8rem', display: 'block', marginBottom: '7px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {scenarioOverlay.scenario}
          </strong>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '9px' }}>
            {['CURRENT', 'SCENARIO', 'DIFFERENCE'].map((mode) => (
              <button key={mode} type="button" className={`overlay-tab ${scenarioOverlay.mode === mode ? 'active' : ''}`}
                onClick={() => onScenarioModeChange(mode)} style={{ fontSize: '0.62rem', padding: '3px 7px' }}>
                {mode}
              </button>
            ))}
          </div>
          <div className="scenario-gradient" style={{ background: overlayLegend.css }} />
          <div className="scenario-legend-labels">
            <span>{fmtCellValue(overlayStyle.domain.min)}</span>
            <span>{fmtCellValue(overlayStyle.domain.max)}</span>
          </div>
          <div className="scenario-end-labels">
            <span style={{ color: overlayStyle.domain.delta ? '#2166ac' : 'inherit' }}>{overlayStyle.domain.delta ? 'Cooler' : '°C'}</span>
            <span style={{ color: overlayStyle.domain.delta ? '#b2182b' : 'inherit' }}>{overlayStyle.domain.delta ? 'Warmer' : '°C'}</span>
          </div>
        </div>
      )}

      {/* Bottom-center: model + weather info (stacked compactly) */}
      {showSourceCard && currentPrediction && (
        <div className="map-overlay map-zone-bot-center maplibre-source-card" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          padding: '6px 12px',
          fontSize: '0.62rem',
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap'
        }}>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text-main)', marginRight: '4px' }}>MODELLED LST</span>
            <span>{currentPrediction.model_version ? 'V' + currentPrediction.model_version : 'V1'} · {currentPrediction.features_used} features</span>
          </div>
          <div style={{ fontSize: '0.56rem', color: 'var(--text-muted)' }}>
            Live weather: not used by V1 model · Click anywhere for location intelligence
          </div>
        </div>
      )}

      {/* Bottom-left: Coordinates */}
      {showCoords && cursorLngLat && (
        <div className="map-overlay map-zone-bot-left map-coords-chip">{cursorLngLat[0].toFixed(5)}, {cursorLngLat[1].toFixed(5)}</div>
      )}

      {/* Bottom-left: Data source (above coords) */}
      {showSourceCard && (
        <div className="map-overlay map-zone-bot-left maplibre-source-card" style={{ bottom: 'calc(var(--map-safe-bottom) + 36px)' }}>
          <Crosshair size={13} />
          <span>{status.loading ? 'Loading…' : `${status.source}`}</span>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ #
// Hover + cell popups (unchanged behaviour)
// ------------------------------------------------------------------ #
function showHoverPopup(map, popupRef, event, liveWeather) {
  const feature = event.features?.[0];
  const props = feature?.properties || {};
  const title = firstProperty(props, ['name', 'building', 'highway', 'leisure', 'natural', 'water', 'kind']);
  const details = [
    props.highway ? `Road class: ${props.highway}` : null,
    props.building ? `Building: ${props.building}` : null,
    props.render_height_m ? `Height: ${Number(props.render_height_m).toFixed(1)} m` : null,
    props.leisure ? `Green: ${props.leisure}` : null,
    props.natural ? `Natural: ${props.natural}` : null,
    props.water ? `Water: ${props.water}` : null,
    props.kind === 'tree' ? 'OSM tree (real record)' : null
  ].filter(Boolean);
  const tempLine = liveWeather?.temperature != null
    ? `<span style="color:#dc2626;font-weight:700">Live air: ${liveWeather.temperature} °C</span>`
    : '';
  if (popupRef.current) popupRef.current.remove();
  popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 12, maxWidth: '260px' })
    .setLngLat(event.lngLat)
    .setHTML(
      `<div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.5">
        <strong style="font-size:12.5px">${title}</strong>
        ${details.map((line) => `<div style="color:#475569">${line}</div>`).join('')}
        <div style="color:#94a3b8">${Number(event.lngLat.lat).toFixed(5)}° N, ${Number(event.lngLat.lng).toFixed(5)}° E</div>
        ${tempLine}
        <div style="margin-top:4px;color:#0284c7;font-weight:700">Click for details →</div>
      </div>`
    )
    .addTo(map);
}

export default DigitalTwinMap3D;
