import React from 'react';
import NavigationItem from './NavigationItem';

/**
 * NavigationGroup — renders a labeled column of NavigationItems.
 *
 * When the rail is collapsed, section labels are hidden.
 * Each group is a semantic <section> for accessibility.
 */
export default function NavigationGroup({ group, collapsed, isTop = true }) {
  return (
    <nav
      className="hs-nav-group"
      role="navigation"
      aria-label={group.label}
    >
      {!collapsed && (
        <span className="hs-nav-group-label" aria-hidden="true">
          {group.label}
        </span>
      )}

      <div className="hs-nav-group-items">
        {group.items.map((item) => (
          <NavigationItem
            key={item.key}
            item={item}
            collapsed={collapsed}
            isTop={isTop}
          />
        ))}
      </div>
    </nav>
  );
}
