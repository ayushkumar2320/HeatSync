import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: 'OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-base',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-saturation': -0.3,
        'raster-brightness-min': 0.15,
        'raster-brightness-max': 0.88,
      },
    },
  ],
};

/**
 * SatelliteLayerViewer — large imagery viewer for satellite observation layers.
 *
 * Renders a single raster overlay image (from /overlays/*.png) on top of
 * an OSM base map using MapLibre. The image is georeferenced via bounds.
 *
 * Props:
 *   overlayMeta - overlay definition from overlays.json (url, bounds_wgs84, vmin, vmax, title, unit, source)
 *   opacity     - layer opacity 0–100 (default 85)
 *   layerKey    - unique key for the layer source/layer IDs
 *   showBase    - show OSM base under the overlay (default true)
 */
export default function SatelliteLayerViewer({
  overlayMeta,
  opacity = 85,
  layerKey = 'sat-layer',
  showBase = true,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Bootstrap map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: showBase ? OSM_STYLE : { version: 8, sources: {}, layers: [] },
      center: [85.8275, 20.2636],
      zoom: 12,
      maxPitch: 0,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 140, unit: 'metric' }), 'bottom-left');

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    map.on('load', () => setMapReady(true));

    mapRef.current = map;
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; setMapReady(false); };
  }, [showBase]);

  // Add/update overlay layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !overlayMeta?.url || !overlayMeta?.bounds_wgs84) return;

    const srcId = `sat-src-${layerKey}`;
    const layerId = `sat-layer-${layerKey}`;

    // Add source if missing
    if (!map.getSource(srcId)) {
      map.addSource(srcId, {
        type: 'image',
        url: overlayMeta.url,
        coordinates: overlayMeta.bounds_wgs84,
      });
    } else {
      map.getSource(srcId).setData(overlayMeta.url);
    }

    // Add layer if missing
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: srcId,
        paint: {
          'raster-opacity': opacity / 100,
          'raster-fade-duration': 0,
        },
      });
    } else {
      map.setPaintProperty(layerId, 'raster-opacity', opacity / 100);
    }

    // Fit to bounds
    const bounds = new maplibregl.LngLatBounds();
    overlayMeta.bounds_wgs84.forEach(([lng, lat]) => bounds.extend([lng, lat]));
    map.fitBounds(bounds, { padding: 40, duration: 800 });
  }, [mapReady, overlayMeta, opacity, layerKey]);

  // Cleanup on unmount or layer change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    return () => {
      const layerId = `sat-layer-${layerKey}`;
      const srcId = `sat-src-${layerKey}`;
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(srcId)) map.removeSource(srcId);
    };
  }, [layerKey]);

  return (
    <div className="sat-viewer">
      <div ref={containerRef} className="sat-viewer-map" />
    </div>
  );
}
