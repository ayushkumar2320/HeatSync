/**
 * gridAdapter.ts
 * 1-km Grid Cell Framework Adapter
 * Enforces: Operational ML predictions are CD BLOCK LEVEL.
 * Grid cell thermal prediction value = UNAVAILABLE / NULL until validated physical downscaling model exists.
 */

let cachedSampleGrid: any = null;

export async function fetchSampleGridCells(): Promise<any> {
  if (cachedSampleGrid) return cachedSampleGrid;
  try {
    const res = await fetch('/data/sample_grid_cells.json');
    if (res.ok) {
      cachedSampleGrid = await res.json();
      return cachedSampleGrid;
    }
  } catch (err) {
    console.warn('Could not load sample_grid_cells.json:', err);
  }
  return { type: 'FeatureCollection', features: [] };
}

/**
 * Generates or retrieves 1-km grid cells for a specified CD Block.
 * Bounded by the block's centroid/envelope.
 */
export async function getGridCellsForBlock(block: any): Promise<any> {
  const sampleFC = await fetchSampleGridCells();
  
  // Check if sample GeoJSON already has cells for this block
  const existing = sampleFC.features.filter(
    (f: any) => f.properties && f.properties.BLOCK_ID === block.block_id
  );
  if (existing.length > 0) {
    return { type: 'FeatureCollection', features: existing };
  }

  // Generate canonical 1-km tessellation framework around block envelope
  const features: any[] = [];
  if (!block || !block.lat || !block.lon) {
    return { type: 'FeatureCollection', features: [] };
  }

  // Approximate 1km = ~0.0090 degrees latitude, ~0.0095 degrees longitude in Odisha
  const stepLat = 0.0090;
  const stepLon = 0.0095;
  const radius = 3; // 7x7 grid around centroid for framework visualization

  for (let r = -radius; r <= radius; r++) {
    for (let c = -radius; c <= radius; c++) {
      const minLat = block.lat + r * stepLat;
      const maxLat = minLat + stepLat;
      const minLon = block.lon + c * stepLon;
      const maxLon = minLon + stepLon;

      const rowIdx = String(r + radius + 1).padStart(3, '0');
      const colIdx = String(c + radius + 1).padStart(3, '0');
      const gridId = `${block.block_id}_G_${rowIdx}_${colIdx}`;

      features.push({
        type: 'Feature',
        properties: {
          GRID_ID: gridId,
          BLOCK_ID: block.block_id,
          BLOCK_NAME: block.block_name,
          DISTRICT_ID: block.district_id,
          DISTRICT_NAME: block.district_name,
          CENTROID_LAT: roundCoord(minLat + stepLat / 2),
          CENTROID_LON: roundCoord(minLon + stepLon / 2),
          AREA_M2: 1000000,
          THERMAL_PREDICTION: null,
          PREDICTION_NOTE: 'Operational ML model predicts at CD Block level. Grid-level predictions pending spatial downscaling validation.',
          STATUS: 'FRAMEWORK_ONLY',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [roundCoord(minLon), roundCoord(minLat)],
            [roundCoord(maxLon), roundCoord(minLat)],
            [roundCoord(maxLon), roundCoord(maxLat)],
            [roundCoord(minLon), roundCoord(maxLat)],
            [roundCoord(minLon), roundCoord(minLat)],
          ]],
        },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

function roundCoord(val: number): number {
  return Math.round(val * 100000) / 100000;
}
