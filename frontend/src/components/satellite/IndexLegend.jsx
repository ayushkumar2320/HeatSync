import React from 'react';
import { motion } from 'framer-motion';

/**
 * IndexLegend — renders a continuous or categorical legend for a satellite index.
 *
 * For continuous layers: builds a CSS gradient bar from the stops array
 * and labels the min/max values.  For categorical layers: shows discrete
 * swatches with labels.
 *
 * Props:
 *   title      - legend title
 *   type       - 'continuous' | 'categorical'
 *   stops      - array of { color, label, value? }
 *   unit       - unit string
 *   vmin       - minimum value (continuous)
 *   vmax       - maximum value (continuous)
 *   note       - optional footnote
 */
export default function IndexLegend({ title, type = 'continuous', stops = [], unit, vmin, vmax, note }) {
  if (!stops.length) return null;

  if (type === 'categorical') {
    return (
      <motion.div
        className="idx-legend"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <span className="hs-label">{title}</span>
        <div className="idx-legend-items">
          {stops.map((stop, i) => (
            <div key={i} className="idx-legend-item">
              <span className="idx-legend-swatch" style={{ background: stop.color }} />
              <span className="idx-legend-label">{stop.label}</span>
              {stop.value && <span className="idx-legend-value">{stop.value}</span>}
            </div>
          ))}
        </div>
        {note && <span className="idx-legend-note">{note}</span>}
      </motion.div>
    );
  }

  // Continuous: build a gradient bar
  const gradient = stops.map((s, i) => {
    const pct = stops.length > 1 ? (i / (stops.length - 1)) * 100 : 50;
    return `${s.color} ${pct}%`;
  }).join(', ');

  return (
    <motion.div
      className="idx-legend"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <span className="hs-label">{title}</span>
      <div className="idx-legend-bar-wrap">
        <div className="idx-legend-bar" style={{ background: `linear-gradient(to right, ${gradient})` }} />
        <div className="idx-legend-bar-labels">
          {vmin != null && <span>{vmin.toFixed(2)} {unit || ''}</span>}
          {vmax != null && <span>{vmax.toFixed(2)} {unit || ''}</span>}
        </div>
      </div>
      <div className="idx-legend-stops">
        {stops.map((stop, i) => (
          <div key={i} className="idx-legend-stop">
            <span className="idx-legend-swatch" style={{ background: stop.color }} />
            <span className="idx-legend-stop-label">
              {stop.label} {stop.value && <span className="idx-legend-stop-value">({stop.value})</span>}
            </span>
          </div>
        ))}
      </div>
      {note && <span className="idx-legend-note">{note}</span>}
    </motion.div>
  );
}
