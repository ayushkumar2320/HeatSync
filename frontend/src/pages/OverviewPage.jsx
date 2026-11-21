import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Sprout, BrainCircuit, Activity, ArrowRight, ShieldAlert,
  Layers, Bot, CheckCircle2, Sparkles, Sliders, Play, ThermometerSun
} from 'lucide-react';
// Global and Indian cities revolving on 3D globe [Lat, Lng, Name, Temp]
const REVOLVING_CITIES = [
  { lat: 20.2961, lng: 85.8245, name: 'Bhubaneswar Core', temp: '38.4°C', color: '#38bdf8', isPrimary: true },
  { lat: 20.4625, lng: 85.8828, name: 'Cuttack', temp: '37.9°C', color: '#f87171' },
  { lat: 28.6139, lng: 77.2090, name: 'New Delhi', temp: '42.1°C', color: '#ef4444' },
  { lat: 19.0760, lng: 72.8777, name: 'Mumbai Coast', temp: '35.8°C', color: '#f97316' },
  { lat: 22.5726, lng: 88.3639, name: 'Kolkata', temp: '37.6°C', color: '#f87171' },
  { lat: 12.9716, lng: 77.5946, name: 'Bengaluru', temp: '33.5°C', color: '#22c55e' },
  { lat: 17.3850, lng: 78.4867, name: 'Hyderabad', temp: '39.2°C', color: '#f97316' },
  { lat: 13.0827, lng: 80.2707, name: 'Chennai', temp: '38.9°C', color: '#f87171' },
  { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad', temp: '43.2°C', color: '#dc2626' },
  { lat: 26.9124, lng: 75.7873, name: 'Jaipur', temp: '41.5°C', color: '#ef4444' },
  { lat: 26.8467, lng: 80.9462, name: 'Lucknow', temp: '40.8°C', color: '#f97316' },
  { lat: 18.5204, lng: 73.8567, name: 'Pune', temp: '36.4°C', color: '#fb923c' },
  { lat: 25.5941, lng: 85.1376, name: 'Patna', temp: '41.0°C', color: '#ef4444' },
  { lat: 30.7333, lng: 76.7794, name: 'Chandigarh', temp: '39.8°C', color: '#f87171' },
  { lat: 22.2604, lng: 84.8536, name: 'Rourkela', temp: '41.2°C', color: '#ef4444' },
  { lat: 25.2048, lng: 55.2708, name: 'Dubai', temp: '44.5°C', color: '#dc2626' },
  { lat: 35.6762, lng: 139.6503, name: 'Tokyo', temp: '34.2°C', color: '#facc15' },
  { lat: 51.5074, lng: -0.1278, name: 'London', temp: '31.5°C', color: '#22c55e' },
  { lat: 40.7128, lng: -74.0060, name: 'New York', temp: '33.8°C', color: '#38bdf8' },
  { lat: 1.3521, lng: 103.8198, name: 'Singapore', temp: '33.2°C', color: '#22c55e' },
  { lat: -33.8688, lng: 151.2093, name: 'Sydney', temp: '29.8°C', color: '#38bdf8' }
];

export const OverviewPage = ({
  theme = 'light',
  onNavigate,
  onExploreMap,
  onExploreSimulator,
  onExploreEnvironment,
  onOpenSystemStatus
}) => {
  const globeCanvasRef = useRef(null);
  const particleCanvasRef = useRef(null);

  const [isRotating] = useState(true);

  const logoSrc = theme === 'dark' ? '/logo-dark.jpeg' : '/logo-light.jpeg';

  // Navigation helpers — support both onNavigate (NavRail) and direct callbacks
  const navigateTo = (page) => {
    if (onNavigate) onNavigate(page);
    else if (page === 'twin' && onExploreMap) onExploreMap();
    else if (page === 'scenarios' && onExploreSimulator) onExploreSimulator();
    else if (page === 'drivers' && onExploreEnvironment) onExploreEnvironment();
  };

  // --- 1. Canvas 3D Revolving Earth Globe Effect ---
  useEffect(() => {
    const canvas = globeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let rotationX = 0.3;
    let rotationY = 0;

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      rotationY += deltaX * 0.005;
      rotationX += deltaY * 0.005;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => { isDragging = false; };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const renderGlobe = () => {
      const width = canvas.width;
      const height = canvas.height;
      const radius = Math.min(width, height) * 0.38;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Auto rotation
      if (isRotating && !isDragging) {
        rotationY += 0.006;
      }

      // Atmospheric Corona Glow
      const glowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.85, centerX, centerY, radius * 1.3);
      glowGradient.addColorStop(0, theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.12)');
      glowGradient.addColorStop(0.5, theme === 'dark' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(239, 68, 68, 0.08)');
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Globe Base Shading
      const globeGradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        radius * 0.1,
        centerX,
        centerY,
        radius
      );
      if (theme === 'dark') {
        globeGradient.addColorStop(0, '#1e293b');
        globeGradient.addColorStop(0.7, '#0f172a');
        globeGradient.addColorStop(1, '#020617');
      } else {
        globeGradient.addColorStop(0, '#ffffff');
        globeGradient.addColorStop(0.7, '#f1f5f9');
        globeGradient.addColorStop(1, '#cbd5e1');
      }

      ctx.fillStyle = globeGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme === 'dark' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Lat/Lng Wireframe Grid Rings
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)';

      // Latitudes
      for (let lat = -60; lat <= 60; lat += 30) {
        const phi = (lat * Math.PI) / 180;
        const r = radius * Math.cos(phi);
        const y = centerY + radius * Math.sin(phi) * Math.cos(rotationX);
        if (Math.abs(y - centerY) < radius) {
          ctx.beginPath();
          ctx.ellipse(centerX, y, r, r * Math.sin(rotationX), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Longitudes
      for (let lng = 0; lng < 360; lng += 30) {
        const theta = (lng * Math.PI) / 180 + rotationY;
        const x = centerX + radius * Math.sin(theta);
        const z = radius * Math.cos(theta);
        if (z > 0) { // Front side only
          ctx.beginPath();
          ctx.moveTo(x, centerY - radius);
          ctx.lineTo(x, centerY + radius);
          ctx.stroke();
        }
      }

      // Revolving Cities Rendering with depth-culling & collision deconfliction
      const visibleCities = [];
      REVOLVING_CITIES.forEach((city) => {
        const radLat = (city.lat * Math.PI) / 180;
        const radLng = (city.lng * Math.PI) / 180 + rotationY;

        const x = radius * Math.cos(radLat) * Math.sin(radLng);
        const y = -radius * Math.sin(radLat);
        const z = radius * Math.cos(radLat) * Math.cos(radLng);

        // Cull points behind sphere or too close to horizon edge
        if (z > radius * 0.12) {
          const screenX = centerX + x;
          const screenY = centerY + y * Math.cos(rotationX) - z * Math.sin(rotationX) * 0.2;
          const depthAlpha = Math.max(0, Math.min(1, (z / radius - 0.12) / 0.45));
          visibleCities.push({ ...city, screenX, screenY, z, depthAlpha });
        }
      });

      // Sort front-to-back
      visibleCities.sort((a, b) => b.z - a.z);

      const placedBoxes = [];

      visibleCities.forEach((city) => {
        const { screenX, screenY, depthAlpha } = city;
        if (depthAlpha <= 0.05) return;

        // Thermal pulse ring
        const pulse = (Date.now() / 400 + city.lat) % (Math.PI * 2);
        const pulseRadius = 5 + Math.sin(pulse) * 3;

        ctx.save();
        ctx.globalAlpha = depthAlpha;

        ctx.beginPath();
        ctx.arc(screenX, screenY, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${city.color}33`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(screenX, screenY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = city.color;
        ctx.fill();

        // Measure text
        ctx.font = '600 10px Outfit, system-ui, sans-serif';
        const labelText = `${city.name} (${city.temp})`;
        const textWidth = ctx.measureText(labelText).width;
        const boxWidth = textWidth + 16;
        const boxHeight = 18;

        // Stagger positions: right, left, bottom, top
        let bestX = screenX + 8;
        let bestY = screenY - 9;
        let collision = true;

        const candidates = [
          { x: screenX + 8, y: screenY - 9 },
          { x: screenX - boxWidth - 8, y: screenY - 9 },
          { x: screenX + 8, y: screenY + 8 },
          { x: screenX + 8, y: screenY - 24 },
          { x: screenX - boxWidth - 8, y: screenY + 8 },
          { x: screenX - boxWidth - 8, y: screenY - 24 },
        ];

        for (const cand of candidates) {
          const overlap = placedBoxes.some(box =>
            cand.x < box.x + box.w &&
            cand.x + boxWidth > box.x &&
            cand.y < box.y + box.h &&
            cand.y + boxHeight > box.y
          );
          if (!overlap) {
            bestX = cand.x;
            bestY = cand.y;
            collision = false;
            break;
          }
        }

        if (!collision || city.z > radius * 0.6 || city.isPrimary) {
          placedBoxes.push({ x: bestX, y: bestY, w: boxWidth, h: boxHeight });

          // Draw pill background
          ctx.fillStyle = city.isPrimary
            ? (theme === 'dark' ? 'rgba(2, 132, 199, 0.35)' : 'rgba(2, 132, 199, 0.20)')
            : (theme === 'dark' ? 'rgba(10, 15, 29, 0.88)' : 'rgba(255, 255, 255, 0.92)');
          ctx.strokeStyle = city.isPrimary
            ? '#38bdf8'
            : (theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)');
          ctx.lineWidth = city.isPrimary ? 1.5 : 1;

          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(bestX, bestY, boxWidth, boxHeight, 4);
          } else {
            ctx.rect(bestX, bestY, boxWidth, boxHeight);
          }
          ctx.fill();
          ctx.stroke();

          // Small color pip
          ctx.beginPath();
          ctx.arc(bestX + 7, bestY + boxHeight / 2, city.isPrimary ? 3 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = city.color;
          ctx.fill();

          // Text
          ctx.fillStyle = city.isPrimary
            ? '#38bdf8'
            : (theme === 'dark' ? '#f8fafc' : '#0f172a');
          ctx.fillText(labelText, bestX + 13, bestY + 12);
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(renderGlobe);
    };

    renderGlobe();

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [theme, isRotating]);

  // --- 2. Heat Particle Shimmer Canvas ---
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 1,
      vy: -(Math.random() * 0.6 + 0.2),
      vx: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.2,
      color: Math.random() > 0.5 ? '#f97316' : '#10b981'
    }));

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx;
        if (p.y < 0) {
          p.y = canvas.height;
          p.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(drawParticles);
    };

    drawParticles();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fp-container">
      {/* Background Particle Canvas */}
      <canvas ref={particleCanvasRef} className="fp-bg-canvas" />

      {/* Ambient Glow Orbs */}
      <div className="fp-orb fp-orb-heat" />
      <div className="fp-orb fp-orb-cool" />
      <div className="fp-orb fp-orb-ai" />

      <div className="fp-content">
        {/* ================= HERO SECTION ================= */}
        <section className="fp-hero">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Shimmer Pill Badge (MagicUI style) */}
            <div className="fp-badge" onClick={onOpenSystemStatus} style={{ cursor: 'pointer' }}>
              <span className="fp-badge-dot" />
              <span>HYPERLOCAL CLIMATE DIGITAL TWIN</span>
              <Sparkles size={13} />
            </div>

            {/* Title with Gradient Shimmer */}
            <h1 className="fp-title">
              Cooling Urban Heat Islands with{' '}
              <span className="fp-gradient-text">Explainable AI &amp; 3D Digital Twins</span>
            </h1>

            <p className="fp-subtitle">
              HeatSync merges multi-spectral satellite imagery (Landsat 8/9, Sentinel-2),
              OpenStreetMap vectors, and XGBoost machine learning to model 53,802 grid cells
              at 100 m hyper-resolution—enabling physics-informed cooling simulations.
            </p>

            {/* Action Buttons */}
            <div className="fp-hero-actions">
              <button className="fp-btn fp-btn-primary" onClick={() => navigateTo('twin')}>
                <Globe size={18} />
                <span>Launch 3D Digital Twin Map</span>
                <ArrowRight size={16} />
              </button>

              <button className="fp-btn fp-btn-secondary" onClick={() => navigateTo('scenarios')}>
                <Sprout size={18} />
                <span>Run Cooling Simulator</span>
              </button>

              <button className="fp-btn fp-btn-outline" onClick={() => navigateTo('drivers')}>
                <BrainCircuit size={18} />
                <span>SHAP Heat Drivers</span>
              </button>
            </div>

            {/* Small Spec Tags */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} color="#10b981" /> 100 m Cell Grid
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} color="#10b981" /> SHAP Feature Attribution
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} color="#10b981" /> 95% Kriging Confidence
              </span>
            </div>
          </motion.div>

          {/* 3D Revolving Earth Visual Stage */}
          <motion.div
            className="fp-hero-visual"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="fp-globe-wrapper">
              <canvas
                ref={globeCanvasRef}
                width={440}
                height={440}
                className="fp-globe-canvas"
                title="Drag to rotate Earth globe"
              />

              {/* Central HeatSync Logo Aura */}
              <div className="fp-logo-aura">
                <img src={logoSrc} alt="HeatSync Logo" className="fp-logo-img" />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ================= METRIC COUNTER BAR ================= */}
        <section className="fp-metrics-grid">
          <div className="fp-metric-card">
            <div className="fp-metric-icon" style={{ background: 'var(--hs-cyan-dim)', color: 'var(--hs-cyan)' }}>
              <Globe size={24} />
            </div>
            <div>
              <div className="fp-metric-val">53,802</div>
              <div className="fp-metric-lbl">Tessellated Grid Cells (100 m)</div>
            </div>
          </div>

          <div className="fp-metric-card">
            <div className="fp-metric-icon" style={{ background: 'var(--hs-heat-dim)', color: 'var(--hs-heat)' }}>
              <ThermometerSun size={24} />
            </div>
            <div>
              <div className="fp-metric-val">90+ Features</div>
              <div className="fp-metric-lbl">Multi-Spectral Telemetry</div>
            </div>
          </div>

          <div className="fp-metric-card">
            <div className="fp-metric-icon" style={{ background: 'var(--hs-vegetation-dim)', color: 'var(--hs-vegetation)' }}>
              <Sprout size={24} />
            </div>
            <div>
              <div className="fp-metric-val">-0.28°C / 10%</div>
              <div className="fp-metric-lbl">Cool Roof Albedo Efficiency</div>
            </div>
          </div>

          <div className="fp-metric-card">
            <div className="fp-metric-icon" style={{ background: 'var(--hs-purple-dim)', color: 'var(--hs-purple)' }}>
              <BrainCircuit size={24} />
            </div>
            <div>
              <div className="fp-metric-val">XGBoost + SHAP</div>
              <div className="fp-metric-lbl">Explainable UHI AI Model</div>
            </div>
          </div>
        </section>

        {/* ================= FEATURE GALLERY ================= */}
        <section>
          <div className="fp-section-head">
            <h2 className="fp-section-title">Comprehensive Climate Digital Twin Pillars</h2>
            <p className="fp-section-desc">
              Designed for municipal authorities, urban planners, and environmental researchers.
            </p>
          </div>

          <div className="fp-gallery-grid">
            {/* Card 1 */}
            <div className="fp-gallery-card">
              <div className="fp-card-glow" style={{ background: 'var(--hs-cyan)' }} />
              <div>
                <div className="fp-card-icon" style={{ background: 'var(--hs-cyan-dim)', color: 'var(--hs-cyan)' }}>
                  <Globe size={26} />
                </div>
                <h3 className="fp-card-title">3D Urban Digital Twin</h3>
                <p className="fp-card-text">
                  Photorealistic 3D building rendering with MapLibre GL, OSM vector footprints, terrain slope elevation, and thermal layer overlays.
                </p>
              </div>
              <span className="fp-card-link" onClick={() => navigateTo('twin')}>
                <span>Open 3D City Map</span>
                <ArrowRight size={14} />
              </span>
            </div>

            {/* Card 2 */}
            <div className="fp-gallery-card">
              <div className="fp-card-glow" style={{ background: 'var(--hs-vegetation)' }} />
              <div>
                <div className="fp-card-icon" style={{ background: 'var(--hs-vegetation-dim)', color: 'var(--hs-vegetation)' }}>
                  <Layers size={26} />
                </div>
                <h3 className="fp-card-title">Multi-Spectral GIS Pipeline</h3>
                <p className="fp-card-text">
                  Automated download &amp; processing of Landsat 8/9 ST_B10 thermal LST, Sentinel-2 NDVI, Copernicus DEM, and CPCB AQI feeds.
                </p>
              </div>
              <span className="fp-card-link" onClick={() => navigateTo('satellite')}>
                <span>Explore GIS Catalog</span>
                <ArrowRight size={14} />
              </span>
            </div>

            {/* Card 3 */}
            <div className="fp-gallery-card">
              <div className="fp-card-glow" style={{ background: 'var(--hs-purple)' }} />
              <div>
                <div className="fp-card-icon" style={{ background: 'var(--hs-purple-dim)', color: 'var(--hs-purple)' }}>
                  <BrainCircuit size={26} />
                </div>
                <h3 className="fp-card-title">Explainable AI (SHAP)</h3>
                <p className="fp-card-text">
                  Granular decomposition of anthropogenic heat drivers per grid cell (vegetation deficit, albedo, road proximity, slope).
                </p>
              </div>
              <span className="fp-card-link" onClick={() => navigateTo('drivers')}>
                <span>Analyze Heat Drivers</span>
                <ArrowRight size={14} />
              </span>
            </div>

            {/* Card 4 */}
            <div className="fp-gallery-card">
              <div className="fp-card-glow" style={{ background: 'var(--hs-infrastructure)' }} />
              <div>
                <div className="fp-card-icon" style={{ background: 'var(--hs-infrastructure-dim)', color: 'var(--hs-infrastructure)' }}>
                  <Sprout size={26} />
                </div>
                <h3 className="fp-card-title">Intervention Simulator</h3>
                <p className="fp-card-text">
                  7 canonical scenarios (tree canopy, cool roofs, green corridors) with cost-benefit analysis and 95% Kriging confidence bounds.
                </p>
              </div>
              <span className="fp-card-link" onClick={() => navigateTo('sandbox')}>
                <span>Open Urban Sandbox</span>
                <ArrowRight size={14} />
              </span>
            </div>

            {/* Card 5 */}
            <div className="fp-gallery-card">
              <div className="fp-card-glow" style={{ background: 'var(--hs-critical)' }} />
              <div>
                <div className="fp-card-icon" style={{ background: 'var(--hs-critical-dim)', color: 'var(--hs-critical)' }}>
                  <ShieldAlert size={26} />
                </div>
                <h3 className="fp-card-title">Heatwave Alerts &amp; Vulnerability</h3>
                <p className="fp-card-text">
                  Real-time thermal risk threshold notifications, citizen health advisory guidance, and demographic equity priority ranking.
                </p>
              </div>
              <span className="fp-card-link" onClick={() => navigateTo('forecast')}>
                <span>View Thermal Forecast</span>
                <ArrowRight size={14} />
              </span>
            </div>

            {/* Card 6 */}
            <div className="fp-gallery-card">
              <div className="fp-card-glow" style={{ background: 'var(--hs-cool)' }} />
              <div>
                <div className="fp-card-icon" style={{ background: 'var(--hs-cool-dim)', color: 'var(--hs-cool)' }}>
                  <Bot size={26} />
                </div>
                <h3 className="fp-card-title">HEAT AI Assistant</h3>
                <p className="fp-card-text">
                  Conversational assistant powered by HEAT AI to query cell metrics, request cooling plans, and export policy documentation.
                </p>
              </div>
              <span className="fp-card-link" onClick={() => navigateTo('ai')}>
                <span>Ask HEAT AI</span>
                <ArrowRight size={14} />
              </span>
            </div>
          </div>
        </section>

        {/* ================= WORKFLOW STEPS ================= */}
        <section>
          <div className="fp-section-head">
            <h2 className="fp-section-title">End-to-End Pipeline Workflow</h2>
            <p className="fp-section-desc">From raw satellite telemetry to actionable urban cooling policy.</p>
          </div>

          <div className="fp-workflow-grid">
            <div className="fp-step-card">
              <span className="fp-step-num">01</span>
              <h4 className="fp-step-title">Ingest GIS Telemetry</h4>
              <p className="fp-step-text">Sentinel-2, Landsat 8/9, Copernicus DEM, &amp; OSM layer extraction.</p>
            </div>

            <div className="fp-step-card">
              <span className="fp-step-num">02</span>
              <h4 className="fp-step-title">100m Grid Feature Engineering</h4>
              <p className="fp-step-text">Computation of 90+ microclimate features across 53,802 cells.</p>
            </div>

            <div className="fp-step-card">
              <span className="fp-step-num">03</span>
              <h4 className="fp-step-title">XGBoost &amp; SHAP AI Modeling</h4>
              <p className="fp-step-text">Model training, 5-fold CV, Optuna tuning, and SHAP explainability.</p>
            </div>

            <div className="fp-step-card">
              <span className="fp-step-num">04</span>
              <h4 className="fp-step-title">Simulate &amp; Optimize</h4>
              <p className="fp-step-text">Interactive 3D digital twin visualization &amp; cooling priority matrices.</p>
            </div>
          </div>
        </section>

        {/* ================= CTA BANNER ================= */}
        <section className="fp-cta-banner">
          <h2 className="fp-cta-title">Ready to Explore the Urban Digital Twin?</h2>
          <p className="fp-cta-text">
            Experience real-time Land Surface Temperature predictions, 3D city rendering, and physics-informed microclimate simulation.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button className="fp-btn fp-btn-primary" onClick={() => navigateTo('twin')}>
              <Globe size={18} />
              <span>Launch 3D Digital Twin Map</span>
            </button>
            <button className="fp-btn fp-btn-outline" onClick={onOpenSystemStatus}>
              <Activity size={18} />
              <span>Check System Status</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OverviewPage;
