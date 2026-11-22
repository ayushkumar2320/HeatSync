import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { fetchJson } from '../services/backendClient';

export function HotspotsPage() {
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson('/city/hotspots?limit=50')
      .then(data => setHotspots(data.hotspots || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="hs-page-content">
      <motion.div className="hs-page-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <MapPin size={20} color="var(--hs-red)" />
        <div>
          <h1 className="hs-display" style={{ fontSize: 'var(--hs-text-2xl)' }}>Heat Hotspots</h1>
          <p className="hs-body" style={{ fontSize: 'var(--hs-text-sm)' }}>
            Ranked by XGBoost predicted Land Surface Temperature
          </p>
        </div>
      </motion.div>

      <div className="hs-hotspot-list">
        {loading && <div className="hs-loading">Loading hotspots...</div>}
        {hotspots.map((h, i) => (
          <motion.div
            key={h.grid_id}
            className="hs-hotspot-item"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <span className="hs-hotspot-rank" style={{
              background: i < 3 ? 'var(--hs-red)' : i < 10 ? 'var(--hs-orange)' : 'var(--hs-text-muted)'
            }}>{i + 1}</span>
            <div className="hs-hotspot-body">
              <span className="hs-telemetry" style={{ fontSize: 'var(--hs-text-lg)' }}>
                {h.predicted_lst?.toFixed(1)}°C
              </span>
              <span className="hs-data" style={{ fontSize: 'var(--hs-text-xs)', color: 'var(--hs-text-tertiary)' }}>
                {h.uhi_class} · Cell {h.grid_id}
              </span>
            </div>
            <span className="hs-data" style={{ fontSize: 'var(--hs-text-xs)', color: 'var(--hs-text-tertiary)' }}>
              {h.latitude?.toFixed(4)}, {h.longitude?.toFixed(4)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default HotspotsPage;
