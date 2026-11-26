import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import EarthGlobe from './EarthGlobe'

import { Sidebar } from './Sidebar'

export default function Hero() {
  const navigate = useNavigate()
  return (
    <section style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>

      {/* Background video */}
      <video
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        src="/hero.mp4" autoPlay muted loop playsInline
      />

      {/* Dark atmospheric overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,6,16,0.36)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,5,15,0.06) 24%, rgba(0,5,15,0.18) 58%, rgba(0,7,20,0.78) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.22) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.16) 100%)' }} />

      {/* HEATX ghost watermark - clean vector letters with customizable spacing via `gap` */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '42%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(14px, 3.2vw, 40px)', // Adjust character spacing here (e.g. '24px', '2em', etc.)
          height: 'clamp(52px, 12vw, 130px)',
          pointerEvents: 'none',
          zIndex: 2,
          userSelect: 'none',
        }}
      >
        {[
          { ch: 'H', w: 1536, d: 'M 96.0 1490.0 L 96.0 0.0 L 500.0 0.0 L 500.0 566.0 L 1036.0 566.0 L 1036.0 0.0 L 1440.0 0.0 L 1440.0 1490.0 L 1036.0 1490.0 L 1036.0 892.0 L 500.0 892.0 L 500.0 1490.0 L 96.0 1490.0 Z' },
          { ch: 'E', w: 1255, d: 'M 96.0 1490.0 L 96.0 0.0 L 1170.0 0.0 L 1170.0 326.0 L 500.0 326.0 L 500.0 578.0 L 1114.0 578.0 L 1114.0 896.0 L 500.0 896.0 L 500.0 1164.0 L 1166.0 1164.0 L 1166.0 1490.0 L 96.0 1490.0 Z' },
          { ch: 'A', w: 1628, d: 'M 570.4 1204.0 L 498.0 1490.0 L 46.0 1490.0 L 529.0 0.0 L 1081.0 0.0 L 1582.0 1490.0 L 1124.0 1490.0 L 1038.4 1204.0 L 570.4 1204.0 Z M 949.7 902.0 L 845.0 119.0 L 646.8 902.0 L 949.7 902.0 Z' },
          { ch: 'T', w: 1406, d: 'M 56.0 326.0 L 56.0 0.0 L 1350.0 0.0 L 1350.0 326.0 L 905.0 326.0 L 905.0 1490.0 L 501.0 1490.0 L 501.0 326.0 L 56.0 326.0 Z' },
          { ch: 'X', w: 1610, d: 'M 583.1 727.9 L 106.0 0.0 L 575.0 0.0 L 694.0 194.0 L 748.0 559.0 L 1049.0 0.0 L 1506.0 0.0 L 1038.2 716.6 L 1564.0 1490.0 L 1081.0 1490.0 L 919.0 1234.0 L 831.0 975.0 L 516.0 1490.0 L 46.0 1490.0 L 583.1 727.9 Z' },
        ].map((item) => (
          <svg
            key={item.ch}
            viewBox={`0 0 ${item.w} 1490`}
            fill="none"
            stroke="rgba(255,255,255,0.055)"
            strokeWidth="18"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              height: '100%',
              width: 'auto',
              display: 'block',
              overflow: 'visible',
            }}
          >
            <path d={item.d} fillRule="evenodd" />
          </svg>
        ))}
      </div>

      {/* 3D Realistic Three.js Earth Globe Horizon */}
      <EarthGlobe />

      {/* SVG Refraction Filter for Optical Lens Warp */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          {/* Subtle lens distortion for the glass pill container */}
          <filter id="lens-refract" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" seed="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* Chromatic aberration: splits RGB channels slightly for prismatic edge */}
          <filter id="chromatic-ab" x="-5%" y="-5%" width="110%" height="110%">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx="1" dy="0" result="r-offset" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feOffset in="b" dx="-1" dy="0" result="b-offset" />
            <feBlend in="r-offset" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b-offset" mode="screen" />
          </filter>
        </defs>
      </svg>

      {/* Left vertical nav tray — matches ExploreOdisha layout */}
      {/* Main navigation sidebar */}
      <Sidebar currentPath="/" includeHome={false} />



      {/* Main hero content */}
      <div style={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '60px 24px 170px',
      }}>


        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: 'easeOut' }}
          style={{
            margin: 0, fontFamily: "'Inter', sans-serif", fontWeight: 700,
            fontSize: 'clamp(1.9rem, 4.2vw, 3rem)', lineHeight: 1.12,
            letterSpacing: '-0.025em', color: '#fff', maxWidth: '700px',
            textShadow: '0 2px 40px rgba(0,0,0,0.6)',
          }}
        >
          Building cooler, smarter and<br />
          <span style={{ color: '#86efac' }}>sustainable cities</span> for tomorrow.
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.38, ease: 'easeOut' }}
          style={{
            margin: '18px 0 0', fontSize: '14px', lineHeight: 1.65,
            color: 'rgba(255,255,255,0.6)', fontWeight: 400, letterSpacing: '0.01em',
          }}
        >
          Predict the Heat. Understand the Stress. Protect the People.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.52, ease: 'easeOut' }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '30px' }}
        >
          <motion.button
            onClick={() => navigate('/explore')}
            whileHover={{
              scale: 1.06,
              boxShadow: [
                'inset 0 1.5px 0 0 rgba(255,255,255,0.95)',
                'inset 0 -1px 0 0 rgba(0,0,0,0.18)',
                '0 6px 28px rgba(34,197,94,0.45)',
                '0 2px 10px rgba(0,0,0,0.22)',
              ].join(', '),
            }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: '11px 26px', borderRadius: '999px',
              fontSize: '14px', fontWeight: 600,
              color: 'rgba(255,255,255,0.95)',
              display: 'flex', alignItems: 'center', gap: '6px',
              cursor: 'pointer',
              // iOS 18 glass: almost invisible, green tint instead of fill
              background: 'radial-gradient(ellipse 110% 110% at 40% 28%, rgba(255,255,255,0.22) 0%, rgba(34,197,94,0.18) 45%, rgba(22,163,74,0.08) 75%, rgba(0,0,0,0.04) 100%)',
              border: '1px solid rgba(255,255,255,0.32)',
              backdropFilter: 'blur(40px) saturate(180%) brightness(1.1)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%) brightness(1.1)',
              boxShadow: [
                '0 8px 32px -4px rgba(0,0,0,0.28)',
                '0 2px 8px -2px rgba(0,0,0,0.18)',
                'inset 0 1.5px 0 0 rgba(255,255,255,0.75)',
                'inset 0 -1px 0 0 rgba(255,255,255,0.10)',
                '0 0 24px rgba(34,197,94,0.20)',
              ].join(', '),
              transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Explore Odisha Map &#8594;
          </motion.button>


        </motion.div>
      </div>



    </section>
  )
}
