import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { TimelineStep } from '../types/heatx';

interface Timeline15DayProps {
  timelineSteps: TimelineStep[];
  activeDate: string;
  onDateSelect: (date: string) => void;
}

export default function Timeline15Day({ timelineSteps, activeDate, onDateSelect }: Timeline15DayProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const currentIndex = timelineSteps.findIndex(s => s.date === activeDate);
  const activeStep = timelineSteps[currentIndex] || timelineSteps[7] || timelineSteps[0];

  // Autoplay loop
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        const nextIdx = (currentIndex + 1) % timelineSteps.length;
        onDateSelect(timelineSteps[nextIdx].date);
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, timelineSteps, onDateSelect]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      onDateSelect(timelineSteps[currentIndex - 1].date);
    }
  };

  const handleNext = () => {
    if (currentIndex < timelineSteps.length - 1) {
      onDateSelect(timelineSteps[currentIndex + 1].date);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
      }}
    >
      {/* Top Controller Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '960px',
          padding: '4px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#ea9b7a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            15-Day Synoptic Window
          </span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '99px',
              fontSize: '9px',
              fontWeight: 700,
              background:
                activeStep?.state === 'HISTORICAL' ? 'rgba(45, 212, 191, 0.20)' :
                activeStep?.state === 'CURRENT' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(56, 189, 248, 0.20)',
              color:
                activeStep?.state === 'HISTORICAL' ? '#2dd4bf' :
                activeStep?.state === 'CURRENT' ? '#4ade80' : '#38bdf8',
              border: `1px solid ${
                activeStep?.state === 'HISTORICAL' ? 'rgba(45, 212, 191, 0.40)' :
                activeStep?.state === 'CURRENT' ? 'rgba(34, 197, 94, 0.50)' : 'rgba(56, 189, 248, 0.40)'
              }`,
            }}
          >
            {activeStep?.state || 'CURRENT'} {activeStep?.horizon ? `(${activeStep.horizon})` : ''}
          </span>
          <span style={{ fontSize: '11px', color: '#f5ead8', fontWeight: 600 }}>
            {activeStep?.date || activeDate}
          </span>
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(234,155,122,0.20)',
              color: '#f5ead8',
              fontSize: '10px',
              cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex <= 0 ? 0.4 : 1,
            }}
            title="Previous Day"
          >
            ◀
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: '3px 10px',
              borderRadius: '6px',
              background: isPlaying ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.20)',
              border: `1px solid ${isPlaying ? '#ef4444' : '#22c55e'}`,
              color: isPlaying ? '#fca5a5' : '#86efac',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex >= timelineSteps.length - 1}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(234,155,122,0.20)',
              color: '#f5ead8',
              fontSize: '10px',
              cursor: currentIndex >= timelineSteps.length - 1 ? 'not-allowed' : 'pointer',
              opacity: currentIndex >= timelineSteps.length - 1 ? 0.4 : 1,
            }}
            title="Next Day"
          >
            ▶
          </button>
        </div>
      </div>

      {/* 15-Day Liquid Glass Pills Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '999px',
          background: 'rgba(2, 26, 7, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(234,155,122,0.22)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          overflowX: 'auto',
          maxWidth: '100%',
        }}
      >
        {timelineSteps.map((step, idx) => {
          const isActive = step.date === activeDate;
          const isToday = step.state === 'CURRENT';
          const label = step.horizon || (isToday ? 'TODAY' : step.key || `D${idx - 7}`);

          return (
            <motion.button
              key={step.date}
              onClick={() => onDateSelect(step.date)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              animate={{
                scale: isActive ? 1.10 : 0.95,
                opacity: isActive ? 1 : 0.65,
              }}
              style={{
                padding: '5px 9px',
                borderRadius: '999px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1px',
                minWidth: '46px',
                background: isActive
                  ? 'radial-gradient(ellipse 90% 90% at 38% 28%, rgba(234,155,122,0.50) 0%, rgba(234,155,122,0.25) 50%, rgba(196,98,58,0.12) 100%)'
                  : 'rgba(255,255,255,0.05)',
                border: isActive
                  ? '1px solid rgba(234,155,122,0.65)'
                  : isToday
                  ? '1px solid rgba(34,197,94,0.45)'
                  : '1px solid rgba(255,255,255,0.10)',
                color: isActive ? '#ea9b7a' : isToday ? '#86efac' : 'rgba(245,234,216,0.70)',
                boxShadow: isActive ? '0 0 14px rgba(234,155,122,0.30)' : 'none',
                transition: 'border 0.2s, background 0.2s',
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: 800, lineHeight: 1.1 }}>
                {label}
              </span>
              <span style={{ fontSize: '7.5px', opacity: 0.75, fontFamily: 'monospace' }}>
                {step.date.slice(5)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
