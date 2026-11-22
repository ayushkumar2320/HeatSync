import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NavigationItem from './NavigationItem';
import NavigationGroup from './NavigationGroup';
import { NAV_GROUPS, INTELLIGENCE_GROUP, HOME_ROUTE } from './routes';

/**
 * NavigationRail — the desktop vertical navigation.
 *
 * States:
 *  - expanded (default): icons + labels, width 220px
 *  - collapsed: icons only, width 72px
 *
 * Features:
 *  - Framer Motion width animation
 *  - Active route indicator via layoutId
 *  - Hover tooltip when collapsed
 *  - Keyboard accessible (Tab, Enter, Space)
 *  - No excessive glow — clean scientific accent
 */
export default function NavigationRail({ collapsed, onToggleCollapse, theme = 'dark' }) {

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggleCollapse();
      }
    },
    [onToggleCollapse]
  );

  return (
    <motion.nav
      className={`hs-nav-rail${collapsed ? ' collapsed' : ''}`}
      animate={{ width: collapsed ? 72 : 220 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo area */}
      <div className="hs-nav-logo">
        <div className="hs-nav-logo-badge">
          <img
            src={theme === 'dark' ? '/logo-dark.jpeg' : '/logo-light.jpeg'}
            alt="HeatSync Logo"
            className="hs-nav-logo-img"
          />
          <span className="hs-nav-logo-glow" />
        </div>

        {!collapsed && (
          <motion.div
            className="hs-nav-logo-text"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.18 }}
          >
            <div className="hs-nav-brand-title">
              Heat<span className="hs-nav-brand-accent">Sync</span>
            </div>
            <div className="hs-nav-brand-sub">
              <span className="hs-nav-pulse-dot" />
              <span>DIGITAL TWIN · LIVE</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Home / Overview link */}
      <div className="hs-nav-home">
        <NavigationItem
          item={HOME_ROUTE}
          collapsed={collapsed}
          isTop={true}
        />
      </div>

      {/* Scrollable nav groups */}
      <div className="hs-nav-sections">
        {NAV_GROUPS.map((group) => (
          <NavigationGroup
            key={group.key}
            group={group}
            collapsed={collapsed}
            isTop={true}
          />
        ))}
      </div>

      {/* Intelligence section — separated at bottom */}
      <div className="hs-nav-secondary">
        <NavigationGroup
          group={INTELLIGENCE_GROUP}
          collapsed={collapsed}
          isTop={false}
        />
      </div>

      {/* Collapse toggle */}
      <button
        className="hs-nav-collapse-btn"
        onClick={onToggleCollapse}
        onKeyDown={handleKeyDown}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        tabIndex={0}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </motion.nav>
  );
}
