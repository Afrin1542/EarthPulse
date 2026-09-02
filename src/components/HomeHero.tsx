import React, { useState } from 'react';
import {
  Search,
  Crosshair,
  ArrowRight,
  ArrowDown,
  Leaf,
  Droplets,
  Trees,
  Building2,
  Thermometer,
  Satellite,
  Globe2,
  Layers,
} from 'lucide-react';
import { LocationData, ActiveTab, AnalysisResult } from '../types';
import { PRESET_LOCATIONS } from '../services/demoDataProvider';
import { MapView } from './MapView';

interface HomeHeroProps {
  onSelectLocation: (loc: LocationData) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  isDemo?: boolean;
  analysis?: AnalysisResult | null;
  currentLocation?: LocationData;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  onSelectLocation,
  onNavigateTab,
  analysis,
  currentLocation,
}) => {
  const [query, setQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      onNavigateTab('location');
      return;
    }
    const matched = PRESET_LOCATIONS.find(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.formattedAddress.toLowerCase().includes(query.toLowerCase()) ||
        (p.tag && p.tag.toLowerCase().includes(query.toLowerCase()))
    );
    if (matched) {
      onSelectLocation(matched);
      onNavigateTab('dashboard');
    } else {
      const loc: LocationData = {
        id: `search-${Date.now()}`,
        name: query.trim(),
        formattedAddress: `Spatial Query: ${query.trim()}`,
        latitude: 0,
        longitude: 0,
        radiusKm: 5,
        tag: 'Spatial Search',
      };
      onSelectLocation(loc);
      onNavigateTab('dashboard');
    }
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: LocationData = {
            id: `gps-${Date.now()}`,
            name: `Current Location (${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°)`,
            formattedAddress: `Live Browser Coordinates: ${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E`,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            radiusKm: 5,
            tag: 'Live Browser Geolocation',
          };
          onSelectLocation(loc);
          onNavigateTab('dashboard');
        },
        () => {
          onNavigateTab('location');
        }
      );
    } else {
      onNavigateTab('location');
    }
  };

  const scrollToExamples = () => {
    const el = document.getElementById('example-locations-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const INDICATORS = [
    {
      id: 'vegetation',
      name: 'Vegetation Cover',
      description: 'Measures vegetation condition using NDVI.',
      source: 'Sentinel-2 • 10m',
      icon: Leaf,
      color: '#00E5A0',
    },
    {
      id: 'water',
      name: 'Water-Body Condition',
      description: 'Measures surface-water condition using NDWI.',
      source: 'Sentinel-2 • 10m',
      icon: Droplets,
      color: '#00C9D9',
    },
    {
      id: 'landuse',
      name: 'Land-Use Change',
      description: 'Monitors land-cover transitions using Dynamic World.',
      source: 'AI LULC • 10m',
      icon: Trees,
      color: '#8B5CF6',
    },
    {
      id: 'builtup',
      name: 'Built-Up Control',
      description: 'Measures impervious surface footprint and built-up expansion using Dynamic World class 6 and Sentinel-2 NDBI.',
      source: 'Dynamic World • 10m',
      icon: Building2,
      color: '#FFB020',
    },
    {
      id: 'temperature',
      name: 'Surface Temperature',
      description: 'Observes thermal stress and Land Surface Temperature using Landsat 8/9 TIRS.',
      source: 'Landsat 8/9 • 30m',
      icon: Thermometer,
      color: '#FF5C5C',
    },
  ];

  return (
    <div className="w-full max-w-2xl lg:max-w-4xl mx-auto space-y-16 sm:space-y-24 py-4 sm:py-8 pb-20">
      
      {/* ================================================== */}
      {/* HERO SECTION */}
      {/* ================================================== */}
      <section className="space-y-8">
        
        {/* Environmental Intelligence Badge */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A1B27] border border-white/10 text-[11px] font-mono font-medium text-[#8FA6AE]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A0]" />
            <span className="tracking-wider uppercase">ENVIRONMENTAL INTELLIGENCE</span>
          </div>
        </div>

        {/* Large Confident Typography */}
        <div className="space-y-5">
          <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-[#F1F7F5] tracking-tight leading-[1.12]">
            Turning satellite data into{' '}
            <span className="text-[#00E5A0]">environmental clarity.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#8FA6AE] max-w-2xl leading-relaxed font-normal">
            EarthPulse transforms satellite-derived environmental observations into an understandable Environmental Health Score, trends, and environmental insights.
          </p>
        </div>

        {/* Primary & Secondary Actions */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <button
            id="hero-primary-analyze-btn"
            onClick={() => onNavigateTab('dashboard')}
            className="px-5 py-3 rounded-xl bg-[#00E5A0] hover:bg-[#00E5A0]/90 text-[#020B12] font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#00E5A0]/10"
          >
            <span>Analyze a location</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            id="hero-secondary-explore-btn"
            onClick={scrollToExamples}
            className="px-4 py-3 rounded-xl bg-[#0A1B27] hover:bg-[#0E2435] border border-white/10 text-[#8FA6AE] hover:text-[#F1F7F5] text-sm font-medium transition-all flex items-center gap-2"
          >
            <span>Explore EarthPulse</span>
            <ArrowDown className="w-4 h-4 text-[#8FA6AE]" />
          </button>
        </div>

        {/* Location Search Field & Geolocation */}
        <div className="space-y-3 pt-4">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-[#8FA6AE] absolute left-3.5 pointer-events-none" />
            <input
              id="hero-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city, region or landmark..."
              className="w-full bg-[#0A1B27] border border-white/10 focus:border-[#00E5A0]/60 focus:ring-1 focus:ring-[#00E5A0]/30 text-sm text-[#F1F7F5] placeholder-[#8FA6AE]/60 pl-10 pr-24 py-3.5 rounded-xl transition-all"
            />
            <button
              type="submit"
              id="hero-search-submit-btn"
              className="absolute right-1.5 px-3.5 py-2 rounded-lg bg-[#00E5A0] hover:bg-[#00E5A0]/90 text-[#020B12] font-semibold text-xs transition-colors"
            >
              Search
            </button>
          </form>

          <button
            type="button"
            id="hero-use-my-location-btn"
            onClick={handleUseMyLocation}
            className="inline-flex items-center gap-1.5 text-xs text-[#8FA6AE] hover:text-[#00E5A0] transition-colors py-0.5"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#00E5A0]" />
            <span>Use my location</span>
          </button>
        </div>

      </section>

      {/* ================================================== */}
      {/* SATELLITE EARTH OBSERVATION VISUALIZATION */}
      {/* ================================================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#8FA6AE] font-mono">
            <Satellite className="w-3.5 h-3.5 text-[#00E5A0]" />
            <span className="uppercase tracking-wider text-[11px] font-semibold">
              EARTH OBSERVATION TELEMETRY
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#00C9D9]">
            {analysis ? analysis.location.name : 'Target Observation Area'}
          </span>
        </div>

        <div className="bg-[#0A1B27] border border-white/10 rounded-2xl overflow-hidden shadow-xl relative">
          {analysis && analysis.location ? (
            <div className="relative">
              <MapView
                location={analysis.location}
                hotspots={analysis.hotspots.zones}
                radiusKm={analysis.analysisRadiusKm || 5}
                height="320px"
              />
              
              {/* Telemetry Footer Overlay */}
              <div className="px-4 py-2.5 bg-[#020B12]/80 backdrop-blur-sm border-t border-white/10 flex items-center justify-between text-xs font-mono text-[#8FA6AE]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] animate-pulse" />
                    <span>Optical + Thermal Bands Active</span>
                  </span>
                  <span className="hidden sm:inline text-white/20">|</span>
                  <span className="hidden sm:inline">
                    Coords: {analysis.location.latitude.toFixed(3)}°, {analysis.location.longitude.toFixed(3)}°
                  </span>
                </div>
                <button
                  onClick={() => onNavigateTab('dashboard')}
                  className="text-[#00E5A0] hover:underline font-sans text-xs flex items-center gap-1 font-medium"
                >
                  <span>Open Full Analysis</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Globe2 className="w-10 h-10 text-[#00E5A0]/60" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[#F1F7F5]">
                  Select a location to initialize satellite observation
                </div>
                <p className="text-xs text-[#8FA6AE] max-w-sm">
                  EarthPulse ingests multispectral imagery across Sentinel-2, Landsat, and Dynamic World to generate environmental health diagnostics.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================================================== */}
      {/* 6. "TRY AN EXAMPLE LOCATION" & THREE CARDS */}
      {/* ================================================== */}
      <section id="example-locations-section" className="space-y-5 pt-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono tracking-widest text-[#8FA6AE] uppercase font-semibold">
            TRY AN EXAMPLE LOCATION
          </div>
          <p className="text-xs sm:text-sm text-[#8FA6AE]">
            Explore satellite intelligence across contrasting environmental contexts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* CARD 1: BRAZIL */}
          <div
            id="example-card-brazil"
            onClick={() => {
              const loc = PRESET_LOCATIONS.find((p) => p.id === 'brazil-novo-progresso') || PRESET_LOCATIONS[3];
              onSelectLocation(loc);
              onNavigateTab('dashboard');
            }}
            className="p-5 rounded-2xl bg-[#0A1B27] border border-white/10 hover:border-[#00E5A0]/40 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-medium text-[#8FA6AE] tracking-wider uppercase">
                  BRAZIL
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#FF8533]/15 text-[#FF8533] border border-[#FF8533]/30">
                  DEFORESTATION
                </span>
              </div>

              <div className="font-heading font-semibold text-base text-[#F1F7F5] group-hover:text-[#00E5A0] transition-colors">
                Novo Progresso, Pará
              </div>

              <p className="text-xs text-[#8FA6AE] leading-relaxed">
                Vegetation decline and increasing land-cover pressure.
              </p>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1 text-xs font-semibold text-[#00E5A0] group-hover:translate-x-0.5 transition-transform">
              <span>View analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* CARD 2: UNITED STATES */}
          <div
            id="example-card-usa"
            onClick={() => {
              const loc = PRESET_LOCATIONS.find((p) => p.id === 'usa-phoenix') || PRESET_LOCATIONS[4];
              onSelectLocation(loc);
              onNavigateTab('dashboard');
            }}
            className="p-5 rounded-2xl bg-[#0A1B27] border border-white/10 hover:border-[#00E5A0]/40 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-medium text-[#8FA6AE] tracking-wider uppercase">
                  UNITED STATES
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#FF5C5C]/15 text-[#FF5C5C] border border-[#FF5C5C]/30">
                  URBAN HEAT
                </span>
              </div>

              <div className="font-heading font-semibold text-base text-[#F1F7F5] group-hover:text-[#00E5A0] transition-colors">
                Phoenix, Arizona
              </div>

              <p className="text-xs text-[#8FA6AE] leading-relaxed">
                Higher surface temperature and increasing built-up pressure.
              </p>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1 text-xs font-semibold text-[#00E5A0] group-hover:translate-x-0.5 transition-transform">
              <span>View analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* CARD 3: CHINA */}
          <div
            id="example-card-china"
            onClick={() => {
              const loc = PRESET_LOCATIONS.find((p) => p.id === 'china-loess-plateau') || PRESET_LOCATIONS[5];
              onSelectLocation(loc);
              onNavigateTab('dashboard');
            }}
            className="p-5 rounded-2xl bg-[#0A1B27] border border-white/10 hover:border-[#00E5A0]/40 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-medium text-[#8FA6AE] tracking-wider uppercase">
                  CHINA
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#00E5A0]/15 text-[#00E5A0] border border-[#00E5A0]/30">
                  RESTORATION
                </span>
              </div>

              <div className="font-heading font-semibold text-base text-[#F1F7F5] group-hover:text-[#00E5A0] transition-colors">
                Loess Plateau, Shaanxi
              </div>

              <p className="text-xs text-[#8FA6AE] leading-relaxed">
                Changing vegetation and land-use conditions.
              </p>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1 text-xs font-semibold text-[#00E5A0] group-hover:translate-x-0.5 transition-transform">
              <span>View analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>
      </section>

      {/* ================================================== */}
      {/* 7. "THE FIVE INDICATORS" */}
      {/* ================================================== */}
      <section className="space-y-5 pt-4">
        <div className="space-y-1">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#F1F7F5] tracking-tight">
            The Five Indicators
          </h2>
          <p className="text-xs sm:text-sm text-[#8FA6AE]">
            Satellite-derived signals used by EarthPulse to understand environmental conditions.
          </p>
        </div>

        <div className="space-y-3">
          {INDICATORS.map((ind) => {
            const Icon = ind.icon;
            return (
              <div
                key={ind.id}
                onClick={() => onNavigateTab('indicators')}
                className="p-4 rounded-2xl bg-[#0A1B27] border border-white/10 hover:border-[#00E5A0]/30 transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${ind.color}15`, color: ind.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-heading font-medium text-sm sm:text-base text-[#F1F7F5] group-hover:text-[#00E5A0] transition-colors">
                      {ind.name}
                    </div>
                    <p className="text-xs text-[#8FA6AE]">
                      {ind.description}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-[#8FA6AE] px-2 py-1 rounded bg-white/[0.04] border border-white/[0.05] hidden sm:block shrink-0">
                  {ind.source}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================================== */}
      {/* 8. "EARTHPULSE AT A GLANCE" SECTION */}
      {/* ================================================== */}
      <section className="pt-4">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0A1B27] border border-white/10">
          <div className="text-[11px] font-mono tracking-widest text-[#8FA6AE] uppercase font-semibold mb-6 text-center">
            EARTHPULSE AT A GLANCE
          </div>

          <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
            <div className="px-3">
              <div className="font-heading font-bold text-2xl sm:text-3xl text-[#00E5A0]">
                0–100
              </div>
              <div className="text-xs text-[#8FA6AE] mt-1.5 leading-snug">
                Environmental Health Score
              </div>
            </div>

            <div className="px-3">
              <div className="font-heading font-bold text-2xl sm:text-3xl text-[#00C9D9]">
                5 years
              </div>
              <div className="text-xs text-[#8FA6AE] mt-1.5 leading-snug">
                Historical analysis
              </div>
            </div>

            <div className="px-3">
              <div className="font-heading font-bold text-2xl sm:text-3xl text-[#FFB020]">
                4 levels
              </div>
              <div className="text-xs text-[#8FA6AE] mt-1.5 leading-snug">
                Hotspot severity
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* FOOTER */}
      {/* ================================================== */}
      <footer className="pt-4 text-center text-xs text-[#8FA6AE]/60 font-mono">
        EarthPulse • Multi-spectral Earth Observation Platform
      </footer>

    </div>
  );
};
