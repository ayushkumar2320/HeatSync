/**
 * Route configuration — single source of truth for all navigation and routing.
 * Groups match the MONITOR / OBSERVE / TWIN / DECIDE / INTELLIGENCE taxonomy.
 */

export const NAV_GROUPS = [
  {
    key: 'monitor',
    label: 'MONITOR',
    items: [
      { key: 'heatmap',   path: '/heatmap',   icon: 'Flame',        label: 'Heat Map',      page: () => import('../../pages/HeatMapPage') },
      { key: 'alerts',    path: '/alerts',    icon: 'ShieldAlert',  label: 'Alert Centre',  page: () => import('../../pages/AlertCentrePage') },
      { key: 'sandbox',   path: '/sandbox',   icon: 'Layers',       label: 'Urban Sandbox', page: () => import('../../pages/SandboxPage') },
      { key: 'forecast',  path: '/forecast',  icon: 'CloudSun',     label: 'Forecast',      page: () => import('../../pages/ForecastPage') },
    ],
  },
  {
    key: 'decide',
    label: 'DECIDE',
    items: [
      { key: 'planning',  path: '/planning',  icon: 'Building2',    label: 'City Planning',   page: () => import('../../pages/CityPlanningPage') },
      { key: 'routing',   path: '/routing',   icon: 'Route',        label: 'Thermal Routing', page: () => import('../../pages/RoutingPage') },
      { key: 'reports',   path: '/reports',   icon: 'FileText',     label: 'Reports',         page: () => import('../../pages/ReportsPage') },
    ],
  },
  {
    key: 'observe',
    label: 'OBSERVE',
    items: [
      { key: 'satellite', path: '/satellite', icon: 'Satellite',    label: 'Satellite',     page: () => import('../../pages/SatellitePage') },
      { key: 'drivers',   path: '/drivers',   icon: 'BarChart3',    label: 'Heat Drivers',  page: () => import('../../pages/DriversPage') },
    ],
  },
  {
    key: 'twin',
    label: 'TWIN',
    items: [
      { key: 'twin',      path: '/twin',       icon: 'Globe',        label: 'Digital Twin',  page: () => import('../../pages/TwinPage') },
    ],
  },
];

export const INTELLIGENCE_GROUP = {
  key: 'intelligence',
  label: 'INTELLIGENCE',
  items: [
    { key: 'ai', path: '/ai', icon: 'Bot', label: 'HEAT AI', page: () => import('../../pages/AICopilotPage') },
  ],
};

/** Overview is the landing / home route — outside any group. */
export const HOME_ROUTE = {
  key: 'overview',
  path: '/',
  icon: 'LayoutDashboard',
  label: 'Overview',
  page: () => import('../../pages/OverviewPage'),
};

/** Flat map of key → route config for quick lookup. */
export function buildRouteMap() {
  const map = {};
  map[HOME_ROUTE.key] = HOME_ROUTE;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      map[item.key] = item;
    }
  }
  for (const item of INTELLIGENCE_GROUP.items) {
    map[item.key] = item;
  }
  return map;
}
