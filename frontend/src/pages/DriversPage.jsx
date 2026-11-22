import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { fetchJson } from '../services/backendClient';

export function DriversPage() {
  const [drivers, setDrivers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson('/explainability/top-features')
      .then(data => setDrivers(data.top_features || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="hs-page-content">
      <motion.div className="hs-page-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <BarChart3 size={20} color="var(--hs-purple)" />
        <div>
          <h1 className="hs-display" style={{ fontSize: 'var(--hs-text-2xl)' }}>Heat Drivers</h1>
          <p className="hs-body" style={{ fontSize: 'var(--hs-text-sm)' }}>
            SHAP-based feature importance explaining what makes areas hot
          </p>
        </div>
      </motion.div>

      <div className="hs-drivers-list">
        {loading && <div className="hs-loading">Loading drivers...</div>}
        {!loading && (!drivers || drivers.length === 0) && (
          <div className="hs-loading">
            <span className="hs-body" style={{ fontSize: 'var(--hs-text-sm)', color: 'var(--hs-text-muted)' }}>
              Driver data unavailable
            </span>
          </div>
        )}
        {(drivers || []).map((d, i) => (
          <motion.div
            key={d.feature}
            className="hs-driver-item"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <span className="hs-data" style={{ fontSize: 'var(--hs-text-xs)', color: 'var(--hs-text-muted)', width: 24 }}>
              {i + 1}
            </span>
            <div className="hs-driver-bar-container">
              <span className="hs-driver-name">{d.feature}</span>
              <div className="hs-driver-bar">
                <motion.div
                  className="hs-driver-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${(d.mean_abs_shap / (drivers[0]?.mean_abs_shap || 1)) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                />
              </div>
              <span className="hs-data" style={{ fontSize: 'var(--hs-text-xs)', color: 'var(--hs-purple)', minWidth: 60, textAlign: 'right' }}>
                {d.mean_abs_shap?.toFixed(4)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default DriversPage;
