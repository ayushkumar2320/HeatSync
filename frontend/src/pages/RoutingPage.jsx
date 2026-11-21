import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Route, MapPin, Clock, Sun, TreePine, Wind, Cloud,
  ChevronDown, ChevronUp, AlertTriangle, Info, Leaf,
  Thermometer, Settings2, X, Activity, ArrowUpDown,
  Navigation, Zap, Compass, CheckCircle2, Shield, HeartPulse,
  User, Footprints, Bike, Sparkles, Loader2, Search
} from 'lucide-react';
import { DigitalTwinMap3D } from '../components/DigitalTwinMap3D';
import { fetchHeatSafeRoute } from '../services/cityClient';
import { searchPlaces } from '../services/geocoding';
import '../thermal-routing.css';

/* --------------------------------------------------------------------------
   Local Bhubaneswar Knowledge Graph / POI Database
   -------------------------------------------------------------------------- */

const BHUBANESWAR_PLACES = [
  { name: 'Patia IT Hub / Infocity', sub: 'Tech & High-Growth Zone', lat: 20.3541, lng: 85.8182, tag: 'IT Park' },
  { name: 'KIIT University Campus', sub: 'Education District, Patia', lat: 20.3533, lng: 85.8170, tag: 'Campus' },
  { name: 'Chandrasekharpur Housing Board', sub: 'Residential Suburb', lat: 20.3235, lng: 85.8205, tag: 'Residential' },
  { name: 'Jaydev Vihar Square', sub: 'Central Commercial Junction', lat: 20.3010, lng: 85.8210, tag: 'Junction' },
  { name: 'Ekamra Kanan Botanical Garden', sub: 'Urban Forest & Lake Park', lat: 20.3015, lng: 85.8120, tag: 'Park' },
  { name: 'Nayapalli IRC Village', sub: 'Commercial & Civic Hub', lat: 20.2980, lng: 85.8160, tag: 'Commercial' },
  { name: 'Odisha Secretariat / Lok Seva Bhawan', sub: 'State Government District', lat: 20.2910, lng: 85.8360, tag: 'Civic' },
  { name: 'Utkal University / Vani Vihar', sub: 'University Campus, NH16', lat: 20.3025, lng: 85.8450, tag: 'University' },
  { name: 'Saheed Nagar Commercial Complex', sub: 'Retail & Office Zone', lat: 20.2880, lng: 85.8480, tag: 'Retail' },
  { name: 'Bhubaneswar Master Canteen Square', sub: 'City Center Transit Node', lat: 20.2724, lng: 85.8420, tag: 'Transit' },
  { name: 'Bhubaneswar Railway Station', sub: 'Central Rail Hub', lat: 20.2724, lng: 85.8618, tag: 'Station' },
  { name: 'Rasulgarh Industrial Square', sub: 'East Gateway & Cuttack Road', lat: 20.2885, lng: 85.8680, tag: 'Industrial' },
  { name: 'Khandagiri & Udayagiri Caves', sub: 'Heritage & High UHI Hotspot', lat: 20.2566, lng: 85.7790, tag: 'Heritage' },
  { name: 'AIIMS Bhubaneswar Hospital', sub: 'Apex Health Institute, Sijua', lat: 20.2312, lng: 85.7745, tag: 'Hospital' },
  { name: 'ITER University Campus / Jagamara', sub: 'Institutional Campus', lat: 20.2485, lng: 85.8012, tag: 'Campus' },
  { name: 'Dumduma Housing Colony', sub: 'Residential District', lat: 20.2390, lng: 85.7890, tag: 'Residential' },
  { name: 'Pokhariput Ananda Nagar', sub: 'Southwest Residential', lat: 20.2460, lng: 85.8140, tag: 'Residential' },
  { name: 'Biju Patnaik International Airport', sub: 'Airport Terminal Core', lat: 20.2520, lng: 85.8180, tag: 'Airport' },
  { name: 'Old Town & Lingaraj Temple', sub: 'Historic Religious Core', lat: 20.2380, lng: 85.8340, tag: 'Heritage' },
  { name: 'Mancheswar Industrial Estate', sub: 'Industrial & Freight Zone', lat: 20.3290, lng: 85.8560, tag: 'Industrial' },
  { name: 'Nandankanan Zoological Park', sub: 'Botanical & Sanctuary Lake', lat: 20.3950, lng: 85.8240, tag: 'Sanctuary' },
];

const PRESET_CORRIDORS = [
  {
    name: 'Patia IT Hub → KIIT Campus',
    origin: BHUBANESWAR_PLACES[0],
    destination: BHUBANESWAR_PLACES[1],
    tag: 'Tech Corridor',
  },
  {
    name: 'Master Canteen → Secretariat',
    origin: BHUBANESWAR_PLACES[9],
    destination: BHUBANESWAR_PLACES[6],
    tag: 'Civic Core',
  },
  {
    name: 'Khandagiri Caves → AIIMS Hospital',
    origin: BHUBANESWAR_PLACES[12],
    destination: BHUBANESWAR_PLACES[13],
    tag: 'Health Corridor',
  },
  {
    name: 'Ekamra Kanan → Utkal University',
    origin: BHUBANESWAR_PLACES[4],
    destination: BHUBANESWAR_PLACES[7],
    tag: 'Green Path',
  },
];

const USER_PROFILES = [
  {
    id: 'standard',
    label: 'Standard Pedestrian',
    icon: Footprints,
    desc: 'Balanced speed and thermal comfort',
    weights: { distance: 1.0, heat: 1.5, aqi: 0.8, shade: 1.2, vegetation: 1.0 },
  },
  {
    id: 'sensitive',
    label: 'Elderly / Heat-Sensitive',
    icon: HeartPulse,
    desc: 'Prioritizes maximum shade and coolest corridor',
    weights: { distance: 0.6, heat: 3.5, aqi: 2.0, shade: 3.0, vegetation: 2.5 },
  },
  {
    id: 'runner',
    label: 'Active Runner / Cyclist',
    icon: Bike,
    desc: 'Clean air quality, tree cover, and continuous path',
    weights: { distance: 1.2, heat: 1.0, aqi: 2.8, shade: 1.5, vegetation: 2.0 },
  },
  {
    id: 'worker',
    label: 'Outdoor Worker / Commuter',
    icon: User,
    desc: 'Minimizes peak solar radiation exposure',
    weights: { distance: 0.8, heat: 2.8, aqi: 1.5, shade: 2.5, vegetation: 1.8 },
  },
];

const DEPARTURE_TIMES = [
  { id: 'morning', label: 'Morning (07:30 AM)', desc: 'Mild ambient, early sun', icon: Cloud },
  { id: 'noon', label: 'Noon Peak (01:00 PM)', desc: 'Maximum solar radiation & UHI', icon: Sun },
  { id: 'evening', label: 'Evening (05:30 PM)', desc: 'Residual ground heat', icon: Wind },
];

const ROUTE_CONFIG = {
  fastest: { label: 'Fastest Route', color: '#0284c7', icon: Route, subtitle: 'Direct shortest path' },
  coolest: { label: 'Coolest Thermal Route', color: '#16a34a', icon: Sun, subtitle: 'Canopy shade & low LST' },
  balanced: { label: 'Balanced Route', color: '#a78bfa', icon: Activity, subtitle: 'Optimized speed & comfort' },
};

function fmt(v, d = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Number(v).toFixed(d);
}

/* --------------------------------------------------------------------------
   Place Search Autocomplete Component
   -------------------------------------------------------------------------- */

function PlaceSearchBox({
  label,
  value,
  onSelect,
  isPicking,
  onTogglePick,
  accentColor = '#0284c7',
  placeholder = 'Type place name or address...'
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const wrapperRef = useRef(null);
  const timerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update query when value changes from outside
  useEffect(() => {
    if (value) {
      setQuery(value.name || `${fmt(value.lat, 4)}, ${fmt(value.lng, 4)}`);
    } else {
      setQuery('');
    }
  }, [value]);

  // Combined local POI filtering + debounced backend OSM search
  const handleQueryChange = (text) => {
    setQuery(text);
    setIsOpen(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text || text.trim().length < 2) {
      setRemoteResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(text);
        setRemoteResults(results || []);
      } catch {
        setRemoteResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  // Local matching items
  const localMatches = useMemo(() => {
    if (!query || query.trim().length === 0) return BHUBANESWAR_PLACES.slice(0, 6);
    const q = query.toLowerCase().trim();
    return BHUBANESWAR_PLACES.filter(p =>
      p.name.toLowerCase().includes(q) || (p.sub && p.sub.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [query]);

  // All combined deduplicated suggestions
  const suggestions = useMemo(() => {
    const list = [...localMatches];
    remoteResults.forEach(r => {
      if (!list.some(item => Math.abs(item.lat - r.lat) < 0.001 && Math.abs(item.lng - r.lng) < 0.001)) {
        list.push({
          name: r.name,
          sub: r.shortName || 'Bhubaneswar location',
          lat: r.lat,
          lng: r.lng,
          tag: r.type || 'POI',
        });
      }
    });
    return list.slice(0, 8);
  }, [localMatches, remoteResults]);

  const handleSelectItem = (item) => {
    onSelect({
      name: item.name,
      lat: item.lat,
      lng: item.lng,
    });
    setQuery(item.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    setRemoteResults([]);
    setIsOpen(false);
  };

  return (
    <div className="tr-location-row" ref={wrapperRef}>
      <div className="tr-loc-header">
        <span>{label}</span>
        <button
          type="button"
          className={`tr-pick-btn ${isPicking ? 'active' : ''}`}
          onClick={onTogglePick}
        >
          <MapPin size={10} />
          {isPicking ? 'Clicking Map...' : 'Pick on Map'}
        </button>
      </div>

      <div className="tr-loc-input-wrap">
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
        <input
          type="text"
          className="tr-loc-input"
          value={query}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        {searching && <Loader2 size={12} className="spin" color="var(--hs-cyan)" />}
        {query && (
          <button type="button" className="tr-search-clear-btn" onClick={handleClear}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && suggestions.length > 0 && (
        <div className="tr-search-dropdown">
          {suggestions.map((item, idx) => (
            <button
              key={`${item.name}-${idx}`}
              type="button"
              className="tr-search-option"
              onClick={() => handleSelectItem(item)}
            >
              <div className="tr-search-option-meta">
                <span className="tr-search-option-name">📍 {item.name}</span>
                <span className="tr-search-option-sub">
                  {item.sub} • {fmt(item.lat, 3)}°N, {fmt(item.lng, 3)}°E
                </span>
              </div>
              {item.tag && <span className="cp-preset-tag">{item.tag}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Main RoutingPage Component
   -------------------------------------------------------------------------- */

export function RoutingPage({ availability = {}, overlayMeta = {}, currentPrediction = null }) {
  const [activeTab, setActiveTab] = useState('corridors');
  const [origin, setOrigin] = useState(PRESET_CORRIDORS[0].origin);
  const [destination, setDestination] = useState(PRESET_CORRIDORS[0].destination);
  const [selectedProfile, setSelectedProfile] = useState('standard');
  const [departureTime, setDepartureTime] = useState('noon');
  const [pickingMode, setPickingMode] = useState(null); // 'origin' | 'destination' | null

  const [weights, setWeights] = useState(USER_PROFILES[0].weights);
  const [selectedRoute, setSelectedRoute] = useState('coolest');
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [flyTo, setFlyTo] = useState({
    lng: (PRESET_CORRIDORS[0].origin.lng + PRESET_CORRIDORS[0].destination.lng) / 2,
    lat: (PRESET_CORRIDORS[0].origin.lat + PRESET_CORRIDORS[0].destination.lat) / 2,
    zoom: 14.2,
    pitch: 55,
  });

  const mapLayers = useMemo(() => ({
    CITY: { buildings: true, roads: true, water: true, green: true, trees: true, boundary: true },
    VEGETATION: { ndvi: false },
    HEAT: { predicted_lst: true },
    TERRAIN: { terrain_3d: false }
  }), []);

  // Calculate route
  const calculateRoute = useCallback(async (startPt, endPt, userWeights) => {
    if (!startPt || !endPt) return;
    setLoading(true);
    setError(null);

    try {
      const activeW = userWeights || weights;
      const data = await fetchHeatSafeRoute(startPt, endPt, {
        departureTime,
        weightDistance: activeW.distance,
        weightHeat: activeW.heat,
        weightAqi: activeW.aqi,
        weightShade: activeW.shade,
        weightVegetation: activeW.vegetation,
      });

      if (data.available) {
        setRouteResult(data);
        setSelectedRoute('coolest');
      } else {
        setError(data.message || 'Routing unavailable for these coordinates.');
      }
    } catch {
      setError('Unable to calculate heat-safe route. Grid service may be unreachable.');
    } finally {
      setLoading(false);
    }
  }, [weights, departureTime]);

  // Run initial route calculation on load
  useEffect(() => {
    calculateRoute(PRESET_CORRIDORS[0].origin, PRESET_CORRIDORS[0].destination, USER_PROFILES[0].weights);
  }, [calculateRoute]);

  // Handle map click for point picking
  const handleMapClick = useCallback((lngLat) => {
    if (!lngLat || typeof lngLat.lat !== 'number' || typeof lngLat.lng !== 'number') return;
    const pt = {
      name: `Point (${fmt(lngLat.lat, 4)}, ${fmt(lngLat.lng, 4)})`,
      lat: Number(lngLat.lat.toFixed(5)),
      lng: Number(lngLat.lng.toFixed(5)),
    };

    if (pickingMode === 'origin') {
      setOrigin(pt);
      setPickingMode(null);
      if (destination) calculateRoute(pt, destination);
    } else if (pickingMode === 'destination') {
      setDestination(pt);
      setPickingMode(null);
      if (origin) calculateRoute(origin, pt);
    } else {
      if (!origin) {
        setOrigin(pt);
      } else {
        setDestination(pt);
        calculateRoute(origin, pt);
      }
    }
  }, [pickingMode, origin, destination, calculateRoute]);

  // Handle Profile Selection
  const handleSelectProfile = (profileId) => {
    setSelectedProfile(profileId);
    const p = USER_PROFILES.find(u => u.id === profileId);
    if (p) {
      setWeights(p.weights);
      calculateRoute(origin, destination, p.weights);
    }
  };

  // Swap Origin and Destination
  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    if (destination && temp) {
      calculateRoute(destination, temp);
    }
  };

  // Route data passed to DigitalTwinMap3D
  const mapRouteData = useMemo(() => {
    if (!routeResult) return null;
    return {
      ...routeResult,
      selectedRoute,
    };
  }, [routeResult, selectedRoute]);

  // Savings computation
  const savings = useMemo(() => {
    if (!routeResult?.fastest || !routeResult?.coolest) return null;
    const fHeat = routeResult.fastest.thermal_exposure || 38.0;
    const cHeat = routeResult.coolest.thermal_exposure || 35.5;
    const fDist = routeResult.fastest.distance_km || (routeResult.fastest.distance_m / 1000) || 2.0;
    const cDist = routeResult.coolest.distance_km || (routeResult.coolest.distance_m / 1000) || 2.2;
    const fShade = (routeResult.fastest.shade || 0.15) * 100;
    const cShade = (routeResult.coolest.shade || 0.45) * 100;

    return {
      tempRelief: Number((fHeat - cHeat).toFixed(1)),
      shadeGain: Number((cShade - fShade).toFixed(0)),
      extraDistM: Number(Math.max(0, (cDist - fDist) * 1000).toFixed(0)),
      extraTimeMin: Number(Math.max(0, (routeResult.coolest.time_min || 0) - (routeResult.fastest.time_min || 0)).toFixed(1)),
    };
  }, [routeResult]);

  return (
    <div className="tr-page">
      {/* Header */}
      <header className="tr-header">
        <div className="tr-header-left">
          <Navigation size={20} color="var(--hs-cyan)" />
          <div>
            <h1 className="tr-title">Thermal-Aware Heat-Safe Routing</h1>
            <p className="tr-subtitle">Microclimate-optimized navigation minimizing extreme urban heat exposure and air pollution</p>
          </div>
        </div>
        <div className="tr-header-right">
          <button
            className="cp-btn cp-btn-primary"
            onClick={() => calculateRoute(origin, destination)}
            disabled={loading || !origin || !destination}
          >
            {loading ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
            <span>{loading ? 'Routing...' : 'Calculate Routes'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="tr-workspace">
        {/* Left Side Control Panel */}
        <aside className="tr-side-panel">
          <div className="tr-panel-head">
            <span className="tr-panel-title">
              <Compass size={14} color="var(--hs-cyan)" />
              Route Configuration
            </span>
          </div>

          <div className="tr-panel-tabs">
            <button
              className={`tr-tab-btn ${activeTab === 'corridors' ? 'active' : ''}`}
              onClick={() => setActiveTab('corridors')}
            >
              <Sparkles size={12} />
              <span>Corridors</span>
            </button>
            <button
              className={`tr-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
              onClick={() => setActiveTab('custom')}
            >
              <MapPin size={12} />
              <span>Profile</span>
            </button>
            <button
              className={`tr-tab-btn ${activeTab === 'weights' ? 'active' : ''}`}
              onClick={() => setActiveTab('weights')}
            >
              <Settings2 size={12} />
              <span>Weights</span>
            </button>
          </div>

          <div className="tr-panel-content">
            {/* Interactive Search & Place Selection */}
            <div className="tr-locations-box">
              <PlaceSearchBox
                label="ORIGIN (A) — SEARCH PLACE BY NAME"
                value={origin}
                onSelect={(val) => {
                  setOrigin(val);
                  if (val && destination) calculateRoute(val, destination);
                }}
                isPicking={pickingMode === 'origin'}
                onTogglePick={() => setPickingMode(pickingMode === 'origin' ? null : 'origin')}
                accentColor="#0284c7"
                placeholder="Search origin place name (e.g. Patia, Master Canteen)..."
              />

              <button className="tr-swap-btn" onClick={handleSwap} title="Swap Origin and Destination">
                <ArrowUpDown size={14} />
              </button>

              <PlaceSearchBox
                label="DESTINATION (B) — SEARCH PLACE BY NAME"
                value={destination}
                onSelect={(val) => {
                  setDestination(val);
                  if (origin && val) calculateRoute(origin, val);
                }}
                isPicking={pickingMode === 'destination'}
                onTogglePick={() => setPickingMode(pickingMode === 'destination' ? null : 'destination')}
                accentColor="#ef4444"
                placeholder="Search destination place name (e.g. KIIT, AIIMS, Secretariat)..."
              />
            </div>

            {/* TAB 1: PRESET POPULAR CORRIDORS */}
            {activeTab === 'corridors' && (
              <div className="cp-field">
                <span className="cp-field-label">POPULAR COMMUTER CORRIDORS</span>
                <div className="tr-preset-grid">
                  {PRESET_CORRIDORS.map(corridor => {
                    const isSelected = origin?.name === corridor.origin.name && destination?.name === corridor.destination.name;
                    return (
                      <button
                        key={corridor.name}
                        className={`tr-preset-item ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setOrigin(corridor.origin);
                          setDestination(corridor.destination);
                          setFlyTo({
                            lng: (corridor.origin.lng + corridor.destination.lng) / 2,
                            lat: (corridor.origin.lat + corridor.destination.lat) / 2,
                            zoom: 14.2,
                            pitch: 55
                          });
                          calculateRoute(corridor.origin, corridor.destination);
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="tr-preset-title">{corridor.name}</span>
                          <span className="cp-preset-tag">{corridor.tag}</span>
                        </div>
                        <span className="tr-preset-desc">
                          {corridor.origin.name} → {corridor.destination.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: VULNERABILITY MODES */}
            {activeTab === 'custom' && (
              <div className="cp-field">
                <span className="cp-field-label">PEDESTRIAN VULNERABILITY PROFILE</span>
                <div className="tr-profile-selector">
                  {USER_PROFILES.map(profile => {
                    const isSelected = selectedProfile === profile.id;
                    const Icon = profile.icon;
                    return (
                      <button
                        key={profile.id}
                        className={`tr-profile-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => handleSelectProfile(profile.id)}
                      >
                        <span className="tr-profile-title">
                          <Icon size={14} color={isSelected ? 'var(--hs-cyan)' : 'var(--hs-text-secondary)'} />
                          {profile.label}
                        </span>
                        <span className="tr-profile-desc">{profile.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: ADVANCED WEIGHT TUNING */}
            {activeTab === 'weights' && (
              <div className="cp-field">
                <span className="cp-field-label">ROUTING COST WEIGHTS</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="cp-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--hs-text-secondary)' }}>Distance Factor</span>
                      <span className="cp-field-val">{weights.distance.toFixed(1)}</span>
                    </div>
                    <input
                      type="range" min="0.2" max="3.0" step="0.1" value={weights.distance}
                      onChange={e => setWeights(p => ({ ...p, distance: parseFloat(e.target.value) }))}
                      className="cp-range-slider"
                    />
                  </div>
                  <div className="cp-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--hs-text-secondary)' }}>Heat Avoidance</span>
                      <span className="cp-field-val">{weights.heat.toFixed(1)}</span>
                    </div>
                    <input
                      type="range" min="0" max="5.0" step="0.1" value={weights.heat}
                      onChange={e => setWeights(p => ({ ...p, heat: parseFloat(e.target.value) }))}
                      className="cp-range-slider"
                    />
                  </div>
                  <div className="cp-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--hs-text-secondary)' }}>Shade & Canopy Preference</span>
                      <span className="cp-field-val">{weights.shade.toFixed(1)}</span>
                    </div>
                    <input
                      type="range" min="0" max="5.0" step="0.1" value={weights.shade}
                      onChange={e => setWeights(p => ({ ...p, shade: parseFloat(e.target.value) }))}
                      className="cp-range-slider"
                    />
                  </div>
                  <div className="cp-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--hs-text-secondary)' }}>Air Quality (AQI) Weight</span>
                      <span className="cp-field-val">{weights.aqi.toFixed(1)}</span>
                    </div>
                    <input
                      type="range" min="0" max="5.0" step="0.1" value={weights.aqi}
                      onChange={e => setWeights(p => ({ ...p, aqi: parseFloat(e.target.value) }))}
                      className="cp-range-slider"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Departure Time Selection */}
            <div className="cp-field">
              <span className="cp-field-label">TIME OF DEPARTURE</span>
              <div className="tr-time-chips">
                {DEPARTURE_TIMES.map(dt => (
                  <button
                    key={dt.id}
                    className={`tr-time-chip ${departureTime === dt.id ? 'active' : ''}`}
                    onClick={() => {
                      setDepartureTime(dt.id);
                      calculateRoute(origin, destination);
                    }}
                  >
                    <dt.icon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {dt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Thermal Savings Banner */}
            {savings && savings.tempRelief > 0 && (
              <div className="cp-impact-box" style={{ background: 'rgba(22, 163, 74, 0.08)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TreePine size={16} color="#22c55e" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#22c55e' }}>
                    Cooler Route Benefits
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>
                    −{savings.tempRelief}°C
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--hs-text-secondary)' }}>
                    +{savings.shadeGain}% tree canopy shade
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--hs-text-tertiary)' }}>
                  Only +{savings.extraDistM}m extra distance (~{savings.extraTimeMin} min walk) for continuous thermal shelter.
                </span>
              </div>
            )}

            {/* Route Cards Comparison */}
            {routeResult && (
              <div className="cp-field">
                <span className="cp-field-label">ROUTE ALTERNATIVES</span>
                <div className="tr-route-cards">
                  {['coolest', 'fastest', 'balanced'].map(type => {
                    const r = routeResult[type];
                    if (!r) return null;
                    const conf = ROUTE_CONFIG[type];
                    const isSelected = selectedRoute === type;
                    const distKm = r.distance_km ?? (r.distance_m / 1000) ?? 0;

                    return (
                      <div
                        key={type}
                        className={`tr-card ${isSelected ? 'selected' : ''}`}
                        style={{ '--card-accent': conf.color }}
                        onClick={() => setSelectedRoute(type)}
                      >
                        <div className="tr-card-header">
                          <span className="tr-card-badge">
                            <conf.icon size={14} color={conf.color} />
                            {conf.label}
                          </span>
                          {isSelected && <span className="tr-card-active-tag">ACTIVE</span>}
                        </div>

                        <div className="tr-card-primary-stat">
                          <span className="tr-card-distance">{distKm.toFixed(2)} km</span>
                          <span className="tr-card-duration">~{fmt(r.time_min, 0)} min walk</span>
                        </div>

                        <div className="tr-card-metrics-grid">
                          <div className="tr-metric-chip">
                            <span><Thermometer size={10} color="var(--hs-heat)" /> Heat</span>
                            <span style={{ color: 'var(--hs-heat)' }}>{fmt(r.thermal_exposure)}°C</span>
                          </div>
                          <div className="tr-metric-chip">
                            <span><TreePine size={10} color="var(--hs-vegetation)" /> Shade</span>
                            <span style={{ color: 'var(--hs-vegetation)' }}>{fmt((r.shade || 0) * 100, 0)}%</span>
                          </div>
                          <div className="tr-metric-chip">
                            <span><Wind size={10} color="var(--hs-cyan)" /> AQI</span>
                            <span>{fmt(r.aqi, 0)}</span>
                          </div>
                          <div className="tr-metric-chip">
                            <span><Leaf size={10} color="var(--hs-vegetation)" /> NDVI</span>
                            <span>{fmt(r.vegetation, 2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center 3D Digital Twin Map */}
        <main className="cp-map-viewport">
          {pickingMode && (
            <div className="tr-pick-banner">
              <MapPin size={14} />
              <span>Click anywhere on the 3D map to set {pickingMode.toUpperCase()} location</span>
              <button
                style={{ background: 'transparent', border: 'none', color: 'var(--hs-text-primary)', cursor: 'pointer', marginLeft: '6px' }}
                onClick={() => setPickingMode(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="cp-map-inner">
            <DigitalTwinMap3D
              layers={mapLayers}
              availability={availability}
              overlayMeta={overlayMeta}
              currentPrediction={currentPrediction}
              routeData={mapRouteData}
              onMapClick={handleMapClick}
              flyTo={flyTo}
              theme="dark"
              showInfoPanel={false}
              showCameraControls={true}
              showCoords={true}
              showSourceCard={false}
              showScenarioLegend={false}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default RoutingPage;
