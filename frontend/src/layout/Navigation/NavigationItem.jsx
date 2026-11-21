import React, { forwardRef } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

/**
 * NavigationItem — a single navigation entry.
 *
 * Renders a React Router <NavLink> with:
 *  - animated active indicator (Framer Motion layoutId)
 *  - tooltip on hover when rail is collapsed
 *  - full keyboard accessibility (Tab, Enter, Space)
 *  - no excessive glow — subtle scientific accent only
 */
const NavigationItem = forwardRef(function NavigationItem(
  { item, collapsed, isTop },
  ref
) {
  const Icon = Icons[item.icon] || Icons.Circle;

  return (
    <NavLink
      ref={ref}
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `hs-nav-item${isActive ? ' active' : ''}`
      }
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      tabIndex={0}
    >
      {({ isActive }) => (
        <>
          <span className="hs-nav-item-icon">
            <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
          </span>

          {!collapsed && (
            <motion.span
              className="hs-nav-item-label"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
            >
              {item.label}
            </motion.span>
          )}

          {isActive && (
            <motion.div
              className="hs-nav-indicator"
              layoutId={isTop ? 'nav-indicator-top' : 'nav-indicator-intel'}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
});

export default NavigationItem;
