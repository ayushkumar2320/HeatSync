import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Cloud, Sun, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchTemporalDates } from '../../services/temporalClient';

/**
 * ObservationTimeline — displays the real Landsat acquisition timeline.
 *
 * Fetches actual dates from /api/temporal/thermal/dates and renders a
 * horizontal scrollable timeline. Each node represents one real Landsat
 * overpass (~16 day revisit). Clicking a date selects it for inspection.
 *
 * Props:
 *   selectedDate  - currently selected observation date (YYYY-MM-DD)
 *   onSelectDate  - callback(date) when a timeline node is clicked
 */
export default function ObservationTimeline({ selectedDate, onSelectDate }) {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTemporalDates()
      .then((data) => {
        if (cancelled) return;
        if (data?.status === 'available' && data.dates?.length) {
          setDates(data.dates.map((d) => ({
            date: typeof d === 'string' ? d : d.date,
            sceneId: typeof d === 'string' ? null : (d.scene_id || null),
            cloudCover: typeof d === 'string' ? null : (d.cloud_cover ?? null),
            validPixelPct: typeof d === 'string' ? null : (d.valid_pixel_pct ?? null),
          })));
        } else {
          setDates([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) { setError(err.message); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="obs-timeline">
        <div className="obs-timeline-header">
          <Calendar size={14} />
          <span className="hs-label">OBSERVATION TIMELINE</span>
        </div>
        <div className="obs-timeline-loading">Loading Landsat acquisitions...</div>
      </div>
    );
  }

  if (error || dates.length === 0) {
    return (
      <div className="obs-timeline">
        <div className="obs-timeline-header">
          <Calendar size={14} />
          <span className="hs-label">OBSERVATION TIMELINE</span>
        </div>
        <div className="obs-timeline-empty">
          {error ? 'Timeline unavailable' : 'No Landsat observations available'}
        </div>
      </div>
    );
  }

  return (
    <div className="obs-timeline">
      <div className="obs-timeline-header">
        <Calendar size={14} />
        <span className="hs-label">OBSERVATION TIMELINE</span>
        <span className="obs-timeline-count">{dates.length} scenes</span>
        <div className="obs-timeline-nav">
          <button className="obs-timeline-btn" onClick={() => scroll(-1)}><ChevronLeft size={14} /></button>
          <button className="obs-timeline-btn" onClick={() => scroll(1)}><ChevronRight size={14} /></button>
        </div>
      </div>
      <div className="obs-timeline-track" ref={scrollRef}>
        {dates.map((d) => {
          const isSelected = d.date === selectedDate;
          const month = new Date(d.date + 'T00:00:00').toLocaleString('en-US', { month: 'short', year: '2-digit' });
          const day = new Date(d.date + 'T00:00:00').getDate();
          const cloudBadge = d.cloudCover != null
            ? (d.cloudCover < 10 ? 'clear' : d.cloudCover < 20 ? 'partial' : 'cloudy')
            : null;
          return (
            <motion.button
              key={d.date}
              className={`obs-timeline-node ${isSelected ? 'selected' : ''} ${cloudBadge || ''}`}
              onClick={() => onSelectDate?.(d.date)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="obs-timeline-month">{month}</span>
              <span className="obs-timeline-day">{day}</span>
              {cloudBadge && (
                <span className={`obs-timeline-cloud ${cloudBadge}`}>
                  {cloudBadge === 'clear' ? <Sun size={8} /> : <Cloud size={8} />}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      {selectedDate && (
        <div className="obs-timeline-selected">
          Selected: <strong>{selectedDate}</strong>
          {dates.find((d) => d.date === selectedDate)?.sceneId && (
            <span className="obs-timeline-scene">
              · {dates.find((d) => d.date === selectedDate).sceneId}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
