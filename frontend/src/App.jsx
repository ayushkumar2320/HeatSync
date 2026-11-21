import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense, Component } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LiveDataProvider, useLiveData } from './context/LiveDataContext';
import { NavigationRail, MobileNavigation } from './layout/Navigation';
import { fetchMonitoringStatus, fetchEnvironmentSummary, buildAvailability } from './services/thematicData';
import { fetchModelInfo, fetchAIStatus, fetchCurrentHeat } from './services/backendClient';
import { fetchSystemHealth, buildSystemStatus } from './services/systemHealth';
import { fetchAlertSummary } from './services/alertService';
import { TopSystemStatus } from './components/TopSystemStatus';
import './styles/top-system-status.css';

// Lazy-load heavy page components
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const HeatMapPage = lazy(() => import('./pages/HeatMapPage'));
const AlertCentrePage = lazy(() => import('./pages/AlertCentrePage'));
const SatellitePage = lazy(() => import('./pages/SatellitePage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const TwinPage = lazy(() => import('./pages/TwinPage'));
const SandboxPage = lazy(() => import('./pages/SandboxPage'));
const RoutingPage = lazy(() => import('./pages/RoutingPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AICopilotPage = lazy(() => import('./pages/AICopilotPage'));
const ForecastPage = lazy(() => import('./pages/ForecastPage'));
const CityPlanningPage = lazy(() => import('./pages/CityPlanningPage'));

/* --------------------------------------------------------------------------
   Page transition wrapper — Framer Motion
   -------------------------------------------------------------------------- */
const PageTransition = ({ children, pageKey }) => (
  <motion.div
    key={pageKey}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    style={{ width: '100%', height: '100%' }}
  >
    {children}
  </motion.div>
);

/* --------------------------------------------------------------------------
   Loading fallback
   -------------------------------------------------------------------------- */
const PageLoader = () => (
  <div className="hs-page-loader">
    <div className="hs-page-loader-spinner" />
    <span className="hs-label">Loading...</span>
  </div>
);

/* --------------------------------------------------------------------------
   Error boundary — prevents one crashed page from taking down the whole app
   -------------------------------------------------------------------------- */
class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, _info) {
    console.error('Page error boundary caught:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="hs-page-content" style={{ padding: 'var(--hs-space-8)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--hs-critical)', fontFamily: 'var(--hs-font-display)' }}>
            Page Error
          </h2>
          <p style={{ color: 'var(--hs-text-muted)', fontFamily: 'var(--hs-font-body)', fontSize: 'var(--hs-text-sm)', marginTop: 'var(--hs-space-4)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="hs-btn-secondary"
            style={{ marginTop: 'var(--hs-space-4)' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* --------------------------------------------------------------------------
   AnimatedRoutes — wraps Routes with AnimatePresence for page transitions
   -------------------------------------------------------------------------- */
function AnimatedRoutes({ sharedProps }) {
  const location = useLocation();
  const pageKey = location.pathname;

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />} key={pageKey}>
        <PageTransition pageKey={pageKey}>
          <PageErrorBoundary key={pageKey}>
            <Routes location={location}>
              <Route path="/" element={<OverviewPage {...sharedProps} />} />
              <Route path="/heatmap" element={<HeatMapPage {...sharedProps} />} />
              <Route path="/alerts" element={<AlertCentrePage {...sharedProps} />} />
              <Route path="/satellite" element={<SatellitePage {...sharedProps} />} />
              <Route path="/drivers" element={<DriversPage {...sharedProps} />} />
              <Route path="/twin" element={<TwinPage {...sharedProps} />} />
              <Route path="/sandbox" element={<SandboxPage {...sharedProps} />} />
              <Route path="/routing" element={<RoutingPage {...sharedProps} />} />
              <Route path="/reports" element={<ReportsPage {...sharedProps} />} />
              <Route path="/forecast" element={<ForecastPage {...sharedProps} />} />
              <Route path="/planning" element={<CityPlanningPage {...sharedProps} />} />
              <Route path="/ai" element={<AICopilotPage {...sharedProps} />} />
              <Route path="*" element={<OverviewPage {...sharedProps} />} />
            </Routes>
          </PageErrorBoundary>
        </PageTransition>
      </Suspense>
    </AnimatePresence>
  );
}

/* --------------------------------------------------------------------------
   AppInner — the main app shell (requires LiveDataProvider context)
   -------------------------------------------------------------------------- */
function AppInner() {
  const navigate = useNavigate();
  const { weather: liveWeather, airQuality, prediction, snapshotId, freshness, connectionState } = useLiveData();
  const [theme, setTheme] = useState('dark');
  const [isMobile, setIsMobile] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  // Lite Mode State (persisted in localStorage to protect 8GB RAM machines)
  const [liteMode, setLiteMode] = useState(() => {
    return localStorage.getItem('heatsync_lite_mode') === 'true';
  });

  const toggleLiteMode = useCallback(() => {
    setLiteMode(prev => {
      const next = !prev;
      localStorage.setItem('heatsync_lite_mode', String(next));
      return next;
    });
  }, []);

  // Shared data state
  const [monitoring, setMonitoring] = useState(null);
  const [environmentSummary, setEnvironmentSummary] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [alertSummary, setAlertSummary] = useState(null);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [availability, setAvailability] = useState({ osm: true });
  const [overlayMeta, setOverlayMeta] = useState({});

  // System status
  const systemStatus = useMemo(
    () => buildSystemStatus(health),
    [health]
  );

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Boot: load all shared data
  useEffect(() => {
    fetchSystemHealth().then(setHealth).catch(() => setHealth(null)).finally(() => setHealthLoading(false));
    fetchMonitoringStatus().then(status => { setMonitoring(status); setAvailability(buildAvailability(status)); });
    fetchEnvironmentSummary().then(setEnvironmentSummary);
    fetchModelInfo().then(setModelInfo).catch(() => setModelInfo({ available: false }));
    fetchAIStatus().then(setAiStatus).catch(() => setAiStatus({ available: false }));
    fetchAlertSummary().then(setAlertSummary).catch(() => {});
    fetchCurrentHeat().then(d => { if (d?.success) setCurrentPrediction(d); }).catch(() => {});
    fetch('/overlays/overlays.json')
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((data) => {
        const map = {};
        Object.values(data.overlays || {}).forEach((o) => { map[o.key] = o; });
        setOverlayMeta(map);
      })
      .catch((err) => console.warn('App: Failed to load overlays.json', err));
  }, []);

  // Periodic refresh
  useEffect(() => {
    const timer = setInterval(() => {
      fetchSystemHealth().then(setHealth).catch(() => {});
      fetchAlertSummary().then(setAlertSummary).catch(() => {});
      fetchCurrentHeat().then(d => { if (d?.success) setCurrentPrediction(d); }).catch(() => {});
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  // Shared props for all pages
  const sharedProps = {
    liveWeather,
    airQuality,
    prediction,
    snapshotId,
    freshness,
    connectionState,
    modelInfo,
    aiStatus,
    monitoring,
    environmentSummary,
    currentPrediction,
    alertSummary,
    liteMode,
    toggleLiteMode,
    health,
    healthLoading,
    availability,
    overlayMeta,
    systemStatus,
    theme,
    toggleTheme,
  };

  return (
    <div className="hs-app-shell">
      {/* Desktop rail / Mobile bottom bar */}
      {isMobile ? (
        <MobileNavigation />
      ) : (
        <NavigationRail
          collapsed={navCollapsed}
          onToggleCollapse={() => setNavCollapsed(c => !c)}
          theme={theme}
        />
      )}

      <main className="hs-main-content">
        {/* Top bar */}
        <header className="hs-top-bar">
          <div className="hs-top-bar-left">
            <img
              src={theme === 'dark' ? '/logo-dark.jpeg' : '/logo-light.jpeg'}
              alt="Logo"
              className="hs-top-bar-logo"
            />
          </div>
          <div className="hs-top-bar-right">
            {/* Live Heat Alert Pill */}
            {alertSummary && (
              <button
                className="hs-top-alert-pill"
                onClick={() => navigate('/alerts')}
                style={{
                  backgroundColor: alertSummary.tier_bg_color || 'rgba(230, 126, 34, 0.15)',
                  borderColor: alertSummary.tier_color || '#E67E22',
                  color: alertSummary.tier_color || '#E67E22',
                }}
                title="Civil Protection Early Warning: Click to view Alert Centre"
              >
                <span className="hs-alert-pulse-dot" style={{ backgroundColor: alertSummary.tier_color || '#E67E22' }} />
                <span className="hs-alert-text">
                  {alertSummary.compound_hazard ? '⚠ COMPOUND HAZARD' : `${alertSummary.tier} ALERT`}
                </span>
                <span className="hs-alert-wbgt">WBGT {alertSummary.wbgt_c}°C</span>
              </button>
            )}

            {/* Lite Mode Toggle for Low RAM Safety */}
            <button
              className={`hs-lite-toggle ${liteMode ? 'active' : ''}`}
              onClick={toggleLiteMode}
              title={liteMode ? 'Lite Mode Active (Fast 2D Leaflet, Low RAM)' : '3D High-Fidelity Mode (Heavy WebGL)'}
            >
              <span className="hs-lite-icon">⚡</span>
              <span className="hs-lite-text">{liteMode ? 'Lite Mode' : '3D Mode'}</span>
            </button>

            <TopSystemStatus
              health={health}
              liveWeather={liveWeather}
              airQuality={airQuality}
              connectionState={connectionState}
            />
            <button className="hs-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle dark / light theme">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </header>

        {/* Routed page content */}
        <div className="hs-page-container">
          <AnimatedRoutes sharedProps={sharedProps} />
        </div>
      </main>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Root export — wraps everything in BrowserRouter + LiveDataProvider
   -------------------------------------------------------------------------- */
export function App() {
  return (
    <BrowserRouter>
      <LiveDataProvider>
        <AppInner />
      </LiveDataProvider>
    </BrowserRouter>
  );
}

export default App;
