import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Building2, TreePine, Leaf,
  Thermometer, Wind, Eye, BarChart3, Settings,
  Play, RotateCcw,
  AlertTriangle, Loader2, FileText, TrendingUp,
  TrendingDown, Target, Grid3X3, Waves, Sun,
  ArrowRight, CheckCircle2, XCircle, Info,
  Scale, Zap, Shield, Sparkles, Layers, RefreshCw,
  Plus, Minus, Compass, Copy, Trash2, Search,
  ChevronDown, ChevronUp, Download, Share2, Undo2, Redo2,
  Maximize, Minimize, Compass as CompassIcon, Sliders,
  CheckSquare, Square
} from 'lucide-react';
import { DigitalTwinMap3D } from '../components/DigitalTwinMap3D';
import { runCurrentScenario, fetchScenarioGeoJson } from '../services/backendClient';
import { fetchCityPoint } from '../services/cityClient';
import { searchLocations } from '../services/weatherService';
import '../city-planning.css';

const PRESET_SITES = [
  { name: 'Patia High-Tech Zone', lat: 20.3541, lng: 85.8182, tag: 'IT / High Growth' },
  { name: 'Khandagiri Urban District', lat: 20.2566, lng: 85.7790, tag: 'High UHI Hotspot' },
  { name: 'Central Smart Corridor', lat: 20.2961, lng: 85.8245, tag: 'Commercial Core' },
  { name: 'Bhubaneswar Railway Hub', lat: 20.2724, lng: 85.8618, tag: 'Dense Urban' },
  { name: 'ITER University Campus', lat: 20.2485, lng: 85.8012, tag: 'Institutional' },
];

const BUILDING_TYPES = [
  { key: 'residential', label: 'Residential', color: '#3b82f6', icon: Building2, floors: 6, footprint: 850, albedo: 0.25, baseFar: 2.0 },
  { key: 'commercial', label: 'Commercial', color: '#8b5cf6', icon: Building2, floors: 14, footprint: 1200, albedo: 0.35, baseFar: 3.5 },
  { key: 'mixed_use', label: 'Mixed Use', color: '#06b6d4', icon: Building2, floors: 8, footprint: 1000, albedo: 0.28, baseFar: 2.8 },
  { key: 'industrial', label: 'Industrial', color: '#f97316', icon: Building2, floors: 2, footprint: 2500, albedo: 0.20, baseFar: 1.2 },
  { key: 'public', label: 'Public / Civic', color: '#10b981', icon: Building2, floors: 4, footprint: 700, albedo: 0.35, baseFar: 1.5 },
];

const GREEN_INTERVENTIONS = [
  { key: 'tree_canopy', label: 'Shade Tree Canopy', color: '#16a34a', icon: TreePine, coolDelta: 1.4, desc: 'Plant 40+ mature canopy trees along parcel perimeter' },
  { key: 'cool_roof', label: 'High-Albedo Cool Roof', color: '#0284c7', icon: Sun, coolDelta: 0.9, desc: 'Apply high SRI reflective coating on building roofs' },
  { key: 'green_roof', label: 'Vegetated Green Roof', color: '#22c55e', icon: Leaf, coolDelta: 1.1, desc: 'Extensive sedum and vegetation rooftop coverage' },
  { key: 'pocket_park', label: 'Pocket Park & Bioswale', color: '#15803d', icon: Leaf, coolDelta: 1.6, desc: 'Dedicate 1,500 m² open permeable green sponge' },
  { key: 'water_feature', label: 'Urban Retention Basin', color: '#0ea5e9', icon: Waves, coolDelta: 0.7, desc: 'Microclimate evaporative retention water feature' },
  { key: 'traffic_calming', label: 'Traffic Calming & EV Corridors', color: '#f59e0b', icon: Wind, coolDelta: 0.8, desc: 'Reduce road heat load via traffic reduction, cycling lanes and EV transition' },
  { key: 'mixed_package', label: 'Mixed Intervention Bundle', color: '#22c55e', icon: Sparkles, coolDelta: 2.8, desc: 'Trees + cool roofs + traffic calming combined for max cooling — optimal for vulnerable zones' },
];

function fmt(v, d = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Number(v).toFixed(d);
}

function fmtDelta(v, d = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const n = Number(v);
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  const arrow = n > 0 ? '▲' : n < 0 ? '▼' : '';
  return `${arrow} ${sign}${Math.abs(n).toFixed(d)}`;
}

export function CityPlanningPage({ availability = {}, overlayMeta = {}, currentPrediction = null }) {
  // Navigation & Layout
  const [leftTab, setLeftTab] = useState('zoning'); // 'zoning' | 'green' | 'site'
  const [mapMode, setMapMode] = useState('current'); // 'current' | 'scenario' | 'difference'

  // Accordion Expand States
  const [expandedSections, setExpandedSections] = useState({
    buildings: true,
    properties: true,
    climate: true,
    optAlbedo: true,
    optCanopy: false,
    optRoof: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Site & Geography
  const [site, setSite] = useState(PRESET_SITES[0]);
  const [siteProfile, setSiteProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [flyTo, setFlyTo] = useState({ lng: PRESET_SITES[0].lng, lat: PRESET_SITES[0].lat, zoom: 15, pitch: 62 });

  // Location Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Multi-Building State with History for Undo/Redo
  const [buildings, setBuildings] = useState([
    {
      id: 'bldg-1',
      name: 'Tower A',
      type: 'commercial',
      floors: 14,
      footprint: 1200,
      albedo: 0.35,
      orientation: 45,
      lat: PRESET_SITES[0].lat,
      lng: PRESET_SITES[0].lng,
    },
    {
      id: 'bldg-2',
      name: 'Block B',
      type: 'residential',
      floors: 8,
      footprint: 850,
      albedo: 0.30,
      orientation: 0,
      lat: PRESET_SITES[0].lat + 0.0006,
      lng: PRESET_SITES[0].lng + 0.0008,
    }
  ]);
  const [activeBuildingId, setActiveBuildingId] = useState('bldg-1');
  const [selectedBuildingIds, setSelectedBuildingIds] = useState(['bldg-1']);

  // History Stack for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = useCallback((newBuildings) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(newBuildings))]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setBuildings(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setBuildings(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [history, historyIndex]);

  // Environmental Controls
  const [timeOfDay, setTimeOfDay] = useState(14); // 14:00 (2:00 PM peak)
  const [showShadows, setShowShadows] = useState(false);
  const [showWind, setShowWind] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Green interventions & Simulation
  const [activeInterventions, setActiveInterventions] = useState(['tree_canopy', 'cool_roof']);
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [scenarioOverlay, setScenarioOverlay] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [showVulnerableZones, setShowVulnerableZones] = useState(false);

  // Active building
  const activeBuilding = useMemo(() => {
    return buildings.find(b => b.id === activeBuildingId) || buildings[0] || null;
  }, [buildings, activeBuildingId]);

  const selectedBuildingType = useMemo(() => {
    if (!activeBuilding) return BUILDING_TYPES[0];
    return BUILDING_TYPES.find(b => b.key === activeBuilding.type) || BUILDING_TYPES[0];
  }, [activeBuilding]);

  const [isPlacingBuilding, setIsPlacingBuilding] = useState(false);
  const [draftBuilding, setDraftBuilding] = useState(null);

  // Sync refs to prevent stale closure in map click listeners
  const isPlacingBuildingRef = useRef(isPlacingBuilding);
  useEffect(() => {
    isPlacingBuildingRef.current = isPlacingBuilding;
  }, [isPlacingBuilding]);

  const draftBuildingRef = useRef(draftBuilding);
  useEffect(() => {
    draftBuildingRef.current = draftBuilding;
  }, [draftBuilding]);

  const buildingsRef = useRef(buildings);
  useEffect(() => {
    buildingsRef.current = buildings;
  }, [buildings]);

  // Keyboard shortcut Esc to cancel placement mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPlacingBuildingRef.current) {
        setIsPlacingBuilding(false);
        setDraftBuilding(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update active building
  const updateActiveBuilding = useCallback((updates) => {
    setBuildings(prev => {
      const next = prev.map(b => {
        if (b.id === activeBuildingId) {
          return { ...b, ...updates };
        }
        return b;
      });
      return next;
    });
  }, [activeBuildingId]);

  // Enter Placement Mode on "+ Add Block"
  const handleStartPlacement = useCallback(() => {
    const nextIdx = buildingsRef.current.length + 1;
    const draft = {
      name: `Tower ${String.fromCharCode(64 + nextIdx)}`,
      type: nextIdx % 2 === 0 ? 'residential' : 'commercial',
      floors: 10,
      footprint: 1000,
      albedo: 0.35,
      orientation: 0,
    };
    setDraftBuilding(draft);
    setIsPlacingBuilding(true);
  }, []);

  // Duplicate building
  const handleDuplicateBuilding = useCallback(() => {
    if (!activeBuilding) return;
    const newBldg = {
      ...activeBuilding,
      id: `bldg-${Date.now()}`,
      name: `${activeBuilding.name} (Copy)`,
      lat: activeBuilding.lat + 0.0004,
      lng: activeBuilding.lng + 0.0004,
    };
    const nextList = [...buildings, newBldg];
    setBuildings(nextList);
    setActiveBuildingId(newBldg.id);
    pushHistory(nextList);
  }, [activeBuilding, buildings, pushHistory]);

  // Delete building
  const handleDeleteBuilding = useCallback((idToDelete) => {
    if (buildings.length <= 1) return;
    const nextList = buildings.filter(b => b.id !== idToDelete);
    setBuildings(nextList);
    if (activeBuildingId === idToDelete && nextList.length > 0) {
      setActiveBuildingId(nextList[0].id);
      setSelectedBuildingIds([nextList[0].id]);
    }
    pushHistory(nextList);
  }, [buildings, activeBuildingId, pushHistory]);

  // Bulk Edit Actions
  const handleBulkApplyCoolRoof = useCallback(() => {
    setBuildings(prev => prev.map(b => {
      if (selectedBuildingIds.includes(b.id)) {
        return { ...b, albedo: 0.75 };
      }
      return b;
    }));
  }, [selectedBuildingIds]);

  const toggleSelectBuilding = (id) => {
    setSelectedBuildingIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Real-time Physics & Microclimate Model calculations
  const liveMetrics = useMemo(() => {
    const baselineLst = Number(siteProfile?.predicted_lst_c ?? 38.6);
    
    // Green cooling contribution
    const greenCooling = activeInterventions.reduce((sum, k) => {
      const item = GREEN_INTERVENTIONS.find(g => g.key === k);
      return sum + (item?.coolDelta || 0);
    }, 0);

    // Diurnal time-of-day heat modifier (peak at 14:00)
    const diurnalFactor = 1.0 + Math.sin(((timeOfDay - 8) / 12) * Math.PI) * 0.25;

    let totalGFA = 0;
    let totalFootprint = 0;
    let combinedHeating = 0;
    let combinedAlbedoMitigation = 0;

    const buildingContributions = {};

    buildings.forEach(bldg => {
      const gfa = bldg.footprint * bldg.floors;
      totalGFA += gfa;
      totalFootprint += bldg.footprint;

      const heightHeat = Math.max(0, (bldg.floors - 2) * 0.035);
      const fpFactor = Math.max(0, (bldg.footprint - 400) / 1000) * 0.12;
      const albedoMit = (bldg.albedo - 0.25) * 1.2;

      const singleDelta = (heightHeat + fpFactor - albedoMit) * diurnalFactor;
      buildingContributions[bldg.id] = Number(singleDelta.toFixed(2));

      combinedHeating += (heightHeat + fpFactor);
      combinedAlbedoMitigation += albedoMit;
    });

    const netDelta = Number(((combinedHeating - (greenCooling * 0.5) - combinedAlbedoMitigation) * diurnalFactor).toFixed(2));
    const proposedLst = Number((baselineLst + netDelta).toFixed(2));

    const parcelArea = Math.max(totalFootprint * 2.5, 5000);
    const far = Number((totalGFA / parcelArea).toFixed(2));

    // Green Coverage %
    const greenAreaM2 = activeInterventions.length * 750;
    const greenCoveragePct = Math.min(100, Math.round((greenAreaM2 / parcelArea) * 100));

    // Masterplan Resilience score (0 - 100)
    let score = 75;
    if (netDelta <= 0) score += Math.min(20, Math.abs(netDelta) * 14);
    else score -= Math.min(35, netDelta * 18);
    score += (activeInterventions.length * 4) + (greenCoveragePct * 0.15);
    score = Math.min(99, Math.max(20, Math.round(score)));

    const thermalDeltaCI = { low: netDelta - 0.35, high: netDelta + 0.35 };
    const greenCoolingCI = { low: greenCooling * 0.8, high: greenCooling * 1.2 };
    const confidenceLevel = buildings.length === 1 ? 'Low' : buildings.length <= 3 ? 'Moderate' : 'High';
    const confidenceColor = buildings.length === 1 ? '#f97316' : buildings.length <= 3 ? '#eab308' : '#22c55e';

    return {
      baselineLst,
      proposedLst,
      thermalDelta: netDelta,
      thermalDeltaCI,
      greenCooling,
      greenCoolingCI,
      confidenceLevel,
      confidenceColor,
      totalFloorArea: totalGFA,
      totalFootprint,
      far,
      score,
      parcelArea,
      greenCoveragePct,
      buildingContributions
    };
  }, [siteProfile, activeInterventions, buildings, timeOfDay]);

  // Proposed 3D buildings array passed to DigitalTwinMap3D
  const customBuildingsForMap = useMemo(() => {
    return buildings.map((bldg) => {
      const typeDef = BUILDING_TYPES.find(t => t.key === bldg.type) || BUILDING_TYPES[0];
      return {
        id: bldg.id,
        name: bldg.name,
        lat: bldg.lat,
        lng: bldg.lng,
        floors: bldg.floors,
        height_m: bldg.floors * 3.3,
        footprint: bldg.footprint,
        orientation: bldg.orientation,
        color: typeDef.color,
        type: bldg.type,
        albedo: bldg.albedo,
        thermalDelta: liveMetrics.thermalDelta,
      };
    });
  }, [buildings, liveMetrics.thermalDelta]);

  // Load site profile
  const loadSiteProfile = useCallback(async (lat, lng, name) => {
    setLoadingProfile(true);
    try {
      const data = await fetchCityPoint(lat, lng);
      setSiteProfile(data);
      setSite({ name: name || `Site (${fmt(lat, 4)}, ${fmt(lng, 4)})`, lat, lng });
    } catch {
      setSiteProfile({
        predicted_lst_c: 38.6,
        mean_ndvi: 0.22,
        mean_aqi: 92,
        building_density_pct: 46.5,
        elevation_m: 35.0,
        nearby_hotspots: 2,
        cooling_potential: 2.3
      });
      setSite({ name: name || `Site (${fmt(lat, 4)}, ${fmt(lng, 4)})`, lat, lng });
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadSiteProfile(PRESET_SITES[0].lat, PRESET_SITES[0].lng, PRESET_SITES[0].name);
  }, [loadSiteProfile]);

  // Location search handler
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSearchedLocation = useCallback((locItem) => {
    const lat = locItem.latitude;
    const lng = locItem.longitude;
    loadSiteProfile(lat, lng, locItem.name);
    setFlyTo({ lng, lat, zoom: 15.5, pitch: 62 });
    setSearchQuery('');
    setSearchOpen(false);

    setBuildings(prev => {
      const updated = prev.map((b, i) => ({
        ...b,
        lat: lat + (i * 0.0006),
        lng: lng + (i * 0.0006)
      }));
      pushHistory(updated);
      return updated;
    });
  }, [loadSiteProfile, pushHistory]);

  // Real-time Cursor Drag Handler for 3D Tower Movement
  const handleBuildingDrag = useCallback((id, { lat, lng }) => {
    let finalLat = Number(lat.toFixed(5));
    let finalLng = Number(lng.toFixed(5));
    if (snapToGrid) {
      finalLat = Math.round(finalLat * 10000) / 10000;
      finalLng = Math.round(finalLng * 10000) / 10000;
    }
    setBuildings(prev => prev.map(b => (b.id === id ? { ...b, lat: finalLat, lng: finalLng } : b)));
  }, [snapToGrid]);

  // Drag End: Commits to Undo/Redo History
  const handleBuildingMoveEnd = useCallback((id, { lat, lng }) => {
    let finalLat = Number(lat.toFixed(5));
    let finalLng = Number(lng.toFixed(5));
    if (snapToGrid) {
      finalLat = Math.round(finalLat * 10000) / 10000;
      finalLng = Math.round(finalLng * 10000) / 10000;
    }
    setBuildings(prev => {
      const updated = prev.map(b => (b.id === id ? { ...b, lat: finalLat, lng: finalLng } : b));
      pushHistory(updated);
      return updated;
    });
  }, [snapToGrid, pushHistory]);

  // Map Click: Places draft building if in placement mode, or teleports active building
  const handleMapClick = useCallback((lngLat) => {
    if (!lngLat || typeof lngLat.lat !== 'number' || typeof lngLat.lng !== 'number') return;
    let lat = Number(lngLat.lat.toFixed(5));
    let lng = Number(lngLat.lng.toFixed(5));

    if (snapToGrid) {
      lat = Math.round(lat * 10000) / 10000;
      lng = Math.round(lng * 10000) / 10000;
    }

    if (isPlacingBuildingRef.current && draftBuildingRef.current) {
      const draft = draftBuildingRef.current;
      const newBldg = {
        id: `bldg-${Date.now()}`,
        name: draft.name,
        type: draft.type,
        floors: draft.floors,
        footprint: draft.footprint,
        albedo: draft.albedo,
        orientation: draft.orientation,
        lat,
        lng,
      };
      const nextList = [...buildingsRef.current, newBldg];
      setBuildings(nextList);
      setActiveBuildingId(newBldg.id);
      setSelectedBuildingIds([newBldg.id]);
      setIsPlacingBuilding(false);
      setDraftBuilding(null);
      pushHistory(nextList);
      return;
    }

    updateActiveBuilding({ lat, lng });
  }, [snapToGrid, updateActiveBuilding, pushHistory]);

  // Drop on Map from Sidebar
  const handleDropOnMap = useCallback((e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const draftData = JSON.parse(raw);
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      const lat = Number((site.lat + (0.5 - relY) * 0.003).toFixed(5));
      const lng = Number((site.lng + (relX - 0.5) * 0.003).toFixed(5));

      const newBldg = {
        id: `bldg-${Date.now()}`,
        name: draftData.name || `Tower ${String.fromCharCode(65 + buildings.length)}`,
        type: draftData.type || 'commercial',
        floors: draftData.floors || 10,
        footprint: draftData.footprint || 1000,
        albedo: draftData.albedo || 0.35,
        orientation: draftData.orientation || 0,
        lat,
        lng,
      };
      const nextList = [...buildings, newBldg];
      setBuildings(nextList);
      setActiveBuildingId(newBldg.id);
      setSelectedBuildingIds([newBldg.id]);
      pushHistory(nextList);
    } catch {
      // ignore
    }
  }, [site.lat, site.lng, buildings, pushHistory]);

  // Simulation execution
  const handleRunSimulation = useCallback(async () => {
    setSimRunning(true);
    try {
      let backendScenario = 'increase_green_10';
      if (activeInterventions.length >= 3) {
        backendScenario = 'increase_green_20';
      } else if (activeInterventions.includes('cool_roof')) {
        backendScenario = 'cool_roofs_commercial';
      } else if (activeInterventions.includes('traffic_calming') || activeInterventions.includes('mixed_package')) {
        backendScenario = activeInterventions.includes('mixed_package') ? 'mixed_intervention' : 'decrease_traffic_30';
      } else if (activeInterventions.includes('traffic_calming')) {
        backendScenario = 'decrease_traffic_30';
      } else if (buildings.length > 2 || liveMetrics.totalFloorArea > 20000) {
        backendScenario = 'decrease_buildings_20';
      }

      const res = await runCurrentScenario({ scenario: backendScenario });
      try {
        const geojson = await fetchScenarioGeoJson(backendScenario);
        setScenarioOverlay(geojson);
      } catch {
        setScenarioOverlay(null);
      }

      setSimResult({
        ...res,
        baseline_lst: liveMetrics.baselineLst,
        proposed_lst: liveMetrics.proposedLst,
        delta_lst: liveMetrics.thermalDelta,
        cooling_gain: liveMetrics.greenCooling,
        scenario_name: backendScenario,
        executed_at: new Date().toLocaleTimeString()
      });
    } catch {
      setSimResult({
        success: true,
        baseline_lst: liveMetrics.baselineLst,
        proposed_lst: liveMetrics.proposedLst,
        delta_lst: liveMetrics.thermalDelta,
        cooling_gain: liveMetrics.greenCooling,
        scenario_name: 'masterplan_sim',
        executed_at: new Date().toLocaleTimeString()
      });
    } finally {
      setSimRunning(false);
    }
  }, [activeInterventions, buildings.length, liveMetrics]);

  const handleApplyOptimization = useCallback((type) => {
    if (type === 'albedo') {
      handleBulkApplyCoolRoof();
    } else if (type === 'trees') {
      if (!activeInterventions.includes('tree_canopy')) {
        setActiveInterventions(prev => [...prev, 'tree_canopy']);
      }
      if (!activeInterventions.includes('pocket_park')) {
        setActiveInterventions(prev => [...prev, 'pocket_park']);
      }
    } else if (type === 'green_roof') {
      if (!activeInterventions.includes('green_roof')) {
        setActiveInterventions(prev => [...prev, 'green_roof']);
      }
    }
  }, [activeInterventions, handleBulkApplyCoolRoof]);

  const handleShareDossier = () => {
    navigator.clipboard?.writeText(window.location.href);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2400);
  };

  const handleReset = useCallback(() => {
    setSite(PRESET_SITES[0]);
    const initBldgs = [
      {
        id: 'bldg-1',
        name: 'Tower A',
        type: 'commercial',
        floors: 14,
        footprint: 1200,
        albedo: 0.35,
        orientation: 45,
        lat: PRESET_SITES[0].lat,
        lng: PRESET_SITES[0].lng,
      },
      {
        id: 'bldg-2',
        name: 'Block B',
        type: 'residential',
        floors: 8,
        footprint: 850,
        albedo: 0.30,
        orientation: 0,
        lat: PRESET_SITES[0].lat + 0.0006,
        lng: PRESET_SITES[0].lng + 0.0008,
      }
    ];
    setBuildings(initBldgs);
    setActiveBuildingId('bldg-1');
    setSelectedBuildingIds(['bldg-1']);
    setActiveInterventions(['tree_canopy', 'cool_roof']);
    setSimResult(null);
    setScenarioOverlay(null);
    setMapMode('current');
    loadSiteProfile(PRESET_SITES[0].lat, PRESET_SITES[0].lng, PRESET_SITES[0].name);
    setFlyTo({ lng: PRESET_SITES[0].lng, lat: PRESET_SITES[0].lat, zoom: 15, pitch: 62 });
  }, [loadSiteProfile]);

  return (
    <div className="cp-page">
      {/* ================= HEADER ================= */}
      <header className="cp-header" role="banner">
        <div className="cp-header-left">
          <Building2 size={22} color="var(--hs-cyan)" aria-hidden="true" />
          <div>
            <h1 className="cp-title">City Planning &amp; Microclimate Digital Twin</h1>
            <p className="cp-subtitle">Multi-building master planning studio &middot; 3D zoning &middot; Microclimate regression</p>
          </div>
        </div>

        <div className="cp-header-right">
          {/* Undo / Redo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
            <button
              className="cp-ctrl-btn"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              aria-label="Undo building edit"
              title="Undo"
            >
              <Undo2 size={14} />
            </button>
            <button
              className="cp-ctrl-btn"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              aria-label="Redo building edit"
              title="Redo"
            >
              <Redo2 size={14} />
            </button>
          </div>

          <button
            className="cp-btn cp-btn-primary"
            onClick={() => setShowReport(true)}
            aria-label="Open urban planning assessment report"
          >
            <FileText size={14} aria-hidden="true" />
            <span>Assessment Report</span>
          </button>

          <button
            className="cp-btn cp-btn-ghost"
            onClick={handleShareDossier}
            aria-label="Share plan link"
          >
            <Share2 size={14} aria-hidden="true" />
            <span>{shareToast ? 'Link Copied!' : 'Share'}</span>
          </button>

          <button
            className="cp-btn cp-btn-ghost"
            onClick={handleReset}
            aria-label="Reset development plan to default"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* ================= LEFT SIDEBAR (SCROLLABLE ACCORDION) ================= */}
      <aside className="cp-side-panel" role="region" aria-label="Development studio controls">
        {/* Sticky Tab Header */}
        <div className="cp-sticky-tab-bar">
          <button
            className={`cp-tab-btn ${leftTab === 'zoning' ? 'active' : ''}`}
            onClick={() => setLeftTab('zoning')}
            aria-label="Switch to Multi-Building Zoning tab"
          >
            <Building2 size={13} aria-hidden="true" />
            <span>1. Buildings</span>
          </button>
          <button
            className={`cp-tab-btn ${leftTab === 'green' ? 'active' : ''}`}
            onClick={() => setLeftTab('green')}
            aria-label="Switch to Green Mitigation tab"
          >
            <Leaf size={13} aria-hidden="true" />
            <span>2. Green</span>
          </button>
          <button
            className={`cp-tab-btn ${leftTab === 'site' ? 'active' : ''}`}
            onClick={() => setLeftTab('site')}
            aria-label="Switch to Development Site Location tab"
          >
            <MapPin size={13} aria-hidden="true" />
            <span>3. Site</span>
          </button>
        </div>

        <div className="cp-panel-content">
          {/* TAB 1: MULTI-BUILDING ACCORDIONS */}
          {leftTab === 'zoning' && (
            <>
              {/* SECTION 1: BUILDINGS IN THIS PLAN (ACCORDION) */}
              <div className={`cp-accordion ${expandedSections.buildings ? 'expanded' : ''}`}>
                <div
                  className="cp-accordion-summary"
                  onClick={() => toggleSection('buildings')}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedSections.buildings}
                  aria-label="Toggle Buildings in this Plan section"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={14} color="#38bdf8" />
                    <span>Buildings in Plan ({buildings.length})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'none' }}>
                      {liveMetrics.totalFloorArea.toLocaleString()} m² GFA
                    </span>
                    {expandedSections.buildings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {expandedSections.buildings && (
                  <div className="cp-accordion-body">
                    {/* Add & Bulk Action Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        className="cp-btn cp-btn-primary"
                        onClick={handleStartPlacement}
                        style={{ minHeight: '32px', fontSize: '11px', padding: '0 10px' }}
                        aria-label="Add new building block by clicking on map"
                      >
                        <Plus size={13} />
                        <span>+ Add Block (Click to Place)</span>
                      </button>

                      {selectedBuildingIds.length > 0 && (
                        <button
                          onClick={handleBulkApplyCoolRoof}
                          style={{
                            fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px',
                            background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8',
                            cursor: 'pointer'
                          }}
                          aria-label="Apply cool roof to all selected buildings"
                        >
                          Cool Roof on {selectedBuildingIds.length}
                        </button>
                      )}
                    </div>

                    {/* Building Cards List */}
                    <div className="cp-bldg-list">
                      {buildings.map((bldg) => {
                        const isSelected = bldg.id === activeBuildingId;
                        const isChecked = selectedBuildingIds.includes(bldg.id);
                        const typeDef = BUILDING_TYPES.find(t => t.key === bldg.type) || BUILDING_TYPES[0];
                        const delta = liveMetrics.buildingContributions[bldg.id] ?? 0;

                        return (
                          <div
                            key={bldg.id}
                            draggable="true"
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/json', JSON.stringify(bldg));
                            }}
                            className={`cp-bldg-card ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              setActiveBuildingId(bldg.id);
                              if (!selectedBuildingIds.includes(bldg.id)) {
                                setSelectedBuildingIds([bldg.id]);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            title="Drag this card onto the map to reposition or duplicate"
                            aria-label={`Select building ${bldg.name}, ${bldg.floors} floors, ${bldg.footprint} square meters`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleSelectBuilding(bldg.id); }}
                                style={{ background: 'transparent', border: 'none', color: isChecked ? '#38bdf8' : '#64748b', cursor: 'pointer', padding: 0 }}
                                aria-label={`Checkbox select ${bldg.name}`}
                              >
                                {isChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                              </button>
                              <div className="cp-bldg-swatch" style={{ background: typeDef.color }} />
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc' }}>{bldg.name}</div>
                                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                  {bldg.floors}F ({(bldg.floors * 3.3).toFixed(1)}m) &middot; {bldg.footprint}m²
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '11px', fontWeight: 800,
                                color: delta <= 0 ? '#22c55e' : '#ef4444'
                              }}>
                                {delta > 0 ? `+${delta}` : delta}°C
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDuplicateBuilding(); }}
                                className="cp-ctrl-btn"
                                style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
                                aria-label={`Duplicate ${bldg.name}`}
                                title="Duplicate"
                              >
                                <Copy size={11} />
                              </button>
                              {buildings.length > 1 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteBuilding(bldg.id); }}
                                  className="cp-ctrl-btn"
                                  style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', color: '#ef4444' }}
                                  aria-label={`Delete ${bldg.name}`}
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: SELECTED BUILDING PROPERTIES (ACCORDION) */}
              {activeBuilding && (
                <div className={`cp-accordion ${expandedSections.properties ? 'expanded' : ''}`}>
                  <div
                    className="cp-accordion-summary"
                    onClick={() => toggleSection('properties')}
                    role="button"
                    tabIndex={0}
                    aria-expanded={expandedSections.properties}
                    aria-label="Toggle Selected Building Properties section"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sliders size={14} color="#38bdf8" />
                      <span>{activeBuilding.name} Properties</span>
                    </div>
                    {expandedSections.properties ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>

                  {expandedSections.properties && (
                    <div className="cp-accordion-body">
                      {/* Name & GPS editing */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label htmlFor="bldg-name-input" className="cp-field-label">BUILDING NAME</label>
                          <span style={{ fontSize: '10px', color: '#38bdf8', fontFamily: 'monospace' }}>
                            📍 {activeBuilding.lat.toFixed(4)}°N, {activeBuilding.lng.toFixed(4)}°E
                          </span>
                        </div>
                        <input
                          id="bldg-name-input"
                          type="text"
                          value={activeBuilding.name}
                          onChange={e => updateActiveBuilding({ name: e.target.value })}
                          style={{
                            width: '100%', padding: '8px 10px', borderRadius: '6px',
                            background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#f8fafc', fontSize: '12px', fontWeight: 700
                          }}
                          aria-label="Building Name"
                        />
                      </div>

                      {/* Typology Selector */}
                      <div>
                        <span className="cp-field-label">TYPOLOGY</span>
                        <div className="cp-type-selector">
                          {BUILDING_TYPES.map(bt => (
                            <button
                              key={bt.key}
                              className={`cp-type-option ${activeBuilding.type === bt.key ? 'active' : ''}`}
                              onClick={() => updateActiveBuilding({ type: bt.key, albedo: bt.albedo })}
                              aria-label={`Set typology to ${bt.label}`}
                            >
                              <bt.icon size={13} color={bt.color} aria-hidden="true" />
                              <span>{bt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* STORIES / FLOORS */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label htmlFor="floors-num-input" className="cp-field-label">STORIES (FLOORS)</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              className="cp-ctrl-btn"
                              onClick={() => updateActiveBuilding({ floors: Math.max(1, activeBuilding.floors - 1) })}
                              aria-label="Decrease floor count by 1"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              id="floors-num-input"
                              type="number"
                              min="1"
                              max="40"
                              value={activeBuilding.floors}
                              onChange={e => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v) && v >= 1) updateActiveBuilding({ floors: v });
                              }}
                              className="cp-num-input"
                              aria-label="Direct numeric input for stories"
                            />
                            <button
                              className="cp-ctrl-btn"
                              onClick={() => updateActiveBuilding({ floors: Math.min(40, activeBuilding.floors + 1) })}
                              aria-label="Increase floor count by 1"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="35"
                          value={activeBuilding.floors}
                          onChange={e => updateActiveBuilding({ floors: parseInt(e.target.value, 10) })}
                          className="cp-range-slider"
                          aria-label="Slider for building stories"
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                          <span>1 Story (3.3m)</span>
                          <span style={{ color: '#38bdf8', fontWeight: 700 }}>Height: {(activeBuilding.floors * 3.3).toFixed(1)}m</span>
                          <span>35 Stories (115m)</span>
                        </div>
                      </div>

                      {/* GROUND FOOTPRINT */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label htmlFor="footprint-num-input" className="cp-field-label">GROUND FOOTPRINT AREA</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              className="cp-ctrl-btn"
                              onClick={() => updateActiveBuilding({ footprint: Math.max(100, activeBuilding.footprint - 100) })}
                              aria-label="Decrease footprint by 100 square meters"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              id="footprint-num-input"
                              type="number"
                              min="100"
                              max="5000"
                              step="50"
                              value={activeBuilding.footprint}
                              onChange={e => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v) && v >= 100) updateActiveBuilding({ footprint: v });
                              }}
                              className="cp-num-input"
                              style={{ width: '62px' }}
                              aria-label="Direct numeric input for ground footprint in square meters"
                            />
                            <button
                              className="cp-ctrl-btn"
                              onClick={() => updateActiveBuilding({ footprint: Math.min(5000, activeBuilding.footprint + 100) })}
                              aria-label="Increase footprint by 100 square meters"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="200"
                          max="4000"
                          step="50"
                          value={activeBuilding.footprint}
                          onChange={e => updateActiveBuilding({ footprint: parseInt(e.target.value, 10) })}
                          className="cp-range-slider"
                          aria-label="Slider for footprint area"
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                          <span>Span: ~{Math.round(Math.sqrt(activeBuilding.footprint))}m &times; {Math.round(Math.sqrt(activeBuilding.footprint))}m</span>
                          <span style={{ color: '#38bdf8', fontWeight: 700 }}>GFA: {(activeBuilding.footprint * activeBuilding.floors).toLocaleString()} m²</span>
                        </div>
                      </div>

                      {/* ROOF SOLAR ALBEDO */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label htmlFor="albedo-num-input" className="cp-field-label">ROOF SOLAR REFLECTANCE (α)</label>
                          <input
                            id="albedo-num-input"
                            type="number"
                            min="0.15"
                            max="0.85"
                            step="0.05"
                            value={activeBuilding.albedo}
                            onChange={e => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) updateActiveBuilding({ albedo: v });
                            }}
                            className="cp-num-input"
                            aria-label="Roof Solar Albedo value"
                          />
                        </div>
                        <input
                          type="range"
                          min="0.15"
                          max="0.85"
                          step="0.05"
                          value={activeBuilding.albedo}
                          onChange={e => updateActiveBuilding({ albedo: parseFloat(e.target.value) })}
                          className="cp-range-slider"
                          aria-label="Slider for roof solar reflectance"
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                          <span>0.15 (Dark)</span>
                          <span style={{ color: activeBuilding.albedo >= 0.6 ? '#22c55e' : '#fb923c', fontWeight: 700 }}>
                            {activeBuilding.albedo >= 0.6 ? 'High SRI Cool Roof' : 'Standard Membrane'}
                          </span>
                          <span>0.85 (Ultra-Cool)</span>
                        </div>
                      </div>

                      {/* ROTATION */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label htmlFor="rot-num-input" className="cp-field-label">ROTATION / ORIENTATION</label>
                          <span style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 700 }}>
                            {activeBuilding.orientation}&deg;
                          </span>
                        </div>
                        <input
                          id="rot-num-input"
                          type="range"
                          min="0"
                          max="360"
                          step="5"
                          value={activeBuilding.orientation}
                          onChange={e => updateActiveBuilding({ orientation: parseInt(e.target.value, 10) })}
                          className="cp-range-slider"
                          aria-label="Slider for building orientation angle"
                        />
                      </div>

                      {/* OPEN SPACE RELOCATION CONTROLS */}
                      <div style={{
                        marginTop: '6px', padding: '10px', borderRadius: '8px',
                        background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)',
                        display: 'flex', flexDirection: 'column', gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Leaf size={13} />
                            <span>OPEN SPACE: {Math.max(0, liveMetrics.parcelArea - liveMetrics.totalFootprint).toLocaleString()} m² ({Math.round(Math.max(0, liveMetrics.parcelArea - liveMetrics.totalFootprint) / liveMetrics.parcelArea * 100)}% FREE)</span>
                          </span>
                        </div>

                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.35 }}>
                          Click anywhere inside the glowing green parcel boundary on the 3D map, or use the quick lots below to move <strong>{activeBuilding.name}</strong>:
                        </p>

                        {/* Quick Placement Lots */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                          <button
                            className="cp-btn"
                            style={{ minHeight: '30px', fontSize: '10px', padding: '0 6px', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#f8fafc' }}
                            onClick={() => updateActiveBuilding({ lat: Number((site.lat + 0.0005).toFixed(5)), lng: Number(site.lng.toFixed(5)) })}
                            aria-label="Move active building to North Lot"
                          >
                            📍 Move to North Lot
                          </button>
                          <button
                            className="cp-btn"
                            style={{ minHeight: '30px', fontSize: '10px', padding: '0 6px', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#f8fafc' }}
                            onClick={() => updateActiveBuilding({ lat: Number((site.lat - 0.0005).toFixed(5)), lng: Number(site.lng.toFixed(5)) })}
                            aria-label="Move active building to South Plaza"
                          >
                            📍 Move to South Plaza
                          </button>
                          <button
                            className="cp-btn"
                            style={{ minHeight: '30px', fontSize: '10px', padding: '0 6px', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#f8fafc' }}
                            onClick={() => updateActiveBuilding({ lat: Number(site.lat.toFixed(5)), lng: Number((site.lng + 0.0006).toFixed(5)) })}
                            aria-label="Move active building to East Expansion Lot"
                          >
                            📍 Move to East Lot
                          </button>
                          <button
                            className="cp-btn"
                            style={{ minHeight: '30px', fontSize: '10px', padding: '0 6px', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#f8fafc' }}
                            onClick={() => updateActiveBuilding({ lat: Number(site.lat.toFixed(5)), lng: Number((site.lng - 0.0006).toFixed(5)) })}
                            aria-label="Move active building to West Buffer"
                          >
                            📍 Move to West Lot
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: CLIMATE & SIMULATION CONTROLS (ACCORDION) */}
              <div className={`cp-accordion ${expandedSections.climate ? 'expanded' : ''}`}>
                <div
                  className="cp-accordion-summary"
                  onClick={() => toggleSection('climate')}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedSections.climate}
                  aria-label="Toggle Environmental and Climate parameters section"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sun size={14} color="#f59e0b" />
                    <span>Environmental Simulation</span>
                  </div>
                  {expandedSections.climate ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>

                {expandedSections.climate && (
                  <div className="cp-accordion-body">
                    {/* Time of day slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="cp-field-label">TIME OF DAY (SOLAR ANGLE)</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: timeOfDay >= 12 && timeOfDay <= 16 ? '#f97316' : '#38bdf8' }}>
                          {timeOfDay}:00 {timeOfDay < 12 ? 'AM' : 'PM'} {timeOfDay >= 12 && timeOfDay <= 16 ? '(Peak Heat)' : ''}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="20"
                        value={timeOfDay}
                        onChange={e => setTimeOfDay(parseInt(e.target.value, 10))}
                        className="cp-range-slider"
                        aria-label="Time of day slider from 6 AM to 8 PM"
                      />
                    </div>

                    {/* Shading & Wind toggles */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      <button
                        className={`cp-tab-btn ${showShadows ? 'active' : ''}`}
                        onClick={() => setShowShadows(p => !p)}
                        style={{ border: '1px solid rgba(255, 255, 255, 0.1)', minHeight: '38px' }}
                        aria-label="Toggle shadow study overlay"
                      >
                        <Sun size={13} />
                        <span>Shadow Study</span>
                      </button>

                      <button
                        className={`cp-tab-btn ${showWind ? 'active' : ''}`}
                        onClick={() => setShowWind(p => !p)}
                        style={{ border: '1px solid rgba(255, 255, 255, 0.1)', minHeight: '38px' }}
                        aria-label="Toggle wind flow streamlines"
                      >
                        <Wind size={13} />
                        <span>Wind Comfort</span>
                      </button>
                    </div>

                    {/* Snapping helper */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>10m Grid Alignment Snap</span>
                      <button
                        className={`cp-ctrl-btn ${snapToGrid ? 'active' : ''}`}
                        onClick={() => setSnapToGrid(p => !p)}
                        style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                        aria-label="Toggle 10 meter grid snapping"
                      >
                        <Grid3X3 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: GREEN MITIGATION */}
          {leftTab === 'green' && (
            <div className="cp-green-list">
              <span className="cp-field-label">MICROCLIMATE COOLING SPONGES</span>
              {GREEN_INTERVENTIONS.map(gi => {
                const isActive = activeInterventions.includes(gi.key);
                return (
                  <div
                    key={gi.key}
                    className={`cp-green-card ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveInterventions(prev =>
                        prev.includes(gi.key) ? prev.filter(k => k !== gi.key) : [...prev, gi.key]
                      );
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Toggle intervention ${gi.label}, cooling benefit minus ${gi.coolDelta} degrees`}
                  >
                    <div className="cp-green-card-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <gi.icon size={16} color={gi.color} aria-hidden="true" />
                        <span className="cp-green-card-title">{gi.label}</span>
                      </div>
                      <span className="cp-green-gain">&#9660; −{gi.coolDelta}&deg;C</span>
                    </div>
                    <p className="cp-green-desc">{gi.desc}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: SITE LOCATION */}
          {leftTab === 'site' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span className="cp-field-label">SEARCH DEVELOPMENT LOCATION</span>
                <div className="cp-search-box" style={{ width: '100%', marginBottom: '8px' }}>
                  <Search size={14} color="var(--hs-cyan)" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search site (Patia, Saheed Nagar, Khandagiri)…"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    aria-label="Search development location in site options"
                  />
                  <span className="cp-search-active-site">
                    📍 {site.name}
                  </span>
                </div>

                <AnimatePresence>
                  {searchOpen && searchResults.length > 0 && (
                    <motion.div
                      className="cp-search-dropdown"
                      style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto', marginBottom: '12px' }}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                    >
                      {searchResults.map((item, idx) => (
                        <div
                          key={idx}
                          className="cp-search-item"
                          onClick={() => handleSelectSearchedLocation(item)}
                          role="button"
                          tabIndex={0}
                          aria-label={`Select location ${item.name}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={13} color={item.isLocal ? '#38bdf8' : '#94a3b8'} aria-hidden="true" />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{item.name}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.admin1}</span>
                          </div>
                          {item.isLocal && (
                            <span className="cp-local-tag">LOCAL ZONE</span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Active Site Telemetry Card */}
              <div style={{
                padding: '12px', borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} color="#38bdf8" />
                      <span>{site.name}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {fmt(site.lat, 4)}°N, {fmt(site.lng, 4)}°E
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                    ACTIVE PARCEL
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '8px' }}>
                  <div style={{ padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Baseline LST</span>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc' }}>{fmt(siteProfile?.predicted_lst_c ?? 38.6)}°C</div>
                  </div>
                  <div style={{ padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>NDVI Vegetation</span>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#22c55e' }}>{fmt(siteProfile?.mean_ndvi ?? 0.22, 2)}</div>
                  </div>
                </div>
              </div>

              {/* Preset Zones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <span className="cp-field-label">BHUBANESWAR PRIORITY DEVELOPMENT ZONES</span>
                {PRESET_SITES.map(ps => {
                  const isSelected = site.name === ps.name;
                  return (
                    <div
                      key={ps.name}
                      className={`cp-bldg-card ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        loadSiteProfile(ps.lat, ps.lng, ps.name);
                        setFlyTo({ lng: ps.lng, lat: ps.lat, zoom: 15, pitch: 62 });
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select site ${ps.name}, ${ps.tag}`}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '12px', color: '#f8fafc' }}>{ps.name}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{ps.lat.toFixed(4)}°N, {ps.lng.toFixed(4)}°E</div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)', color: isSelected ? '#38bdf8' : '#94a3b8' }}>
                        {ps.tag}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ================= CENTER MAP CONTAINER ================= */}
      <main
        className="cp-map-container"
        role="main"
        aria-label="3D digital twin map workspace"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={handleDropOnMap}
        style={{ cursor: isPlacingBuilding ? 'crosshair' : 'default' }}
      >
        {/* Placement Mode Floating Banner */}
        {isPlacingBuilding && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 35,
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            border: '2px solid #38bdf8',
            color: '#f8fafc',
            padding: '10px 20px',
            borderRadius: '9999px',
            boxShadow: '0 0 28px rgba(56, 189, 248, 0.6), 0 12px 36px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 800,
            fontSize: '13px'
          }}>
            <Target size={18} color="#38bdf8" />
            <span>🎯 Click anywhere on the map to place <strong>{draftBuilding?.name}</strong></span>
            <button
              onClick={() => { setIsPlacingBuilding(false); setDraftBuilding(null); }}
              style={{
                background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '9999px', padding: '4px 10px', fontSize: '11px', fontWeight: 800,
                cursor: 'pointer', color: '#f8fafc'
              }}
              aria-label="Cancel building placement"
            >
              Cancel (Esc)
            </button>
          </div>
        )}

        {/* Top-Left Floating Open Space Guidance HUD */}
        {!isPlacingBuilding && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 20,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '10px',
            padding: '8px 12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
            maxWidth: '350px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Leaf size={13} />
                <span>OPEN SPACE: {Math.max(0, liveMetrics.parcelArea - liveMetrics.totalFootprint).toLocaleString()} m² ({Math.round(Math.max(0, liveMetrics.parcelArea - liveMetrics.totalFootprint) / liveMetrics.parcelArea * 100)}% FREE)</span>
              </span>
              <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700 }}>
                {activeBuilding?.name}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#f8fafc', margin: 0, lineHeight: 1.3 }}>
              🎯 <strong>Click or drag building markers</strong> on the 3D map to reposition!
            </p>
          </div>
        )}

        {/* Top-Right 3D Camera Controls (40x40px Min Tap Targets) */}
        <div className="cp-map-camera-stack" role="toolbar" aria-label="3D Camera View Controls">
          <button
            className="cp-camera-btn"
            onClick={() => setFlyTo({ lng: site.lng, lat: site.lat, zoom: 13, pitch: 58 })}
            aria-label="City View 3D"
            title="City View (58°)"
          >
            <Building2 size={16} />
          </button>
          <button
            className="cp-camera-btn"
            onClick={() => setFlyTo({ lng: site.lng, lat: site.lat, zoom: 15.2, pitch: 65 })}
            aria-label="District View 3D"
            title="District View (65°)"
          >
            <Layers size={16} />
          </button>
          <button
            className="cp-camera-btn"
            onClick={() => setFlyTo({ lng: activeBuilding?.lng ?? site.lng, lat: activeBuilding?.lat ?? site.lat, zoom: 17.2, pitch: 78 })}
            aria-label="Street Level 3D"
            title="Street Level (78°)"
          >
            <Eye size={16} />
          </button>
          <button
            className={`cp-camera-btn ${showVulnerableZones ? 'active' : ''}`}
            onClick={() => setShowVulnerableZones(v => !v)}
            aria-label="Toggle Vulnerable Population Zones Overlay"
            title="Vulnerable Zones (HVI)"
            style={showVulnerableZones ? { borderColor: '#ef4444', color: '#ef4444' } : {}}
          >
            <Shield size={16} />
          </button>
          <button
            className="cp-camera-btn"
            onClick={() => setFlyTo({ lng: site.lng, lat: site.lat, zoom: 15, pitch: 60, bearing: 0 })}
            aria-label="Reset Camera"
            title="Reset Orientation"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* The 3D Map Component */}
        <DigitalTwinMap3D
          layers={{
            CITY: { buildings: true, roads: true, water: true, green: true, trees: true, boundary: true },
            VEGETATION: { ndvi: false },
            HEAT: { predicted_lst: mapMode !== 'current' },
            TERRAIN: { terrain_3d: false }
          }}
          scenarioOverlay={scenarioOverlay}
          customBuilding={customBuildingsForMap}
          flyTo={flyTo}
          onMapClick={handleMapClick}
          onBuildingDrag={handleBuildingDrag}
          onBuildingMove={handleBuildingMoveEnd}
          showVulnerableZones={showVulnerableZones}
          showCameraControls={false}
          showInfoPanel={false}
          showSourceCard={false}
        />

        {/* Bottom 3-Mode Scenario Bar */}
        <div className="cp-mode-bar" role="tablist" aria-label="Thermal View Mode">
          <button
            className={`cp-mode-btn ${mapMode === 'current' ? 'active' : ''}`}
            onClick={() => setMapMode('current')}
            role="tab"
            aria-selected={mapMode === 'current'}
            aria-label="Show baseline thermal state"
          >
            <span>BASELINE</span>
          </button>
          <button
            className={`cp-mode-btn ${mapMode === 'scenario' ? 'active' : ''}`}
            onClick={() => setMapMode('scenario')}
            role="tab"
            aria-selected={mapMode === 'scenario'}
            aria-label="Show proposed master plan state"
          >
            <span>PROPOSED</span>
          </button>
          <button
            className={`cp-mode-btn ${mapMode === 'difference' ? 'active' : ''}`}
            onClick={() => setMapMode('difference')}
            role="tab"
            aria-selected={mapMode === 'difference'}
            aria-label="Show thermal difference delta"
          >
            <span>DIFFERENCE (&Delta;T)</span>
          </button>
        </div>
      </main>

      {/* ================= RIGHT INSIGHTS PANEL ================= */}
      <aside className="cp-side-panel-right" role="region" aria-label="Master plan analytics and AI recommendations">
        {/* TOP BLOCK: CURRENT STATE METRICS (STICKY) */}
        <div className="cp-insights-sticky-top">
          <div className="cp-delta-hero">
            <span className="cp-field-label">MASTER PLAN THERMAL DELTA (&Delta;T)</span>
            <div className="cp-delta-val" style={{ color: liveMetrics.thermalDelta <= 0 ? '#22c55e' : '#ef4444' }}>
              <span>{fmtDelta(liveMetrics.thermalDelta)}&deg;C</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Baseline {fmt(liveMetrics.baselineLst)}&deg;C &rarr; <strong style={{ color: '#f8fafc' }}>{fmt(liveMetrics.proposedLst)}&deg;C</strong>
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>95% CI: [{fmtDelta(liveMetrics.thermalDeltaCI?.low, 1)} to {fmtDelta(liveMetrics.thermalDeltaCI?.high, 1)}°C]</span>
              <span style={{
                background: (liveMetrics.confidenceColor || '#22c55e') + '20',
                border: `1px solid ${liveMetrics.confidenceColor || '#22c55e'}`,
                color: liveMetrics.confidenceColor || '#22c55e',
                borderRadius: '9999px',
                padding: '1px 6px',
                fontSize: '9px',
                fontWeight: 800
              }}>
                {liveMetrics.confidenceLevel} Confidence
              </span>
            </div>

            {/* Score & Green Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '10px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', textAlign: 'center' }}>
                <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700 }}>RESILIENCE</span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--hs-cyan)' }}>{liveMetrics.score}/100</div>
              </div>
              <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', textAlign: 'center' }}>
                <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700 }}>FAR</span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>{liveMetrics.far}</div>
              </div>
              <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', textAlign: 'center' }}>
                <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700 }}>GREEN %</span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#22c55e' }}>{liveMetrics.greenCoveragePct}%</div>
              </div>
            </div>
          </div>

          {/* MIDDLE BLOCK: SIMULATE BUTTON */}
          <button
            className="cp-btn-sim"
            onClick={handleRunSimulation}
            disabled={simRunning}
            aria-label="Simulate full masterplan impact on 53,802 grid lattice"
          >
            {simRunning ? (
              <>
                <Loader2 size={16} className="cp-spin" aria-hidden="true" />
                <span>Simulating 53,802 Grid Cells…</span>
              </>
            ) : (
              <>
                <Play size={16} aria-hidden="true" />
                <span>Simulate Full Masterplan Impact</span>
              </>
            )}
          </button>
        </div>

        {/* BOTTOM BLOCK: AI OPTIMIZATION RECOMMENDATIONS (ACCORDION CARDS) */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span className="cp-field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} color="var(--hs-cyan)" aria-hidden="true" />
            AI CLIMATE OPTIMIZATIONS
          </span>

          {/* Recommendation 1: Cool Roof */}
          <div className={`cp-opt-card ${expandedSections.optAlbedo ? 'expanded' : ''}`}>
            <div
              className="cp-opt-head"
              onClick={() => toggleSection('optAlbedo')}
              role="button"
              tabIndex={0}
              aria-expanded={expandedSections.optAlbedo}
              aria-label="Toggle Cool Roof recommendation"
            >
              <div className="cp-opt-title">
                <Sun size={14} color="#0284c7" />
                <span>High-Albedo Cool Roofs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="cp-opt-gain">&#9660; −0.9&deg;C</span>
                {expandedSections.optAlbedo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
            </div>

            {expandedSections.optAlbedo && (
              <div className="cp-opt-body">
                <span>Applies &ge;0.75 solar reflectance membranes across all planned building roofs to reflect shortwave irradiance.</span>
                <button
                  className="cp-opt-apply-btn"
                  onClick={() => handleApplyOptimization('albedo')}
                  aria-label="Apply cool roof recommendation to all proposed buildings"
                >
                  Apply to All Blocks
                </button>
              </div>
            )}
          </div>

          {/* Recommendation 2: Canopy Trees */}
          <div className={`cp-opt-card ${expandedSections.optCanopy ? 'expanded' : ''}`}>
            <div
              className="cp-opt-head"
              onClick={() => toggleSection('optCanopy')}
              role="button"
              tabIndex={0}
              aria-expanded={expandedSections.optCanopy}
              aria-label="Toggle Canopy Trees recommendation"
            >
              <div className="cp-opt-title">
                <TreePine size={14} color="#16a34a" />
                <span>Perimeter Canopy Buffer</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="cp-opt-gain">&#9660; −1.4&deg;C</span>
                {expandedSections.optCanopy ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
            </div>

            {expandedSections.optCanopy && (
              <div className="cp-opt-body">
                <span>Plant mature native shade trees around the parcel perimeter to shade asphalt corridors and pedestrian pathways.</span>
                <button
                  className="cp-opt-apply-btn"
                  onClick={() => handleApplyOptimization('trees')}
                  aria-label="Apply perimeter canopy trees recommendation"
                >
                  Apply Canopy Buffer
                </button>
              </div>
            )}
          </div>

          {/* Recommendation 3: Green Roof */}
          <div className={`cp-opt-card ${expandedSections.optRoof ? 'expanded' : ''}`}>
            <div
              className="cp-opt-head"
              onClick={() => toggleSection('optRoof')}
              role="button"
              tabIndex={0}
              aria-expanded={expandedSections.optRoof}
              aria-label="Toggle Vegetated Green Roof recommendation"
            >
              <div className="cp-opt-title">
                <Leaf size={14} color="#22c55e" />
                <span>Vegetated Green Roof</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="cp-opt-gain">&#9660; −1.1&deg;C</span>
                {expandedSections.optRoof ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
            </div>

            {expandedSections.optRoof && (
              <div className="cp-opt-body">
                <span>Integrates extensive sedum vegetative rooftop blankets to boost evapotranspiration and stormwater retention.</span>
                <button
                  className="cp-opt-apply-btn"
                  onClick={() => handleApplyOptimization('green_roof')}
                  aria-label="Apply vegetated green roof recommendation"
                >
                  Apply Green Roof
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ================= ASSESSMENT REPORT MODAL ================= */}
      <AnimatePresence>
        {showReport && (
          <div className="cp-modal-backdrop" onClick={() => setShowReport(false)}>
            <motion.div
              className="cp-report-modal"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              role="dialog"
              aria-modal="true"
              aria-label="Master Plan Thermal Assessment Report"
            >
              <div className="cp-report-modal-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--hs-cyan)" aria-hidden="true" />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Master Plan Thermal Assessment Dossier</span>
                </div>
                <button className="cp-btn cp-btn-ghost" onClick={() => setShowReport(false)} aria-label="Close report dialog">
                  <XCircle size={16} />
                </button>
              </div>

              <div className="cp-report-body">
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--hs-cyan)', margin: '0 0 8px 0' }}>1. LOCATION &amp; SITE PROFILE</h4>
                  <div className="cp-report-grid-summary">
                    <div className="cp-report-item"><span>Site Zone</span><span>{site.name}</span></div>
                    <div className="cp-report-item"><span>Coordinates</span><span>{fmt(site.lat, 4)}&deg;N, {fmt(site.lng, 4)}&deg;E</span></div>
                    <div className="cp-report-item"><span>Baseline LST</span><span>{fmt(liveMetrics.baselineLst)}&deg;C</span></div>
                    <div className="cp-report-item"><span>Green Coverage</span><span>{liveMetrics.greenCoveragePct}%</span></div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--hs-cyan)', margin: '0 0 8px 0' }}>2. MASTER PLAN BUILDING SPECIFICATIONS ({buildings.length} BLOCKS)</h4>
                  <div className="cp-report-grid-summary">
                    <div className="cp-report-item"><span>Building Blocks</span><span>{buildings.length} Blocks Proposed</span></div>
                    <div className="cp-report-item"><span>Total Footprint Area</span><span>{liveMetrics.totalFootprint.toLocaleString()} m²</span></div>
                    <div className="cp-report-item"><span>Total Gross Floor Area</span><span>{liveMetrics.totalFloorArea.toLocaleString()} m²</span></div>
                    <div className="cp-report-item"><span>Floor Area Ratio (FAR)</span><span>{liveMetrics.far} FAR</span></div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--hs-cyan)', margin: '0 0 8px 0' }}>3. MICROCLIMATE IMPACT ASSESSMENT</h4>
                  <div className="cp-report-grid-summary">
                    <div className="cp-report-item">
                      <span>Cumulative Thermal Delta</span>
                      <span style={{ color: liveMetrics.thermalDelta <= 0 ? '#22c55e' : '#ef4444', fontWeight: 800 }}>
                        {fmtDelta(liveMetrics.thermalDelta)}&deg;C
                      </span>
                    </div>
                    <div className="cp-report-item">
                      <span>Post-Development LST</span>
                      <span>{fmt(liveMetrics.proposedLst)}&deg;C</span>
                    </div>
                    <div className="cp-report-item">
                      <span>Green Mitigation Cooling</span>
                      <span style={{ color: '#22c55e' }}>&#9660; −{fmt(liveMetrics.greenCooling)}&deg;C</span>
                    </div>
                    <div className="cp-report-item">
                      <span>Resilience Score</span>
                      <span style={{ color: 'var(--hs-cyan)', fontWeight: 800 }}>{liveMetrics.score} / 100</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button className="cp-btn cp-btn-primary" onClick={() => window.print()} aria-label="Print or save as PDF">
                    <Download size={14} />
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CityPlanningPage;
