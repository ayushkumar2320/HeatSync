/**
 * geographyContract.ts
 * Canonical HeatX Spatial Hierarchy & Identifiers
 * State (1) -> Districts (30) -> Sub-districts (182) -> CD Blocks (314) -> 1-km Grid (155,198)
 */

export interface GeoLevelMeta {
  level: number;
  key: string;
  name: string;
  count: number;
  idPrefix: string;
  description: string;
  isOperationalPredictionUnit?: boolean;
}

export const GEOGRAPHIC_LEVELS: Record<string, GeoLevelMeta> = {
  STATE: {
    level: 1,
    key: 'STATE_ID',
    name: 'State',
    count: 1,
    idPrefix: 'OD',
    description: 'Odisha State Boundary (Survey of India)',
  },
  DISTRICT: {
    level: 2,
    key: 'DISTRICT_ID',
    name: 'District',
    count: 30,
    idPrefix: 'OD_',
    description: '30 Administrative Districts of Odisha',
  },
  SUBDISTRICT: {
    level: 3,
    key: 'SUBDISTRICT_ID',
    name: 'Sub-district / Reference Tehsil',
    count: 182,
    idPrefix: 'OD_TEH_',
    description: '182 Reference Revenue Tehsils / Sub-districts',
  },
  BLOCK: {
    level: 4,
    key: 'BLOCK_ID',
    name: 'Community Development Block',
    count: 314,
    idPrefix: 'OD_',
    isOperationalPredictionUnit: true,
    description: '314 Operational CD Blocks (Primary ML & Biophysical Prediction Level)',
  },
  GRID: {
    level: 5,
    key: 'GRID_ID',
    name: '1-km Grid Cell',
    count: 155198,
    idPrefix: 'OD_*_G_',
    isOperationalPredictionUnit: false,
    description: '155,198 1-km UTM 45N Grid Cells (Framework & Feature Layer ONLY; ML predictions unavailable/null)',
  },
};

/**
 * Validates whether an entity has a valid stable HeatX geographic identifier.
 */
export function validateGeoId(type: string, id: unknown): boolean {
  if (!id || typeof id !== 'string') return false;
  switch (type) {
    case 'STATE_ID':
      return id === 'OD';
    case 'DISTRICT_ID':
      return id.startsWith('OD_');
    case 'SUBDISTRICT_ID':
      return id.startsWith('OD_TEH_');
    case 'BLOCK_ID':
      return id.startsWith('OD_') && id.includes('_');
    case 'GRID_ID':
      return id.includes('_G_');
    default:
      return false;
  }
}

export function isValidBlockId(id: unknown): boolean {
  return validateGeoId('BLOCK_ID', id);
}
