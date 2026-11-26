import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { glassBase } from '../styles/theme'

export { glassBase }

export function Sidebar({ currentPath, includeHome = true, top = '35%' }: { currentPath: string, includeHome?: boolean, top?: string }) {
  const navigate = useNavigate();

  const items = [];
  
  if (includeHome) {
    items.push({
      label: 'Home', path: '/', active: currentPath === '/',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
          <polyline points="9 21 9 12 15 12 15 21" />
        </svg>
      )
    });
  }
  
  items.push(
    {
      label: 'Map page', path: '/explore', active: currentPath === '/explore',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 3 20 10 16 17 20 21 17 21 3 17 7 10 3 3 6" />
          <line x1="10" y1="3" x2="10" y2="16" /><line x1="17" y1="7" x2="17" y2="20" />
        </svg>
      )
    },
    {
      label: 'Prediction tab', path: '/prediction', active: currentPath === '/prediction',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    },
    {
      label: 'Disaster management tab', path: '/disaster-management', active: currentPath === '/disaster-management',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    },
    {
      label: 'Air quality tab', path: '/air-quality', active: currentPath === '/air-quality',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
      )
    },
    {
      label: 'Website info panel', path: '/website-info', active: currentPath === '/website-info',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
    }
  );

  return (
    <motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
      style={{
        ...glassBase,
        position: 'fixed',
        left: '16px',
        top: top,
        transform: 'translateY(-50%)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 8px',
        borderRadius: '999px',
        width: '58px',
      }}
    >
      {items.map((item, i) => (
        <motion.button
          key={item.label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.3 + i * 0.06 }}
          whileHover={{
            scale: 1.12,
            boxShadow: [
              'inset 0 1.5px 0 0 rgba(234,155,122,0.85)',
              'inset 0 -1px 0 0 rgba(3,47,12,0.18)',
              '0 4px 18px rgba(234,155,122,0.25)',
            ].join(', '),
          }}
          whileTap={{ scale: 0.91 }}
          onClick={() => navigate(item.path)}
          title={item.label}
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            borderRadius: '999px',
            background: item.active
              ? 'radial-gradient(ellipse 90% 90% at 38% 28%, rgba(234,155,122,0.55) 0%, rgba(234,155,122,0.28) 42%, rgba(196,98,58,0.14) 70%, rgba(3,47,12,0.08) 100%)'
              : 'radial-gradient(ellipse 90% 90% at 38% 28%, rgba(255,255,255,0.08) 0%, rgba(3,47,12,0.10) 55%, rgba(3,47,12,0.06) 100%)',
            border: item.active
              ? '1px solid rgba(234,155,122,0.55)'
              : '1px solid rgba(234,155,122,0.18)',
            boxShadow: item.active
              ? [
                'inset 0 1.5px 0 0 rgba(234,155,122,0.80)',
                'inset 0 -1px 0 0 rgba(3,47,12,0.20)',
                '0 4px 20px rgba(234,155,122,0.22)',
              ].join(', ')
              : [
                'inset 0 1.5px 0 0 rgba(234,155,122,0.35)',
                'inset 0 -1px 0 0 rgba(3,47,12,0.12)',
              ].join(', '),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: item.active ? '#ea9b7a' : 'rgba(245,234,216,0.90)',
            backdropFilter: 'blur(12px) saturate(160%)',
            WebkitBackdropFilter: 'blur(12px) saturate(160%)',
            transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {item.icon}
        </motion.button>
      ))}
    </motion.aside>
  );
}

export default Sidebar;
