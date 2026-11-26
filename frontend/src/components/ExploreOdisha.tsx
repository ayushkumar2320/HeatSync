import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'

import { Sidebar, glassBase } from './Sidebar'
import HeatXMap from './HeatXMap'
import Timeline15Day from './Timeline15Day'
import BlockDetailPanel from './BlockDetailPanel'
import { DataSourceBanner } from './DataSourceBanner'
import {
  getTimelineSteps,
  getBlocksForDate,
  getStateSummary,
  getDistrictsList,
} from '../adapters/dataAdapter'
import type { CDBlockRecord } from '../types/heatx'

// ── SVG Bauhaus background — Lily #ea9b7a + Deep Green #032f0c ────────────────
export function BauhausBackground() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', userSelect: 'none', zIndex: 0,
      }}
      viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#021a07" />
          <stop offset="45%" stopColor="#032f0c" />
          <stop offset="80%" stopColor="#04400f" />
          <stop offset="100%" stopColor="#052e0e" />
        </linearGradient>
        <radialGradient id="lily-glow" cx="85%" cy="90%" r="55%">
          <stop offset="0%" stopColor="#ea9b7a" stopOpacity="0.14" />
          <stop offset="60%" stopColor="#ea9b7a" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#ea9b7a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="green-glow" cx="10%" cy="10%" r="45%">
          <stop offset="0%" stopColor="#0a5c20" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#032f0c" stopOpacity="0" />
        </radialGradient>
        <clipPath id="left-clip">
          <rect x="0" y="0" width="80" height="900" />
        </clipPath>
        <clipPath id="bottom-clip">
          <rect x="0" y="840" width="1440" height="60" />
        </clipPath>
      </defs>

      {/* ── BASE FILL ── */}
      <rect width="1440" height="900" fill="url(#bg-grad)" />
      <rect width="1440" height="900" fill="url(#lily-glow)" />
      <rect width="1440" height="900" fill="url(#green-glow)" />

      {/* ── MONDRIAN RECTANGLE GRID ── */}
      <rect x="0" y="0" width="220" height="110"
        fill="rgba(234,155,122,0.13)" stroke="rgba(234,155,122,0.25)" strokeWidth="1.5" />
      <rect x="220" y="0" width="100" height="110"
        fill="rgba(3,47,12,0.55)" stroke="rgba(234,155,122,0.18)" strokeWidth="1.5" />
      <rect x="0" y="110" width="320" height="3"
        fill="rgba(245,234,216,0.20)" />
      <rect x="0" y="113" width="110" height="60"
        fill="rgba(196,98,58,0.14)" stroke="rgba(196,98,58,0.22)" strokeWidth="1" />
      <rect x="110" y="113" width="210" height="60"
        fill="rgba(74,140,92,0.10)" stroke="rgba(74,140,92,0.18)" strokeWidth="1" />
      <rect x="218" y="0" width="2" height="173" fill="rgba(234,155,122,0.20)" />

      {/* ── RIGHT EDGE MONDRIAN ── */}
      <rect x="1390" y="0" width="50" height="300"
        fill="rgba(234,155,122,0.10)" stroke="rgba(234,155,122,0.20)" strokeWidth="1" />
      <rect x="1390" y="300" width="50" height="180"
        fill="rgba(3,47,12,0.60)" stroke="rgba(234,155,122,0.12)" strokeWidth="1" />
      <rect x="1390" y="480" width="50" height="120"
        fill="rgba(196,98,58,0.16)" stroke="rgba(196,98,58,0.22)" strokeWidth="1" />
      <rect x="1390" y="600" width="50" height="300"
        fill="rgba(74,140,92,0.12)" stroke="rgba(74,140,92,0.18)" strokeWidth="1" />

      {/* ── BOLD HORIZONTAL RULES ── */}
      <rect x="0" y="175" width="1440" height="2.5" fill="rgba(234,155,122,0.16)" />
      <rect x="0" y="450" width="1440" height="1.5" fill="rgba(245,234,216,0.09)" />
      <rect x="0" y="726" width="1440" height="2" fill="rgba(74,140,92,0.15)" />

      {/* ── BOLD VERTICAL RULES ── */}
      <rect x="320" y="0" width="2" height="900" fill="rgba(234,155,122,0.10)" />
      <rect x="960" y="0" width="1.5" height="900" fill="rgba(245,234,216,0.07)" />
      <rect x="1120" y="0" width="2" height="900" fill="rgba(74,140,92,0.10)" />

      {/* ── LARGE CONCENTRIC CIRCLES ── */}
      <circle cx="1260" cy="80" r="420" fill="none" stroke="rgba(234,155,122,0.07)" strokeWidth="2" />
      <circle cx="1260" cy="80" r="300" fill="none" stroke="rgba(234,155,122,0.10)" strokeWidth="1.5" />
      <circle cx="1260" cy="80" r="180" fill="rgba(234,155,122,0.06)" stroke="rgba(234,155,122,0.16)" strokeWidth="1.5" />
      <circle cx="1260" cy="80" r="80" fill="rgba(234,155,122,0.10)" stroke="rgba(234,155,122,0.24)" strokeWidth="1" />
      <path d="M 1260 80 L 1340 80 A 80 80 0 0 0 1260 0 Z" fill="rgba(196,98,58,0.20)" />

      {/* ── QUARTER-CIRCLE FILLS ── */}
      <path d="M 0 900 A 360 360 0 0 1 360 540 L 0 540 Z"
        fill="rgba(3,47,12,0.55)" stroke="rgba(234,155,122,0.10)" strokeWidth="1" />
      <path d="M 0 900 A 520 520 0 0 1 520 380 L 520 900 Z"
        fill="rgba(2,30,8,0.32)" />
      <path d="M 0 900 A 220 220 0 0 1 220 680" fill="none"
        stroke="rgba(234,155,122,0.22)" strokeWidth="2" />

      {/* ── TRIANGLE ── */}
      <polygon points="720,460 880,760 560,760"
        fill="rgba(234,155,122,0.05)" stroke="rgba(234,155,122,0.14)" strokeWidth="1.5" />

      {/* ── ARC SEGMENT ── */}
      <path d="M 1440 900 A 320 320 0 0 0 1120 900 Z"
        fill="rgba(234,155,122,0.09)" stroke="rgba(234,155,122,0.16)" strokeWidth="1" />
      <path d="M 1440 900 A 200 200 0 0 0 1240 900 Z"
        fill="rgba(196,98,58,0.12)" />

      {/* ── DIAGONAL LINES ── */}
      <line x1="320" y1="175" x2="960" y2="726" stroke="rgba(234,155,122,0.07)" strokeWidth="1.5" />
      <line x1="0" y1="900" x2="720" y2="0" stroke="rgba(234,155,122,0.05)" strokeWidth="1.5" />
      <line x1="320" y1="0" x2="960" y2="900" stroke="rgba(245,234,216,0.04)" strokeWidth="1" />

      {/* ── SAGE ACCENT SQUARES ── */}
      <rect x="668" y="822" width="30" height="30" rx="2"
        fill="rgba(74,140,92,0.22)" stroke="rgba(74,140,92,0.35)" strokeWidth="1" />
      <rect x="706" y="822" width="30" height="30" rx="2"
        fill="rgba(74,140,92,0.12)" stroke="rgba(74,140,92,0.20)" strokeWidth="1" />
    </svg>
  )
}

// ── HeatX Logo SVG — Lily + Green palette ─────────────────────────────────────
function TempLogo() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" aria-label="HeatX Logo">
      <circle cx="19" cy="19" r="17" stroke="rgba(234,155,122,0.75)" strokeWidth="1.5" fill="rgba(3,47,12,0.40)" />
      <polygon
        points="19,5 30,12 30,26 19,33 8,26 8,12"
        fill="none" stroke="rgba(234,155,122,0.45)" strokeWidth="1.2"
      />
      <text x="19" y="23" textAnchor="middle" fontFamily="'Inter',sans-serif" fontWeight="700"
        fontSize="13" fill="#ea9b7a" letterSpacing="-0.5">
        HX
      </text>
    </svg>
  )
}

// ── Main ExploreOdisha Component ──────────────────────────────────────────────
export default function ExploreOdisha() {
  // Dynamically derive 15-day timeline steps from data
  const timelineSteps = useMemo(() => getTimelineSteps(), [])
  const todayStep = useMemo(
    () => timelineSteps.find(s => s.state === 'CURRENT') || timelineSteps[7] || timelineSteps[0],
    [timelineSteps]
  )

  // Active Date in the 15-day timeline (defaults to CURRENT day)
  const [activeDate, setActiveDate] = useState<string>(() => todayStep?.date || '2026-09-20')

  // Selected CD Block
  const [selectedBlock, setSelectedBlock] = useState<CDBlockRecord | null>(null)
  const [districtFilter, setDistrictFilter] = useState<string>('')

  // Derived records for active date
  const blocksData = useMemo(() => getBlocksForDate(activeDate), [activeDate])
  const stateSummary = useMemo(() => getStateSummary(activeDate), [activeDate])
  const districtsList = useMemo(() => getDistrictsList(), [])

  // Top high-risk CD Blocks (real data, ranked descending)
  const topBlocks = useMemo(() => {
    return Object.values(blocksData)
      .filter(b => (!districtFilter || b.district_name === districtFilter) &&
                   b.thermal_value !== null && b.thermal_value !== undefined && b.is_valid !== false)
      .sort((a, b) => Number(b.thermal_value ?? b.heat_index ?? 0) - Number(a.thermal_value ?? a.heat_index ?? 0))
      .slice(0, 8)
  }, [blocksData, districtFilter])

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      overflow: 'hidden',
    }}>
      {/* ── Bauhaus Background ── */}
      <BauhausBackground />

      {/* ── Data source status banner (top-right, dismissible) ── */}
      <DataSourceBanner />

      {/* ── HEAT X ghost watermark — top center ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(8px, 1.8vw, 22px)',
          height: 'clamp(40px, 8vw, 90px)',
          pointerEvents: 'none',
          zIndex: 1,
          userSelect: 'none',
          paddingTop: '8px',
        }}
      >
        {[
          { ch: 'H', w: 1536, d: 'M 96.0 1490.0 L 96.0 0.0 L 500.0 0.0 L 500.0 566.0 L 1036.0 566.0 L 1036.0 0.0 L 1440.0 0.0 L 1440.0 1490.0 L 1036.0 1490.0 L 1036.0 892.0 L 500.0 892.0 L 500.0 1490.0 L 96.0 1490.0 Z' },
          { ch: 'E', w: 1255, d: 'M 96.0 1490.0 L 96.0 0.0 L 1170.0 0.0 L 1170.0 326.0 L 500.0 326.0 L 500.0 578.0 L 1114.0 578.0 L 1114.0 896.0 L 500.0 896.0 L 500.0 1164.0 L 1166.0 1164.0 L 1166.0 1490.0 L 96.0 1490.0 Z' },
          { ch: 'A', w: 1628, d: 'M 570.4 1204.0 L 498.0 1490.0 L 46.0 1490.0 L 529.0 0.0 L 1081.0 0.0 L 1582.0 1490.0 L 1124.0 1490.0 L 1038.4 1204.0 L 570.4 1204.0 Z M 949.7 902.0 L 845.0 119.0 L 646.8 902.0 L 949.7 902.0 Z' },
          { ch: 'T', w: 1406, d: 'M 56.0 326.0 L 56.0 0.0 L 1350.0 0.0 L 1350.0 326.0 L 905.0 326.0 L 905.0 1490.0 L 501.0 1490.0 L 501.0 326.0 L 56.0 326.0 Z' },
          { ch: 'X', w: 1610, d: 'M 583.1 727.9 L 106.0 0.0 L 575.0 0.0 L 694.0 194.0 L 748.0 559.0 L 1049.0 0.0 L 1506.0 0.0 L 1038.2 716.6 L 1564.0 1490.0 L 1081.0 1490.0 L 919.0 1234.0 L 831.0 975.0 L 516.0 1490.0 L 46.0 1490.0 L 583.1 727.9 Z' },
        ].map(item => (
          <svg
            key={item.ch}
            viewBox={`0 0 ${item.w} 1490`}
            fill="none"
            stroke="rgba(234,155,122,0.10)"
            strokeWidth="18"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ height: '100%', width: 'auto', display: 'block', overflow: 'visible' }}
          >
            <path d={item.d} fillRule="evenodd" />
          </svg>
        ))}
      </div>

      {/* ── Solid readable HEAT X title ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: '12px',
          left: '48%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          textAlign: 'center',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(18px, 2.8vw, 28px)',
          letterSpacing: '0.18em',
          color: '#ea9b7a',
          textTransform: 'uppercase',
          lineHeight: 1,
          textShadow: '0 1px 3px rgba(3,47,12,0.60), 0 0 28px rgba(234,155,122,0.20)',
        }}>
          HEAT X
        </div>
        <div style={{
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.24em',
          color: 'rgba(234,155,122,0.65)',
          textTransform: 'uppercase',
          marginTop: '2px',
        }}>
          Odisha Heatwave Early Warning &amp; Human Thermal Stress Index
        </div>
      </motion.div>

      {/* ── Logo — top left ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          position: 'absolute',
          top: '12px',
          left: '16px',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{
          ...glassBase,
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <TempLogo />
        </div>
      </motion.div>

      {/* ── Main layout — below title ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        top: '64px',
        bottom: '12px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        padding: '0 16px',
        gap: '12px',
        zIndex: 10,
      }}>
        {/* ── Left vertical nav tray ── */}
        <Sidebar currentPath="/explore" />

        {/* ── Centre column: Native Vector Map + Dynamic Timeline ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: 0,
        }}>
          {/* Map Frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              flex: 1,
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(234,155,122,0.25)',
              boxShadow: '0 4px 30px rgba(3,47,12,0.40)',
              background: '#021a07',
              position: 'relative',
            }}
          >
            <HeatXMap
              date={activeDate}
              blocksData={blocksData}
              selectedBlock={selectedBlock}
              onBlockSelect={setSelectedBlock}
              filterDistrict={districtFilter}
            />
          </motion.div>

          {/* 15-Day Dynamic Timeline Controller */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Timeline15Day
              timelineSteps={timelineSteps}
              activeDate={activeDate}
              onDateSelect={setActiveDate}
            />
          </motion.div>
        </div>

        {/* ── Right Column: CD Block Detail & Statewide Overview Panel ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}
        >
          <BlockDetailPanel
            selectedBlock={selectedBlock}
            onClearSelection={() => setSelectedBlock(null)}
            stateSummary={stateSummary}
            topBlocks={topBlocks}
            onSelectBlock={setSelectedBlock}
            districtsList={districtsList}
            districtFilter={districtFilter}
            onFilterDistrict={setDistrictFilter}
            activeDate={activeDate}
          />
        </motion.div>
      </div>
    </div>
  )
}
