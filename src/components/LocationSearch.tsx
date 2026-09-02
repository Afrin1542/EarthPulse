import React, { useState, useEffect } from 'react';
import {
  Search,
  Crosshair,
  MapPin,
  Sparkles,
  ArrowRight,
  Flame,
  Droplets,
  Trees,
  Check,
  Compass,
  Layers,
} from 'lucide-react';
import { LocationData } from '../types';
import { PRESET_LOCATIONS } from '../services/demoDataProvider';
import { MapView } from './MapView';
import { formatLocationDisplay, formatCoordinates } from '../utils/formatters';

interface LocationSearchProps {
  currentLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  onAnalyzeLocation: () => void;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  currentLocation,
  onSelectLocation,
  onAnalyzeLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Search autocomplete with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/locations/search?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            setSearchResults(data.results);
          } else {
            // Local preset matching
            const matched = PRESET_LOCATIONS.filter(
              (p) =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.formattedAddress.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSearchResults(matched);
          }
        }
      } catch (err) {
        // Local fallback
        const matched = PRESET_LOCATIONS.filter((p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(matched);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Geolocation "Use my location"
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const coordsStr = formatCoordinates(latitude, longitude);

        let placeName = `Current Location (${coordsStr})`;
        let fullAddr = `Local GPS: ${coordsStr}`;
        let region = '';
        let country = '';

        try {
          const res = await fetch(`/api/locations/reverse?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const geo = await res.json();
            if (geo && geo.name) {
              placeName = geo.name;
              fullAddr = geo.formattedAddress || `${geo.name} (${coordsStr})`;
              region = geo.region || '';
              country = geo.country || '';
            }
          }
        } catch (e) {
          console.warn('GPS reverse geocode error:', e);
        }

        const myLoc: LocationData = {
          id: `gps-${Date.now()}`,
          name: placeName,
          formattedAddress: fullAddr,
          latitude,
          longitude,
          radiusKm: 5,
          region,
          country,
          tag: 'Live Browser Geolocation',
          narrative: `Real-time GPS coordinate for ${placeName} (${coordsStr}).`,
        };
        onSelectLocation(myLoc);
      },
      (err) => {
        setIsLocating(false);
        setGeoError('Could not retrieve geolocation. Try picking from the preset locations or map.');
      },
      { timeout: 10000 }
    );
  };

  // Click on map to pick coordinate with reverse geocoding
  const handleMapCoordinatePick = async (lat: number, lng: number) => {
    const coordsStr = formatCoordinates(lat, lng);

    const tempLoc: LocationData = {
      id: `coord-${Date.now()}`,
      name: `Point (${coordsStr})`,
      formattedAddress: `Selected Target: ${coordsStr}`,
      latitude: lat,
      longitude: lng,
      radiusKm: 5,
      tag: 'Custom Selected Coordinate',
      narrative: `User-specified geospatial coordinate (${coordsStr}) for 5 km multi-spectral analysis.`,
    };
    onSelectLocation(tempLoc);

    try {
      const res = await fetch(`/api/locations/reverse?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const geo = await res.json();
        if (geo && geo.name) {
          const resolvedLoc: LocationData = {
            id: geo.id || `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
            name: geo.name,
            formattedAddress: geo.formattedAddress || `${geo.name} (${coordsStr})`,
            latitude: lat,
            longitude: lng,
            radiusKm: 5,
            region: geo.region,
            country: geo.country,
            tag: geo.tag || 'Map Selected Target',
            narrative: `Geographic location identified as ${geo.name} (${coordsStr}).`,
          };
          onSelectLocation(resolvedLoc);
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    }
  };

  return (
    <div className="w-full space-y-4">
      
      {/* Header Info */}
      <div className="border-b border-white/[0.07] pb-3.5">
        <span className="text-[10px] font-mono tracking-wider text-[#00D6A3] uppercase font-semibold px-2 py-0.5 rounded bg-[#00D6A3]/10 border border-[#00D6A3]/20">
          SPATIAL QUERY
        </span>
        <h2 className="font-heading font-bold text-lg sm:text-xl text-white tracking-tight mt-1">
          Geographic Target Selection
        </h2>
        <p className="text-xs text-[#8EA2AD] mt-0.5">
          Select an AOI (Area of Interest) via search, curated regional datasets, or map coordinates.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#8EA2AD] absolute left-3.5 pointer-events-none" />
          <input
            id="location-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, coordinate, or ecological biome..."
            className="w-full bg-[#071522] border border-white/[0.08] focus:border-[#00D6A3]/60 focus:ring-1 focus:ring-[#00D6A3]/30 text-xs sm:text-sm text-white placeholder-[#8EA2AD]/60 pl-10 pr-9 py-2.5 rounded-lg transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 rounded text-[#8EA2AD] hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Autocomplete Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-[#071522] border border-white/[0.12] rounded-lg shadow-xl overflow-hidden divide-y divide-white/[0.05] animate-in fade-in duration-150">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => {
                  onSelectLocation(result);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-full text-left p-3 hover:bg-[#0B1D2B] transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#00D6A3] shrink-0" />
                  <div className="truncate">
                    <span className="text-xs font-semibold text-white group-hover:text-[#00D6A3] block truncate">
                      {result.name}
                    </span>
                    <span className="text-[11px] font-mono text-[#8EA2AD] block truncate">
                      {result.formattedAddress}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8EA2AD] group-hover:text-[#00D6A3] shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Geolocation Button */}
      <div className="flex items-center justify-between gap-3">
        <button
          id="btn-use-my-location"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-[#071522] hover:bg-[#0B1D2B] border border-white/[0.08] hover:border-[#00D6A3]/30 text-xs font-medium text-white transition-all"
        >
          <Crosshair className={`w-3.5 h-3.5 text-[#00D6A3] ${isLocating ? 'animate-spin' : ''}`} />
          {isLocating ? 'Acquiring GPS...' : 'Use current device coordinates'}
        </button>

        {geoError && (
          <span className="text-xs text-[#FF5C5C] truncate">{geoError}</span>
        )}
      </div>

      {/* Interactive Map */}
      <div className="space-y-2">
        <MapView
          location={currentLocation}
          radiusKm={currentLocation.radiusKm || 5}
          onSelectCoordinates={handleMapCoordinatePick}
          height="280px"
        />
      </div>

      {/* SELECTED AREA Summary & Primary Load Button */}
      <div className="bg-[#071522] border border-white/[0.08] rounded-xl p-4 sm:p-5 shadow-lg space-y-3.5">
        <div>
          <span className="text-[10px] font-mono tracking-wider text-[#00D6A3] uppercase font-semibold block">
            ACTIVE TARGET SECTOR
          </span>
          <h3 className="font-heading font-bold text-base sm:text-lg text-white tracking-tight mt-0.5">
            {formatLocationDisplay(currentLocation.name, currentLocation.latitude, currentLocation.longitude)}
          </h3>
          <p className="text-xs text-[#8EA2AD] font-mono">
            {currentLocation.formattedAddress}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#8EA2AD] border-y border-white/[0.06] py-2.5">
          <div>
            <span className="text-[#8EA2AD] block text-[10px] uppercase">Latitude</span>
            <span className="text-white font-medium">
              {Math.abs(currentLocation.latitude).toFixed(4)}°{currentLocation.latitude >= 0 ? 'N' : 'S'}
            </span>
          </div>
          <div>
            <span className="text-[#8EA2AD] block text-[10px] uppercase">Longitude</span>
            <span className="text-white font-medium">
              {Math.abs(currentLocation.longitude).toFixed(4)}°{currentLocation.longitude >= 0 ? 'E' : 'W'}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-[#8EA2AD] block text-[10px] uppercase">Observation Period</span>
            <span className="text-[#19C7D8] font-medium">2021 – Present (Sentinel-2 / Landsat telemetry)</span>
          </div>
        </div>

        <button
          id="btn-load-environmental-analysis"
          onClick={onAnalyzeLocation}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#00D6A3] hover:bg-[#00D6A3]/90 text-[#030B13] font-semibold text-xs sm:text-sm transition-all"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          Launch Environmental Intelligence Analysis
        </button>
      </div>

      {/* Example Locations Grid */}
      <div className="space-y-2 pt-1">
        <h4 className="text-[10px] font-mono font-medium text-[#8EA2AD] uppercase tracking-wider">
          CURATED REFERENCE SECTORS
        </h4>

        <div className="space-y-2">
          {PRESET_LOCATIONS.map((preset) => (
            <div
              key={preset.id}
              onClick={() => onSelectLocation(preset)}
              className="p-3 rounded-lg bg-[#071522]/60 border border-white/[0.06] hover:border-[#00D6A3]/30 hover:bg-[#071522] transition-all cursor-pointer group flex items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#0B1D2B] border border-white/[0.08] flex items-center justify-center text-[#00D6A3] group-hover:border-[#00D6A3]/30 shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-medium text-xs sm:text-sm text-white group-hover:text-[#00D6A3] transition-colors">
                      {preset.name}
                    </span>
                    {preset.country && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.05] text-[#8EA2AD]">
                        {preset.country}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8EA2AD] mt-0.5 line-clamp-1">
                    {preset.narrative}
                  </p>
                </div>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-[#8EA2AD] group-hover:text-[#00D6A3] group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
