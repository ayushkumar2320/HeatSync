import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import NavigationGroup from './NavigationGroup';
import NavigationItem from './NavigationItem';
import { NAV_GROUPS, INTELLIGENCE_GROUP, HOME_ROUTE } from './routes';

/**
 * MobileNavigation — responsive bottom bar + slide-up sheet.
 *
 * Bottom bar shows 4 quick-access routes + a "More" trigger.
 * "More" opens a sheet with the full grouped navigation.
 * Closes on route change via useEffect watching location.
 */

/** Overview + first 3 from MONITOR for the bottom bar. */
const QUICK_ITEMS = [HOME_ROUTE, ...NAV_GROUPS[0].items.slice(0, 3)];

export default function MobileNavigation() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();

  // Close sheet on route change
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="hs-nav-bottom" role="navigation" aria-label="Mobile navigation">
        {QUICK_ITEMS.map((item) => {
          const Icon = Icons[item.icon] || Icons.Circle;
          return (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `hs-nav-bottom-item${isActive ? ' active' : ''}`
              }
              aria-label={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <button
          className="hs-nav-bottom-item"
          onClick={() => setSheetOpen(true)}
          aria-label="Open full navigation"
          aria-expanded={sheetOpen}
        >
          <Menu size={18} />
          <span>More</span>
        </button>
      </nav>

      {/* Sheet overlay */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              className="hs-nav-mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeSheet}
              aria-hidden="true"
            />

            <motion.div
              className="hs-nav-mobile-sheet"
              role="dialog"
              aria-label="Navigation menu"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <div className="hs-nav-mobile-header">
                <span className="hs-label">Navigation</span>
                <button
                  onClick={closeSheet}
                  aria-label="Close navigation"
                  className="hs-nav-mobile-close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="hs-nav-mobile-body">
                <div className="hs-nav-mobile-home">
                  <NavigationItem
                    item={HOME_ROUTE}
                    collapsed={false}
                    isTop={true}
                  />
                </div>
                {NAV_GROUPS.map((group) => (
                  <NavigationGroup
                    key={group.key}
                    group={group}
                    collapsed={false}
                    isTop={true}
                  />
                ))}
                <NavigationGroup
                  group={INTELLIGENCE_GROUP}
                  collapsed={false}
                  isTop={false}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
