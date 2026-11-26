/**
 * geoService.ts
 * Service for fetching and caching HeatX GIS layers
 */

const geoCache = new Map<string, any>();

export async function fetchGeoLayer(layerName: string): Promise<any> {
  if (geoCache.has(layerName)) {
    return geoCache.get(layerName);
  }

  const pathMap: Record<string, string> = {
    state: '/data/odisha_state.geojson',
    districts: '/data/odisha_districts.geojson',
    subdistricts: '/data/odisha_subdistricts.geojson',
    cdBlocks: '/data/odisha_cd_blocks.geojson',
    centroids: '/data/odisha_centroids.geojson',
    sampleGrid: '/data/sample_grid_cells.json',
  };

  const url = pathMap[layerName];
  if (!url) throw new Error(`Unknown GeoJSON layer: ${layerName}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.statusText}`);

  const data = await res.json();
  geoCache.set(layerName, data);
  return data;
}
