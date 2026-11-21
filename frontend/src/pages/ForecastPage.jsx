import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Cloud, Sun, CloudSun, CloudRain, CloudLightning,
  CloudDrizzle, CloudFog, Thermometer, Wind, Droplets, Compass,
  Sparkles, AlertTriangle, ShieldCheck, Clock, TrendingUp,
  Sunrise, Sunset, Eye, Gauge, RefreshCw, ChevronRight, CheckCircle2
} from 'lucide-react';
import {
  DEFAULT_LOCATION,
  BHUBANESWAR_PRESETS,
  fetchFullWeatherForecast,
  searchLocations
} from '../services/weatherService';

/**
 * Dynamic Icon Component
 */
function WeatherIcon({ name, size = 24, color, className = '' }) {
  switch (name) {
    case 'Sun': return <Sun size={size} color={color || '#f59e0b'} className={className} />;
    case 'CloudSun': return <CloudSun size={size} color={color || '#fb923c'} className={className} />;
    case 'Cloud': return <Cloud size={size} color={color || '#94a3b8'} className={className} />;
    case 'CloudRain': return <CloudRain size={size} color={color || '#38bdf8'} className={className} />;
    case 'CloudLightning': return <CloudLightning size={size} color={color || '#a855f7'} className={className} />;
    case 'CloudDrizzle': return <CloudDrizzle size={size} color={color || '#0ea5e9'} className={className} />;
    case 'CloudFog': return <CloudFog size={size} color={color || '#cbd5e1'} className={className} />;
    default: return <CloudSun size={size} color={color || '#fb923c'} className={className} />;
  }
}

export function ForecastPage() {
  const [selectedLoc, setSelectedLoc] = useState(DEFAULT_LOCATION);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [activeTab, setActiveTab] = useState('forecast'); // 'forecast' | 'history' | 'ai'
  const searchContainerRef = useRef(null);

  // Load weather data
  const loadForecast = useCallback(async (loc, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchFullWeatherForecast(loc.lat, loc.lng);
      if (data?.success) {
        setWeatherData(data);
      }
    } catch (err) {
      console.error('Failed to load weather forecast:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadForecast(selectedLoc);
  }, [selectedLoc, loadForecast]);

  // Debounced search handler
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLocation = (loc) => {
    setSelectedLoc({
      name: loc.name,
      region: loc.admin1 || 'Odisha',
      country: loc.country || 'India',
      lat: loc.latitude,
      lng: loc.longitude
    });
    setSearchQuery('');
    setSearchOpen(false);
  };

  const current = weatherData?.current;
  const ai = weatherData?.ai;
  const hourly = weatherData?.hourly || [];
  const daily = weatherData?.daily || [];
  const history = weatherData?.history || [];

  return (
    <div className="hs-page-content" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* ================= HEADER & SEARCH PANEL ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Clock size={18} color="#38bdf8" />
              </div>
              <h1 className="hs-display" style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Heat Forecast &amp; Weather Intelligence
              </h1>
            </div>
            <p className="hs-body" style={{ fontSize: '13px', color: 'var(--hs-text-muted)', margin: '4px 0 0 42px' }}>
              High-resolution ECMWF atmospheric models synthesized with HEAT AI thermal predictive regression.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => loadForecast(selectedLoc, true)}
              disabled={refreshing}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--hs-border-subtle)',
                color: 'var(--hs-text-primary)', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={13} className={refreshing ? 'hs-spin' : ''} />
              <span>{refreshing ? 'Syncing…' : 'Sync Live'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Location Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div ref={searchContainerRef} style={{ position: 'relative', width: '100%', maxWidth: '640px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
            }}>
              <Search size={16} color="var(--hs-cyan)" />
              <input
                type="text"
                placeholder="Search Bhubaneswar ward (Patia, Saheed Nagar, Khandagiri) or any world city…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--hs-text-primary)', fontSize: '13px', fontFamily: 'inherit'
                }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                {selectedLoc.name} ({selectedLoc.lat.toFixed(2)}°N, {selectedLoc.lng.toFixed(2)}°E)
              </span>
            </div>

            {/* Dropdown Results */}
            <AnimatePresence>
              {searchOpen && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    marginTop: '6px', borderRadius: '10px', background: '#0f172a',
                    border: '1px solid rgba(56, 189, 248, 0.3)', boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                    overflow: 'hidden'
                  }}
                >
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectLocation(item)}
                      style={{
                        padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={14} color={item.isLocal ? '#38bdf8' : '#94a3b8'} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{item.name}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.admin1}</span>
                      </div>
                      {item.isLocal && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                          LOCAL WARD
                        </span>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick preset chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--hs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bhubaneswar Wards:
            </span>
            {BHUBANESWAR_PRESETS.map((p) => {
              const isSelected = selectedLoc.name === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => setSelectedLoc({ name: p.name, region: p.zone, country: 'India', lat: p.lat, lng: p.lng })}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                    background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid var(--hs-border-subtle)',
                    color: isSelected ? '#38bdf8' : 'var(--hs-text-secondary)',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={28} className="hs-spin" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Analyzing atmospheric telemetry &amp; neural forecast…</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* ================= HERO WEATHER & HEAT AI STATUS ================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* Card 1: Current Live Weather */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '14px', padding: '22px',
              position: 'relative', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: '#38bdf8', textTransform: 'uppercase' }}>
                    LIVE ATMOSPHERIC CONDITIONS
                  </span>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 0', color: '#f8fafc' }}>
                    {selectedLoc.name}
                  </h2>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {selectedLoc.region ? `${selectedLoc.region}, ` : ''}{selectedLoc.country}
                  </span>
                </div>
                <div style={{
                  padding: '8px 12px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <WeatherIcon name={current?.condition?.icon} size={28} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    {current?.condition?.label}
                  </span>
                </div>
              </div>

              {/* Main Temp Hero */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', margin: '20px 0 16px' }}>
                <span style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-0.03em', color: '#f8fafc' }}>
                  {current?.temp ?? '—'}°C
                </span>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Feels like <strong style={{ color: '#fb923c' }}>{current?.feelsLike}°C</strong>
                </div>
              </div>

              {/* 4 Quick metric chips */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Droplets size={15} color="#38bdf8" />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Humidity:</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>{current?.humidity}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wind size={15} color="#38bdf8" />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Wind:</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>{current?.windSpeed} km/h</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sun size={15} color="#f59e0b" />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>UV Index:</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>{current?.uvIndex}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gauge size={15} color="#a855f7" />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Pressure:</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>{current?.pressure} hPa</span>
                </div>
              </div>
            </div>

            {/* Card 2: HEAT AI Predictive Analysis */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
              border: `1px solid ${ai?.riskColor || 'rgba(56, 189, 248, 0.3)'}`, borderRadius: '14px', padding: '22px',
              position: 'relative', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#fb923c" />
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#fb923c', textTransform: 'uppercase' }}>
                    HEAT AI PREDICTIVE INTELLIGENCE
                  </span>
                </div>
                <span style={{
                  padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800,
                  background: `${ai?.riskColor}22`, border: `1px solid ${ai?.riskColor}`, color: ai?.riskColor
                }}>
                  {ai?.riskBadge}
                </span>
              </div>

              {/* Peak Surface Heat & Anomaly */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Predicted Peak LST</span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: ai?.riskColor, marginTop: '2px' }}>
                    {ai?.predictedPeakLST}°C
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>Urban surface peak</span>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Seasonal Anomaly</span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                    {ai?.thermalAnomaly >= 0 ? `+${ai?.thermalAnomaly}` : ai?.thermalAnomaly}°C
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>vs 10-Yr Baseline</span>
                </div>
              </div>

              {/* AI Insights bullet */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ai?.insights?.slice(0, 2).map((ins, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                    <CheckCircle2 size={14} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: '#f8fafc' }}>{ins.title}: </strong>
                      <span>{ins.detail}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  Model Confidence: {ai?.modelConfidence}
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  Refreshed: {ai?.generatedAt}
                </span>
              </div>
            </div>
          </div>

          {/* ================= 24-HOUR HOURLY FORECAST ================= */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--hs-border-subtle)',
            borderRadius: '14px', padding: '20px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#38bdf8" />
                <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f8fafc' }}>
                  24-Hour Hourly Thermal Trajectory
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Real-time ECMWF / GFS Simulation
              </span>
            </div>

            {/* Horizontal scroll strip */}
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'thin' }}>
              {hourly.map((h, i) => {
                const isPeak = h.temp >= (ai?.predictedPeakLST ? ai.predictedPeakLST - 3 : 36);
                return (
                  <div
                    key={i}
                    style={{
                      minWidth: '78px', padding: '12px 8px', borderRadius: '10px',
                      background: i === 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                      border: i === 0 ? '1px solid #38bdf8' : isPeak ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                      flexShrink: 0
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: i === 0 ? 800 : 600, color: i === 0 ? '#38bdf8' : '#94a3b8' }}>
                      {h.label}
                    </span>
                    <WeatherIcon name={h.condition?.icon} size={20} />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: isPeak ? '#f97316' : '#f8fafc' }}>
                      {h.temp}°
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#38bdf8' }}>
                      <Droplets size={10} />
                      <span>{h.pop}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= 8-DAY EXTENDED FORECAST & HISTORICAL AI MATRIX ================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            
            {/* 8-Day Future Forecast */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--hs-border-subtle)',
              borderRadius: '14px', padding: '20px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <TrendingUp size={16} color="#38bdf8" />
                <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f8fafc' }}>
                  8-Day Meteorological Outlook
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {daily.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: '8px',
                      background: d.isToday ? 'rgba(56, 189, 248, 0.1)' : 'rgba(15, 23, 42, 0.4)',
                      border: d.isToday ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255, 255, 255, 0.04)'
                    }}
                  >
                    <div style={{ width: '60px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: d.isToday ? '#38bdf8' : '#f8fafc' }}>
                        {d.dayName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '130px' }}>
                      <WeatherIcon name={d.condition?.icon} size={18} />
                      <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {d.condition?.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '50px', fontSize: '11px', color: '#38bdf8' }}>
                      {d.precipitationProb > 0 ? (
                        <>
                          <Droplets size={11} />
                          <span>{d.precipitationProb}%</span>
                        </>
                      ) : (
                        <span style={{ color: '#64748b' }}>0%</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{d.minTemp}°</span>
                      <div style={{ width: '45px', height: '4px', borderRadius: '2px', background: 'linear-gradient(90deg, #38bdf8, #f97316)' }} />
                      <span style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 800 }}>{d.maxTemp}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Past 7-Day History & AI Urban Advisory */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--hs-border-subtle)',
              borderRadius: '14px', padding: '20px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <ShieldCheck size={16} color="#fb923c" />
                  <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f8fafc' }}>
                    HEAT AI Action &amp; Mitigation Plan
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                  {ai?.recommendations?.map((rec, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        padding: '10px 12px', borderRadius: '8px',
                        background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '12px', color: '#e2e8f0', lineHeight: 1.45
                      }}
                    >
                      <span style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: 'rgba(249, 115, 22, 0.2)', border: '1px solid #f97316',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 800, color: '#f97316', flexShrink: 0
                      }}>
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>

                {/* Past 7-day temperature trajectory stats */}
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Historical 7-Day Trajectory Baseline
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#94a3b8' }}>
                    <span>Avg Past Max Temp: <strong style={{ color: '#f8fafc' }}>{ai?.avgPastMax}°C</strong></span>
                    <span>Rate of Warming: <strong style={{ color: '#fb923c' }}>{ai?.trendRate > 0 ? `+${ai?.trendRate}` : ai?.trendRate}°C/day</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                Open-Meteo API v1 &middot; XGBoost Digital Twin Inference Engine
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default ForecastPage;
