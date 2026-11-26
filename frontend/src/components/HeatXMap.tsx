import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getContinuousThermalColor, getThermalTierColor } from '../contracts/thermalRiskContract';
import { getGridCellsForBlock } from '../adapters/gridAdapter';
import type { CDBlockRecord } from '../types/heatx';

interface HeatXMapProps {
  date: string;
  blocksData: Record<string, CDBlockRecord>;
  selectedBlock: CDBlockRecord | null;
  onBlockSelect: (block: CDBlockRecord) => void;
  selectedGrid?: any;
  onGridSelect?: (grid: any) => void;
  filterDistrict?: string;
}

export default function HeatXMap({
  date,
  blocksData,
  selectedBlock,
  onBlockSelect,
  selectedGrid,
  onGridSelect,
  filterDistrict,
}: HeatXMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer refs
  const stateLayerRef = useRef<L.GeoJSON | null>(null);
  const districtsLayerRef = useRef<L.GeoJSON | null>(null);
  const subdistrictsLayerRef = useRef<L.GeoJSON | null>(null);
  const cdBlocksLayerRef = useRef<L.GeoJSON | null>(null);
  const gridLayerRef = useRef<L.GeoJSON | null>(null);

  const blocksDataRef = useRef(blocksData);
  blocksDataRef.current = blocksData;
  const onBlockSelectRef = useRef(onBlockSelect);
  onBlockSelectRef.current = onBlockSelect;

  // Layer Visibility state
  const [currentZoom, setCurrentZoom] = useState(7);
  const [zoomLevelLabel, setZoomLevelLabel] = useState('ODISHA VIEW');
  const [geoLoaded, setGeoLoaded] = useState(false);

  // User layer toggles
  const [visibleLayers, setVisibleLayers] = useState({
    state: true,
    districts: true,
    subdistricts: false,
    cdBlocks: true,
    grid: false,
  });

  const getZoomLabel = (z: number) => {
    if (z < 7.5) return 'ODISHA STATE VIEW (30 Districts)';
    if (z < 9.5) return 'DISTRICT VIEW (182 Sub-districts)';
    if (z < 11.5) return 'CD BLOCK VIEW (314 Community Blocks)';
    return '1-KM GRID VIEW (155,198 Framework Tessellation)';
  };

  // Initialize Leaflet Map (Zero External Tiles!)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;
    const abortController = new AbortController();

    // Strict Offline Vector Canvas: NO L.tileLayer call!
    const map = L.map(mapContainerRef.current, {
      attributionControl: false,
      zoomControl: false,
      minZoom: 6,
      maxZoom: 15,
      center: [20.5, 84.4],
      zoom: 7,
      maxBounds: [
        [17.0, 80.5], // South-West
        [23.5, 89.0], // North-East
      ],
    });

    map.on('zoomend', () => {
      if (!isMounted || mapInstanceRef.current !== map) return;
      const z = map.getZoom();
      setCurrentZoom(z);
      setZoomLevelLabel(getZoomLabel(z));
    });

    mapInstanceRef.current = map;

    async function loadLayer(layerName: string, url: string) {
      try {
        const res = await fetch(url, { signal: abortController.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return await res.json();
      } catch (err: any) {
        if (err.name === 'AbortError') return null;
        console.error('Failed loading HeatX GeoJSON layer:', {
          layer: layerName,
          source: url,
          error: err.message || err,
        });
        return null;
      }
    }

    async function loadGeoJSON() {
      try {
        const [stateRes, distRes, subRes, blockRes] = await Promise.all([
          loadLayer('odisha_state', '/data/odisha_state.geojson'),
          loadLayer('odisha_districts', '/data/odisha_districts.geojson'),
          loadLayer('odisha_subdistricts', '/data/odisha_subdistricts.geojson'),
          loadLayer('odisha_cd_blocks', '/data/odisha_cd_blocks.geojson'),
        ]);

        if (!isMounted || !mapInstanceRef.current || mapInstanceRef.current !== map) {
          return;
        }

        // 1. State Boundary
        if (stateRes) {
          stateLayerRef.current = L.geoJSON(stateRes, {
            style: {
              color: '#ea9b7a',
              weight: 2,
              opacity: 0.85,
              fillColor: 'transparent',
              fillOpacity: 0,
              dashArray: '4, 4',
            },
          });
          if (mapInstanceRef.current === map) {
            stateLayerRef.current.addTo(map);
            map.fitBounds(stateLayerRef.current.getBounds(), { padding: [20, 20] });
          }
        }

        // 2. 30 Districts Layer
        if (distRes) {
          districtsLayerRef.current = L.geoJSON(distRes, {
            style: {
              color: 'rgba(234, 155, 122, 0.40)',
              weight: 1.2,
              opacity: 0.75,
              fillColor: '#032f0c',
              fillOpacity: 0.25,
            },
            onEachFeature: (feature, layer) => {
              const name = feature.properties?.DISTRICT_NAME || 'District';
              layer.bindTooltip(`<strong>${name} District</strong>`, {
                sticky: true,
                className: 'heatx-tooltip',
              });
            },
          });
          if (mapInstanceRef.current === map) {
            districtsLayerRef.current.addTo(map);
          }
        }

        // 3. 182 Sub-districts Layer
        if (subRes) {
          subdistrictsLayerRef.current = L.geoJSON(subRes, {
            style: {
              color: 'rgba(245, 234, 216, 0.20)',
              weight: 0.8,
              opacity: 0.4,
              fillColor: 'transparent',
              fillOpacity: 0,
            },
            onEachFeature: (feature, layer) => {
              const name = feature.properties?.SUBDISTRICT_NAME || 'Tehsil';
              const dist = feature.properties?.DISTRICT_NAME || '';
              layer.bindTooltip(`Tehsil: <strong>${name}</strong> (${dist})`, {
                sticky: true,
                className: 'heatx-tooltip',
              });
            },
          });
        }

        // 4. 314 CD Blocks Layer (Canvas Renderer)
        const heatxCanvasRenderer = L.canvas({ padding: 0.5 });
        if (blockRes) {
          const blockGeoJSONOptions: L.GeoJSONOptions = {
            style: (feature) => {
              const bId = feature?.properties?.BLOCK_ID;
              const bData = blocksDataRef.current[bId];
              const thermalVal = bData?.thermal_value ?? bData?.heat_index ?? null;
              const fillColor = getContinuousThermalColor(thermalVal);

              return {
                color: 'rgba(255, 255, 255, 0.25)',
                weight: 0.8,
                opacity: 0.85,
                fillColor: fillColor,
                fillOpacity: 0.90,
                fill: true,
              };
            },
            onEachFeature: (feature, layer) => {
              const bId = feature?.properties?.BLOCK_ID;
              const bName = feature?.properties?.BLOCK_NAME;
              const distName = feature?.properties?.DISTRICT_NAME;

              layer.on({
                mouseover: (e) => {
                  const target = e.target;
                  target.setStyle({
                    weight: 2.5,
                    color: '#ffffff',
                    fillOpacity: 0.98,
                  });
                  target.bringToFront();
                },
                mouseout: (e) => {
                  if (cdBlocksLayerRef.current) {
                    cdBlocksLayerRef.current.resetStyle(e.target);
                  }
                },
                click: () => {
                  const bData = blocksDataRef.current[bId];
                  if (bData && onBlockSelectRef.current) {
                    onBlockSelectRef.current(bData);
                  }
                },
              });

              layer.bindTooltip(() => {
                const current = blocksDataRef.current[bId];
                if (!current) return `<strong>${bName}</strong> (${distName})`;
                const hiVal = current.heat_index !== null && current.heat_index !== undefined ? `${Number(current.heat_index).toFixed(1)}°C` : '—';
                const wVal = current.wbgt !== null && current.wbgt !== undefined ? `${Number(current.wbgt).toFixed(1)}°C` : '—';
                const statusColor = getThermalTierColor(current.thermal_stress_level);
                return `
                  <div style="font-family: 'Inter', sans-serif; padding: 2px;">
                    <div style="font-weight: 800; color: #f5ead8; font-size: 12px;">${current.block_name} (${current.district_name})</div>
                    <div style="font-size: 9px; color: #ea9b7a; margin-top: 2px;">ID: ${current.block_id} · ${current.data_status || 'OBSERVED'}</div>
                    <div style="margin-top: 4px; font-weight: 700; color: #ffffff; font-size: 11px;">
                      Air: ${current.temperature_max !== null && current.temperature_max !== undefined ? Number(current.temperature_max).toFixed(1) + '°C' : '—'} · 
                      HI: <span style="color: #f59e0b;">${hiVal}</span> · 
                      WBGT: <span>${wVal}</span>
                    </div>
                    <div style="font-size: 9px; color: rgba(245, 234, 216, 0.7); text-transform: uppercase; margin-top: 3px;">
                      Risk: <strong style="color: ${statusColor};">${current.thermal_stress_level}</strong>
                    </div>
                  </div>
                `;
              }, {
                sticky: true,
                className: 'heatx-tooltip',
              });
            },
          };
          // @ts-ignore — renderer is valid Leaflet GeoJSONOptions but missing from @types/leaflet
          blockGeoJSONOptions.renderer = heatxCanvasRenderer;
          cdBlocksLayerRef.current = L.geoJSON(blockRes, blockGeoJSONOptions);
          if (mapInstanceRef.current === map) {
            cdBlocksLayerRef.current.addTo(map);
          }
        }

        if (isMounted) {
          setGeoLoaded(true);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed loading HeatX GeoJSON layers:', err);
        }
      }
    }

    loadGeoJSON();

    return () => {
      isMounted = false;
      abortController.abort();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update CD Blocks Choropleth when date or data changes
  useEffect(() => {
    if (!cdBlocksLayerRef.current || !geoLoaded) return;

    cdBlocksLayerRef.current.eachLayer((layer: any) => {
      const bId = layer.feature?.properties?.BLOCK_ID;
      const bData = blocksData[bId];
      const isSelected = selectedBlock && selectedBlock.block_id === bId;
      const matchesDistrict = !filterDistrict || (bData && bData.district_name === filterDistrict);

      if (bData) {
        const thermalVal = bData.thermal_value ?? bData.heat_index ?? null;
        const fillColor = getContinuousThermalColor(thermalVal);
        layer.setStyle({
          fillColor: fillColor,
          fillOpacity: matchesDistrict ? (isSelected ? 0.98 : 0.90) : 0.12,
          color: isSelected ? '#ea9b7a' : (matchesDistrict ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)'),
          weight: isSelected ? 3 : (matchesDistrict ? 0.8 : 0.4),
        });
        if (isSelected) {
          layer.bringToFront();
        }
      }
    });
  }, [date, blocksData, selectedBlock, filterDistrict, geoLoaded]);

  // Handle 1-km Grid Layer when a block is selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let isGridMounted = true;

    if (gridLayerRef.current) {
      if (map.hasLayer(gridLayerRef.current)) {
        map.removeLayer(gridLayerRef.current);
      }
      gridLayerRef.current = null;
    }

    if (selectedBlock && visibleLayers.grid) {
      getGridCellsForBlock(selectedBlock).then((gridFC: any) => {
        if (!isGridMounted || !mapInstanceRef.current || mapInstanceRef.current !== map || !gridFC?.features?.length) {
          return;
        }

        gridLayerRef.current = L.geoJSON(gridFC, {
          style: (feat: any) => ({
            color: feat.properties.GRID_ID === selectedGrid?.GRID_ID ? '#ffffff' : '#c084fc',
            weight: feat.properties.GRID_ID === selectedGrid?.GRID_ID ? 2 : 1,
            fillColor: '#a855f7',
            fillOpacity: feat.properties.GRID_ID === selectedGrid?.GRID_ID ? 0.35 : 0.08,
            dashArray: '3, 3',
          }),
          onEachFeature: (feat: any, layer: any) => {
            layer.on('click', (e: any) => {
              L.DomEvent.stopPropagation(e);
              if (onGridSelect) onGridSelect(feat.properties);
            });
            layer.bindTooltip(`
              <div style="font-family: monospace; font-size: 11px;">
                <div><strong>${feat.properties.GRID_ID}</strong></div>
                <div style="color: rgba(255,255,255,0.7)">Parent: ${feat.properties.BLOCK_NAME}</div>
                <div style="color: #ef4444; margin-top: 2px">ML Value: UNAVAILABLE (Framework Only)</div>
              </div>
            `, { sticky: true, className: 'heatx-tooltip' });
          },
        });

        if (isGridMounted && mapInstanceRef.current === map) {
          gridLayerRef.current.addTo(map);
          map.fitBounds(gridLayerRef.current.getBounds(), { padding: [30, 30], maxZoom: 13 });
        }
      }).catch((err: any) => {
        if (isGridMounted) {
          console.warn('Could not load grid cells for block:', err);
        }
      });
    }

    return () => {
      isGridMounted = false;
    };
  }, [selectedBlock, visibleLayers.grid, selectedGrid, onGridSelect]);

  // Handle Layer Visibility Toggles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geoLoaded) return;

    if (stateLayerRef.current) {
      if (visibleLayers.state && !map.hasLayer(stateLayerRef.current)) map.addLayer(stateLayerRef.current);
      else if (!visibleLayers.state && map.hasLayer(stateLayerRef.current)) map.removeLayer(stateLayerRef.current);
    }
    if (districtsLayerRef.current) {
      if (visibleLayers.districts && !map.hasLayer(districtsLayerRef.current)) map.addLayer(districtsLayerRef.current);
      else if (!visibleLayers.districts && map.hasLayer(districtsLayerRef.current)) map.removeLayer(districtsLayerRef.current);
    }
    if (subdistrictsLayerRef.current) {
      if (visibleLayers.subdistricts && !map.hasLayer(subdistrictsLayerRef.current)) map.addLayer(subdistrictsLayerRef.current);
      else if (!visibleLayers.subdistricts && map.hasLayer(subdistrictsLayerRef.current)) map.removeLayer(subdistrictsLayerRef.current);
    }
    if (cdBlocksLayerRef.current) {
      if (visibleLayers.cdBlocks && !map.hasLayer(cdBlocksLayerRef.current)) map.addLayer(cdBlocksLayerRef.current);
      else if (!visibleLayers.cdBlocks && map.hasLayer(cdBlocksLayerRef.current)) map.removeLayer(cdBlocksLayerRef.current);
    }
  }, [visibleLayers, geoLoaded]);

  const handleResetZoom = useCallback(() => {
    if (mapInstanceRef.current && stateLayerRef.current) {
      mapInstanceRef.current.fitBounds(stateLayerRef.current.getBounds(), { padding: [20, 20] });
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }}>
      {/* ── Vector Map Canvas ── */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '480px',
          background: '#021a07',
        }}
      />

      {/* ── Top-Left: Zoom & Spatial Level Indicator ── */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 400,
          background: 'rgba(2, 26, 7, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(234, 155, 122, 0.28)',
          borderRadius: 12,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        <span style={{ fontSize: '14px' }}>📍</span>
        <div>
          <div style={{ fontSize: '9px', color: '#ea9b7a', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Spatial Resolution (Zoom {Math.round(currentZoom)})
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#f5ead8' }}>
            {zoomLevelLabel}
          </div>
        </div>

        <button
          onClick={handleResetZoom}
          style={{
            padding: '4px 10px',
            fontSize: '10px',
            fontWeight: 600,
            borderRadius: 6,
            background: 'rgba(234, 155, 122, 0.15)',
            border: '1px solid rgba(234, 155, 122, 0.35)',
            color: '#ea9b7a',
            cursor: 'pointer',
            marginLeft: 6,
          }}
          title="Reset to full Odisha boundary"
        >
          Reset View
        </button>
      </div>

      {/* ── Top-Right: GIS Layer Toggles ── */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 400,
          background: 'rgba(2, 26, 7, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(234, 155, 122, 0.28)',
          borderRadius: 12,
          padding: '8px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontSize: '9px', color: '#ea9b7a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          HeatX Layers
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '10px' }}>
          {[
            { id: 'state' as const, label: 'Odisha Boundary', color: '#ea9b7a' },
            { id: 'districts' as const, label: '30 Districts', color: '#38bdf8' },
            { id: 'subdistricts' as const, label: '182 Tehsils', color: 'rgba(245,234,216,0.7)' },
            { id: 'cdBlocks' as const, label: '314 CD Blocks (Choropleth)', color: '#f59e0b' },
            { id: 'grid' as const, label: '1-km Grid Cells', color: '#c084fc' },
          ].map(l => (
            <label
              key={l.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: visibleLayers[l.id] ? '#f5ead8' : 'rgba(245, 234, 216, 0.45)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={visibleLayers[l.id]}
                onChange={e => setVisibleLayers({ ...visibleLayers, [l.id]: e.target.checked })}
                style={{ accentColor: l.color }}
              />
              <span style={{ fontWeight: visibleLayers[l.id] ? 700 : 400 }}>{l.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Bottom-Left: Non-Negotiable Offline Basemap Notice ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 14,
          zIndex: 400,
          background: 'rgba(2, 26, 7, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(234, 155, 122, 0.20)',
          borderRadius: 8,
          padding: '5px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '9px',
          color: 'rgba(245, 234, 216, 0.70)',
        }}
      >
        <span style={{ color: '#22c55e' }}>✔</span>
        <span>HeatX Offline Vector Engine · Zero External Basemap Tiles (No OSM / Carto)</span>
      </div>
    </div>
  );
}
