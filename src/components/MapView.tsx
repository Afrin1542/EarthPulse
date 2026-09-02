import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, MapPin, ZoomIn, ZoomOut, Crosshair, Sparkles, AlertTriangle, Flame } from 'lucide-react';
import { LocationData, HotspotZone, StatusBand } from '../types';
import { formatLocationDisplay } from '../utils/formatters';

interface MapViewProps {
  location: LocationData;
  hotspots?: HotspotZone[];
  radiusKm?: number;
  onSelectCoordinates?: (lat: number, lng: number) => void;
  onSelectHotspot?: (hotspot: HotspotZone) => void;
  height?: string;
  showLayerSelector?: boolean;
  activeLayerPreset?: 'all' | 'ndvi' | 'ndwi' | 'ndbi' | 'temperature' | 'hotspots';
  defaultShowHotspots?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  location,
  hotspots = [],
  radiusKm = 5,
  onSelectCoordinates,
  onSelectHotspot,
  height = '400px',
  showLayerSelector = true,
  activeLayerPreset = 'all',
  defaultShowHotspots = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const bufferCircleRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const hotspotLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<string>(activeLayerPreset);
  const [showHotspots, setShowHotspots] = useState<boolean>(defaultShowHotspots);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const { latitude: lat, longitude: lng } = location;

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    // Standard OpenStreetMap Tile Layer
    const tileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    );
    tileLayer.addTo(map);

    // Custom Glowing Center Icon
    const centerIcon = L.divIcon({
      className: 'earthpulse-center-pin',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="absolute w-7 h-7 rounded-full bg-[#00D6A3]/20 animate-pulse-slow"></div>
          <div class="w-3.5 h-3.5 rounded-full bg-[#00D6A3] border-2 border-white shadow-[0_0_10px_#00D6A3]"></div>
        </div>
      `,
      iconSize: [0, 0],
    });

    const marker = L.marker([lat, lng], { icon: centerIcon }).addTo(map);
    centerMarkerRef.current = marker;

    // 5 km Analysis Buffer Circle
    const bufferCircle = L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: '#00D6A3',
      weight: 1.5,
      opacity: 0.7,
      fillColor: '#00D6A3',
      fillOpacity: 0.05,
      dashArray: '4, 6',
    }).addTo(map);
    bufferCircleRef.current = bufferCircle;

    // Hotspot Layer Group
    const hotspotGroup = L.layerGroup().addTo(map);
    hotspotLayerGroupRef.current = hotspotGroup;

    // Click handler on map to select new area
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onSelectCoordinates) {
        onSelectCoordinates(e.latlng.lat, e.latlng.lng);
      }
    });

    mapInstanceRef.current = map;

    // Invalidate size after mounting to prevent 0-dimension blank map rendering
    const initTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // Observe container resizing to keep tiles aligned in dynamic iframe layouts
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(initTimer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location, radiusKm]);

  // Synchronize Hotspot Circles with showHotspots toggle state
  useEffect(() => {
    if (!hotspotLayerGroupRef.current) return;

    // Clear previous circles
    hotspotLayerGroupRef.current.clearLayers();

    // Only render hotspot circles when showHotspots === true
    if (showHotspots && hotspots.length > 0) {
      hotspots.forEach((spot) => {
        const color =
          spot.severityLevel === 'Critical'
            ? '#FF5C5C'
            : spot.severityLevel === 'High'
            ? '#FF8533'
            : spot.severityLevel === 'Moderate'
            ? '#FFB020'
            : '#00D6A3';

        const spotCircle = L.circle([spot.lat, spot.lng], {
          radius: spot.radiusMeters || 600,
          color: color,
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.25,
        });

        spotCircle.bindPopup(`
          <div style="font-family: inherit; min-width: 170px; padding: 2px;">
            <div style="font-weight: 700; font-size: 13px; color: #FFFFFF; margin-bottom: 2px;">${spot.name}</div>
            <div style="font-size: 11px; color: ${color}; font-weight: 600; margin-bottom: 6px;">
              Severity: ${spot.severityScore}/100 • ${spot.severityLevel}
            </div>
            <div style="font-size: 11px; color: #8EA2AD; line-height: 1.4; margin-bottom: 6px;">
              ${(spot.primaryDrivers || []).slice(0, 2).join(', ')}
            </div>
            <div style="font-size: 10px; color: #00D6A3; font-weight: 500;">
              ${spot.recommendedAction}
            </div>
          </div>
        `);

        spotCircle.on('click', () => {
          onSelectHotspot?.(spot);
        });

        spotCircle.addTo(hotspotLayerGroupRef.current!);
      });
    }
  }, [showHotspots, hotspots, onSelectHotspot]);

  // Recenter map on location change
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.latitude, location.longitude], 12, {
        animate: true,
      });
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-white/[0.08] bg-[#030B13] shadow-lg">
      {/* Top Banner Notice */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-lg bg-[#071522]/90 backdrop-blur-md border border-white/[0.08] text-xs font-medium text-[#F3F7F8] flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#00D6A3]" />
          <span>{formatLocationDisplay(location.name, location.latitude, location.longitude)} • {radiusKm} km Spatial Radius</span>
        </div>

        {onSelectCoordinates && (
          <div className="hidden sm:flex px-2.5 py-1.5 rounded-lg bg-[#071522]/80 backdrop-blur-md border border-white/[0.06] text-[11px] font-mono text-[#8EA2AD] items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-[#19C7D8]" />
            Click map to reposition
          </div>
        )}
      </div>

      {/* Map Control Buttons (Zoom & Recenter) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
        <button
          id="map-recenter-btn"
          onClick={handleRecenter}
          className="p-2 rounded-lg bg-[#071522]/90 backdrop-blur-md border border-white/[0.08] text-[#8EA2AD] hover:text-[#00D6A3] hover:bg-[#0B1D2B] transition-colors shadow-lg"
          title="Recenter Map"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
        <button
          id="map-zoom-in-btn"
          onClick={handleZoomIn}
          className="p-2 rounded-lg bg-[#071522]/90 backdrop-blur-md border border-white/[0.08] text-[#8EA2AD] hover:text-white hover:bg-[#0B1D2B] transition-colors shadow-lg"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          id="map-zoom-out-btn"
          onClick={handleZoomOut}
          className="p-2 rounded-lg bg-[#071522]/90 backdrop-blur-md border border-white/[0.08] text-[#8EA2AD] hover:text-white hover:bg-[#0B1D2B] transition-colors shadow-lg"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Layer Selector Bar */}
      {showLayerSelector && (
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1 bg-[#071522]/90 backdrop-blur-md border border-white/[0.08] p-1 rounded-lg shadow-lg pointer-events-auto overflow-x-auto max-w-full">
            <button
              id="layer-composite-btn"
              onClick={() => setActiveLayer('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                activeLayer === 'all'
                  ? 'bg-[#0B1D2B] text-[#00D6A3] border border-[#00D6A3]/30'
                  : 'text-[#8EA2AD] hover:text-white'
              }`}
            >
              Composite
            </button>

            {/* Hotspots Layer Toggle Button */}
            <button
              id="layer-hotspots-toggle-btn"
              onClick={() => setShowHotspots((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                showHotspots
                  ? 'bg-[#0B1D2B] text-[#FF8533] border border-[#FF8533]/40 shadow-sm font-semibold'
                  : 'text-[#8EA2AD] hover:text-white'
              }`}
              title={showHotspots ? 'Hide Hotspots Layer' : 'Show Hotspots Layer'}
            >
              <Flame className="w-3 h-3" />
              <span>Hotspots {showHotspots ? '(On)' : '(Off)'}</span>
            </button>

            {[
              { id: 'ndvi', label: 'NDVI (Veg)' },
              { id: 'ndwi', label: 'NDWI (Water)' },
              { id: 'temperature', label: 'LST (Thermal)' },
            ].map((layer) => (
              <button
                key={layer.id}
                onClick={() => setActiveLayer(layer.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  activeLayer === layer.id
                    ? 'bg-[#0B1D2B] text-[#00D6A3] border border-[#00D6A3]/30'
                    : 'text-[#8EA2AD] hover:text-white'
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#071522]/90 backdrop-blur-md border border-white/[0.08] text-[11px] font-mono text-[#8EA2AD] shadow-lg pointer-events-auto">
            <span>{location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E</span>
          </div>
        </div>
      )}

      {/* Leaflet Map DOM Container */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
    </div>
  );
};
