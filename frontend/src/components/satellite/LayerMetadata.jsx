import React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Radio, Grid3x3, Globe, CheckCircle2,
  AlertTriangle, Info, Maximize2
} from 'lucide-react';

/**
 * LayerMetadata — displays observation metadata for a satellite layer.
 *
 * Shows: date, source sensor, spatial resolution, coverage area,
 * quality/cloud info when available.
 *
 * Props:
 *   title       - layer display name
 *   source      - sensor/processing source string
 *   resolution  - spatial resolution string
 *   date        - observation date (optional)
 *   coverage    - coverage description (optional)
 *   cloudCover  - cloud cover percentage (optional)
 *   validPixels - valid pixel percentage (optional)
 *   sceneId     - scene identifier (optional)
 *   vmin        - minimum value in the layer (optional)
 *   vmax        - maximum value in the layer (optional)
 *   unit        - value unit (optional)
 *   available   - whether this layer's data is available
 *   unavailableReason - reason if unavailable (optional)
 */
export default function LayerMetadata({
  title,
  source,
  resolution,
  date,
  coverage = 'Bhubaneswar urban area (20.13–20.40°N, 85.74–85.91°E)',
  cloudCover,
  validPixels,
  sceneId,
  vmin,
  vmax,
  unit,
  available = true,
  unavailableReason,
}) {
  if (!available) {
    return (
      <div className="lm-card lm-unavailable">
        <div className="lm-unavailable-header">
          <AlertTriangle size={16} style={{ color: 'var(--hs-warning)' }} />
          <span className="hs-label">DATA UNAVAILABLE</span>
        </div>
        <p className="lm-unavailable-reason">
          {unavailableReason || 'Satellite imagery not yet processed for this layer.'}
        </p>
        <p className="lm-unavailable-hint">
          Run the GIS pipeline to generate this layer:
          <code>python gis-engine/main.py</code>
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="lm-card"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="lm-header">
        <CheckCircle2 size={14} style={{ color: 'var(--hs-success)' }} />
        <span className="hs-label">{title}</span>
        <span className="lm-available-badge">AVAILABLE</span>
      </div>

      <div className="lm-grid">
        <div className="lm-row">
          <Calendar size={12} className="lm-icon" />
          <span className="lm-label">DATE</span>
          <span className="lm-value">{date || 'Current analysis period'}</span>
        </div>

        <div className="lm-row">
          <Radio size={12} className="lm-icon" />
          <span className="lm-label">SOURCE</span>
          <span className="lm-value">{source}</span>
        </div>

        <div className="lm-row">
          <Grid3x3 size={12} className="lm-icon" />
          <span className="lm-label">RESOLUTION</span>
          <span className="lm-value">{resolution}</span>
        </div>

        <div className="lm-row">
          <Globe size={12} className="lm-icon" />
          <span className="lm-label">COVERAGE</span>
          <span className="lm-value lm-coverage">{coverage}</span>
        </div>

        {cloudCover != null && (
          <div className="lm-row">
            <Info size={12} className="lm-icon" />
            <span className="lm-label">CLOUD COVER</span>
            <span className={`lm-value ${cloudCover < 10 ? 'lm-good' : cloudCover < 20 ? 'lm-warn' : 'lm-bad'}`}>
              {cloudCover.toFixed(1)}%
            </span>
          </div>
        )}

        {validPixels != null && (
          <div className="lm-row">
            <Maximize2 size={12} className="lm-icon" />
            <span className="lm-label">VALID PIXELS</span>
            <span className={`lm-value ${validPixels > 90 ? 'lm-good' : validPixels > 70 ? 'lm-warn' : 'lm-bad'}`}>
              {validPixels.toFixed(1)}%
            </span>
          </div>
        )}

        {sceneId && (
          <div className="lm-row">
            <Info size={12} className="lm-icon" />
            <span className="lm-label">SCENE ID</span>
            <span className="lm-value lm-mono">{sceneId}</span>
          </div>
        )}

        {vmin != null && vmax != null && (
          <div className="lm-row">
            <Info size={12} className="lm-icon" />
            <span className="lm-label">VALUE RANGE</span>
            <span className="lm-value">
              {vmin.toFixed(2)} – {vmax.toFixed(2)} {unit || ''}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
