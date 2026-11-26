/**
 * DataSourceBanner.tsx
 * Persistent, dismissible status banner shown on every page.
 *
 * ONLINE  → thin green pill: "Live data from backend"
 * OFFLINE → amber warning bar: "Live data unavailable — displaying static snapshot (date)"
 * CHECKING → neutral pill: "Connecting to backend..."
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBackendStatus } from '../context/BackendStatusContext';

/** Small inline badge — use inside panels/cards to tag a single data section */
export function DataSourceBadge({ isLive }: { isLive?: boolean }) {
  const { status } = useBackendStatus();
  const live = isLive ?? status === 'ONLINE';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: live ? '#22c55e' : '#f59e0b',
      background: live ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
      border: `1px solid ${live ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
      borderRadius: '6px',
      padding: '2px 7px',
      verticalAlign: 'middle',
    }}>
      <span style={{
        width: '5px', height: '5px', borderRadius: '50%',
        background: live ? '#22c55e' : '#f59e0b',
        display: 'inline-block',
        ...(live ? { animation: 'pulse-green 1.8s ease-in-out infinite' } : {}),
      }} />
      {live ? 'LIVE' : 'STATIC SNAPSHOT'}
    </span>
  );
}

/** Full-width banner rendered at the top of each page */
export function DataSourceBanner({ position = 'top-right' }: { position?: 'top-right' | 'bottom' }) {
  const { status, checkedAt, snapshotDate } = useBackendStatus();
  const [dismissed, setDismissed] = useState(false);

  const timeStr = checkedAt
    ? checkedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  // Don't show anything while still checking
  if (status === 'CHECKING' || dismissed) return null;

  const isOnline = status === 'ONLINE';

  const posStyle: React.CSSProperties = position === 'bottom'
    ? { position: 'fixed', bottom: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }
    : { position: 'fixed', top: '10px', right: '80px', zIndex: 1000 };

  return (
    <>
      {/* Inline keyframes */}
      <style>{`
        @keyframes pulse-green { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
        @keyframes pulse-amber { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
      `}</style>
      <AnimatePresence>
        <motion.div
          key="data-source-banner"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={posStyle}
        >
          {isOnline ? (
            // ── ONLINE pill ────────────────────────────────────────────────────
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '5px 12px 5px 8px',
              borderRadius: '999px',
              background: 'rgba(3,47,12,0.85)',
              border: '1px solid rgba(34,197,94,0.40)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 2px 16px rgba(34,197,94,0.12)',
            }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#22c55e', flexShrink: 0,
                animation: 'pulse-green 1.8s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', letterSpacing: '0.06em' }}>
                LIVE
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(245,234,216,0.55)', marginLeft: '2px' }}>
                backend connected{timeStr ? ` · ${timeStr}` : ''}
              </span>
              <button
                onClick={() => setDismissed(true)}
                aria-label="Dismiss"
                style={{
                  marginLeft: '4px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'rgba(245,234,216,0.35)',
                  fontSize: '13px', lineHeight: 1, padding: '0 2px',
                }}
              >×</button>
            </div>
          ) : (
            // ── OFFLINE warning bar ────────────────────────────────────────────
            <motion.div
              animate={{ boxShadow: ['0 0 0 0 rgba(245,158,11,0)', '0 0 0 4px rgba(245,158,11,0.12)', '0 0 0 0 rgba(245,158,11,0)'] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px 8px 10px',
                borderRadius: '12px',
                background: 'rgba(120,53,15,0.90)',
                border: '1px solid rgba(245,158,11,0.55)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                maxWidth: '460px',
              }}
            >
              {/* Warning icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#fcd34d', letterSpacing: '0.05em' }}>
                  Live data unavailable
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(253,230,138,0.75)', marginTop: '1px', lineHeight: 1.4 }}>
                  Displaying static snapshot
                  {snapshotDate ? <> · compiled <strong>{snapshotDate}</strong></> : null}
                  {timeStr ? <> · checked {timeStr}</> : null}.{' '}
                  Values may not reflect current conditions.
                </div>
              </div>

              <button
                onClick={() => setDismissed(true)}
                aria-label="Dismiss offline warning"
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.30)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#fcd34d',
                  fontSize: '12px',
                  padding: '2px 7px',
                  lineHeight: 1.4,
                  fontFamily: "'Inter', sans-serif",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
