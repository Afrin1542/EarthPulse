import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  LayoutGrid,
  MapPin,
  Gauge,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  FileText,
  Sliders,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Leaf,
  Droplets,
  Trees,
  Building2,
  Thermometer,
} from 'lucide-react';
import {
  LocationData,
  ActiveTab,
  AnalysisResult,
  IndicatorData,
  IndicatorType,
} from './types';
import { dataService } from './services/dataService';
import { PRESET_LOCATIONS } from './services/demoDataProvider';
import { Navbar } from './components/Navbar';
import { NavigationDrawer } from './components/NavigationDrawer';
import { HomeHero } from './components/HomeHero';
import { CircularScoreGauge } from './components/CircularScoreGauge';
import { ScoreBreakdownBars } from './components/ScoreBreakdownBars';
import { CalculationExplainer } from './components/CalculationExplainer';
import { IndicatorCard } from './components/IndicatorCard';
import { TrendChart } from './components/TrendChart';
import { HotspotInspector } from './components/HotspotInspector';
import { ReportView } from './components/ReportView';
import { LocationSearch } from './components/LocationSearch';
import { SettingsModal } from './components/SettingsModal';
import { MapView } from './components/MapView';
import { formatLocationDisplay, formatCoordinates } from './utils/formatters';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData>(() => dataService.getLocation());
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeRequestIdRef = useRef(0);

  // Initial data load on mount
  useEffect(() => {
    loadAnalysis(false, currentLocation);
  }, []);

  const loadAnalysis = async (forceRefresh = false, locationOverride?: LocationData) => {
    const targetLoc = locationOverride || currentLocation;
    const reqId = ++activeRequestIdRef.current;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const result = await dataService.getAnalysis(forceRefresh, targetLoc);
      
      if (reqId === activeRequestIdRef.current) {
        setAnalysis(result);
      }
    } catch (err: any) {
      if (reqId === activeRequestIdRef.current) {
        console.error('Failed to load analysis:', err);
        setErrorMessage(
          err.message || 'Unable to retrieve environmental satellite analysis.'
        );
      }
    } finally {
      if (reqId === activeRequestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalysis(true, currentLocation);
  };

  const handleSelectLocation = async (loc: LocationData) => {
    setCurrentLocation(loc);
    dataService.setLocation(loc);
    await loadAnalysis(true, loc);
  };

  const handleMapCoordinatePick = async (lat: number, lng: number) => {
    const coordsStr = formatCoordinates(lat, lng);

    let placeName = `Point (${coordsStr})`;
    let fullAddr = `Selected Target: ${coordsStr}`;
    let region = '';
    let country = '';

    try {
      const res = await fetch(`/api/locations/reverse?lat=${lat}&lng=${lng}`);
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
      console.warn('Reverse geocode error:', e);
    }

    const newLoc: LocationData = {
      id: `coord-${Date.now()}`,
      name: placeName,
      formattedAddress: fullAddr,
      latitude: lat,
      longitude: lng,
      radiusKm: 5,
      region,
      country,
      tag: 'Map Selected Target',
      narrative: `Geographic location identified as ${placeName} (${coordsStr}).`,
    };

    handleSelectLocation(newLoc);
  };

  const handleAnalyzeCurrentLocation = async () => {
    setActiveTab('dashboard');
    await loadAnalysis(true, currentLocation);
  };

  const isDemo = dataService.getProviderType() === 'demo';

  const INDICATOR_ICONS: Record<IndicatorType, React.ElementType> = {
    vegetation: Leaf,
    water: Droplets,
    landUse: Trees,
    builtUp: Building2,
    temperature: Thermometer,
  };

  return (
    <div className="min-h-screen bg-[#020B12] text-[#F1F7F5] flex flex-col selection:bg-[#00E5A0]/20 selection:text-[#00E5A0]">
      
      {/* Top Sticky Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDemo={isDemo}
        currentLocation={currentLocation}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* Slide-in Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        currentLocation={currentLocation}
        isDemo={isDemo}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={() => loadAnalysis(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* Loading Spinner State */}
        {isLoading && !analysis && (
          <div className="w-full h-80 flex flex-col items-center justify-center space-y-3">
            <div className="relative w-10 h-10">
              <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#00E5A0] animate-spin" />
            </div>
            <p className="text-xs font-mono text-[#8FA6AE]">
              Acquiring multi-spectral satellite telemetry...
            </p>
          </div>
        )}

        {/* Error Alert State */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-[#FF5C5C]/10 border border-[#FF5C5C]/30 flex items-start gap-3 text-xs text-[#FF5C5C]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Observation Error</div>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <HomeHero
            onSelectLocation={handleSelectLocation}
            onNavigateTab={(tab) => {
              if (tab === 'settings') setIsSettingsOpen(true);
              else setActiveTab(tab);
            }}
            isDemo={isDemo}
            analysis={analysis}
            currentLocation={currentLocation}
          />
        )}

        {/* TAB 2: DASHBOARD */}
        {activeTab === 'dashboard' && analysis && (
          <div className="w-full space-y-10 sm:space-y-12 animate-in fade-in duration-300">
            
            {/* ================================================== */}
            {/* 1. LOCATION HEADER */}
            {/* ================================================== */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono tracking-widest text-[#00E5A0] uppercase font-semibold">
                    ENVIRONMENTAL INTELLIGENCE
                  </span>
                  <span className="text-xs font-mono text-[#8FA6AE]">
                    • {analysis.analysisPeriod} • {analysis.analysisRadiusKm} km Radius
                  </span>
                </div>
                <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#F1F7F5] tracking-tight">
                  {formatLocationDisplay(analysis.location.name, analysis.location.latitude, analysis.location.longitude)}
                </h1>
                <p className="text-xs sm:text-sm text-[#8FA6AE]">
                  {analysis.location.formattedAddress}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  id="dashboard-change-loc-btn"
                  onClick={() => setActiveTab('location')}
                  className="px-4 py-2 rounded-xl bg-[#0A1B27] hover:bg-[#0E2435] border border-white/10 hover:border-[#00E5A0]/40 text-xs font-medium text-[#F1F7F5] transition-all flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#00E5A0]" />
                  Change Location
                </button>
              </div>
            </div>

            {/* ================================================== */}
            {/* 2. HERO: ENVIRONMENTAL HEALTH SCORE */}
            {/* ================================================== */}
            <section className="bg-[#0A1B27] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-1">
                <div className="text-[11px] font-mono tracking-widest text-[#8FA6AE] uppercase font-semibold">
                  ENVIRONMENTAL HEALTH SCORE
                </div>
                <div className="text-xs text-[#8FA6AE]">
                  Normalized composite index across five multi-spectral satellite observations
                </div>
              </div>

              {/* Clean Semicircular Gauge & Hero Score */}
              <CircularScoreGauge
                score={analysis.score.overallScore}
                statusBand={analysis.score.statusBand}
                statusColor={analysis.score.statusColor}
                showSubtitle={false}
              />

              {/* Score Trajectory & Short Interpretation */}
              <div className="pt-2 max-w-xl mx-auto space-y-3 text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#06131D] border border-white/10 text-xs font-mono">
                  {analysis.trends.deltaOverallScore > 0 ? (
                    <span className="text-[#00E5A0] flex items-center gap-1 font-semibold">
                      <TrendingUp className="w-3.5 h-3.5" /> +{analysis.trends.deltaOverallScore} pts
                    </span>
                  ) : analysis.trends.deltaOverallScore < 0 ? (
                    <span className="text-[#FF5C5C] flex items-center gap-1 font-semibold">
                      <TrendingDown className="w-3.5 h-3.5" /> {analysis.trends.deltaOverallScore} pts
                    </span>
                  ) : (
                    <span className="text-[#8FA6AE] flex items-center gap-1 font-semibold">
                      <Minus className="w-3.5 h-3.5" /> 0 pts
                    </span>
                  )}
                  <span className="text-[#8FA6AE]">•</span>
                  <span className="text-[#F1F7F5] font-medium">
                    {analysis.trends.direction} Trajectory
                  </span>
                </div>

                <p className="text-sm text-[#F1F7F5] font-normal leading-relaxed">
                  {analysis.trends.deltaOverallScore < 0
                    ? 'Environmental conditions are declining compared with the baseline observation window.'
                    : analysis.trends.deltaOverallScore > 0
                    ? 'Environmental conditions are improving with steady ecological recovery.'
                    : 'Environmental conditions have remained stable across the recent observation window.'}
                </p>
              </div>

              {/* Five Indicator Contribution Weights */}
              <ScoreBreakdownBars
                scoreData={analysis.score}
                onIndicatorClick={() => setActiveTab('indicators')}
              />
            </section>

            {/* ================================================== */}
            {/* 3. WHAT'S DRIVING THE SCORE */}
            {/* ================================================== */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-lg sm:text-xl text-[#F1F7F5] tracking-tight">
                    What's Driving the Score
                  </h2>
                  <p className="text-xs text-[#8FA6AE]">
                    The five primary signals determining overall environmental health.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('indicators')}
                  className="text-xs text-[#00E5A0] hover:underline font-mono hidden sm:inline-flex items-center gap-1"
                >
                  <span>Detailed Indicators</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(Object.values(analysis.indicators) as IndicatorData[]).map((ind) => {
                  const Icon = INDICATOR_ICONS[ind.key] || Leaf;
                  const isImproving = ind.direction === 'Improving';
                  const isDeclining = ind.direction === 'Declining';

                  return (
                    <div
                      key={`card-${ind.key}`}
                      onClick={() => setActiveTab('indicators')}
                      className="p-4 rounded-xl bg-[#0A1B27] border border-white/10 hover:border-[#00E5A0]/40 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${ind.color}15`, color: ind.color }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-heading font-semibold text-sm text-[#F1F7F5] group-hover:text-[#00E5A0] transition-colors">
                              {ind.name}
                            </div>
                            <span className="text-[10px] font-mono text-[#8FA6AE]">
                              {ind.code}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-heading font-bold text-xl text-[#F1F7F5]">
                            {ind.score}
                          </div>
                          <div
                            className={`flex items-center justify-end gap-0.5 text-[11px] font-mono font-medium ${
                              isImproving
                                ? 'text-[#00E5A0]'
                                : isDeclining
                                ? 'text-[#FF5C5C]'
                                : 'text-[#8FA6AE]'
                            }`}
                          >
                            {isImproving && <TrendingUp className="w-3 h-3" />}
                            {isDeclining && <TrendingDown className="w-3 h-3" />}
                            {!isImproving && !isDeclining && <Minus className="w-3 h-3" />}
                            <span>{ind.direction}</span>
                          </div>
                        </div>
                      </div>

                      {/* 1 concise interpretation sentence */}
                      <p className="text-xs text-[#8FA6AE] leading-relaxed line-clamp-2">
                        {ind.interpretation}
                      </p>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-[#8FA6AE]">
                        <span>Observed: {ind.rawValue}</span>
                        <span className="text-[#00C9D9] group-hover:underline">Details →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ================================================== */}
            {/* 4. MAP: SPATIAL EVIDENCE */}
            {/* ================================================== */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-lg sm:text-xl text-[#F1F7F5] tracking-tight">
                    Spatial Evidence & Hotspots
                  </h2>
                  <p className="text-xs text-[#8FA6AE]">
                    Georeferenced buffer analysis at {analysis.analysisRadiusKm} km observation radius.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('hotspots')}
                  className="text-xs text-[#00E5A0] hover:underline font-mono hidden sm:inline-flex items-center gap-1"
                >
                  <span>Hotspot Triage</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Large, Prominent Map Container */}
              <div className="bg-[#0A1B27] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <MapView
                  location={analysis.location}
                  hotspots={analysis.hotspots.zones}
                  radiusKm={analysis.analysisRadiusKm}
                  onSelectCoordinates={handleMapCoordinatePick}
                  height="420px"
                />
              </div>
            </section>

            {/* ================================================== */}
            {/* 5. HISTORICAL ENVIRONMENTAL TRENDS SUMMARY */}
            {/* ================================================== */}
            <section className="p-6 rounded-2xl bg-[#0A1B27] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#00E5A0]" />
                  <h2 className="font-heading font-bold text-base sm:text-lg text-[#F1F7F5]">
                    Historical Environmental Trend
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab('trends')}
                  className="text-xs font-mono text-[#00E5A0] hover:underline flex items-center gap-1"
                >
                  <span>View Trend Analysis</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-[#06131D] border border-white/[0.06] space-y-1">
                  <span className="text-[#8FA6AE] block text-[10px]">Score Shift</span>
                  <span className="text-[#00E5A0] font-semibold text-sm">
                    {analysis.trends.deltaOverallScore > 0 ? `+${analysis.trends.deltaOverallScore}` : analysis.trends.deltaOverallScore} pts
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#06131D] border border-white/[0.06] space-y-1">
                  <span className="text-[#8FA6AE] block text-[10px]">Trajectory</span>
                  <span className="text-[#F1F7F5] font-semibold text-sm">{analysis.trends.direction}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#06131D] border border-white/[0.06] space-y-1">
                  <span className="text-[#8FA6AE] block text-[10px]">Historical Low</span>
                  <span className="text-[#FF5C5C] font-semibold text-sm">
                    {Math.min(...analysis.trends.points.map((p) => p.overallScore))}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#06131D] border border-white/[0.06] space-y-1">
                  <span className="text-[#8FA6AE] block text-[10px]">Historical High</span>
                  <span className="text-[#00E5A0] font-semibold text-sm">
                    {Math.max(...analysis.trends.points.map((p) => p.overallScore))}
                  </span>
                </div>
              </div>
            </section>

            {/* ================================================== */}
            {/* 6. HOTSPOTS SUMMARY */}
            {/* ================================================== */}
            <section className="p-6 rounded-2xl bg-[#0A1B27] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#FF8533]" />
                  <h2 className="font-heading font-bold text-base sm:text-lg text-[#F1F7F5]">
                    Multi-Stress Hotspots
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab('hotspots')}
                  className="text-xs font-mono text-[#00E5A0] hover:underline flex items-center gap-1"
                >
                  <span>Inspect all {analysis.hotspots.totalMonitored} zones</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#06131D] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-sm text-[#F1F7F5]">
                      Priority: {analysis.hotspots.topPriority?.name || 'Zone Alpha'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF5C5C]/15 text-[#FF5C5C] border border-[#FF5C5C]/30 font-semibold">
                      {analysis.hotspots.topPriority?.severity || 'High'} Severity
                    </span>
                  </div>
                  <p className="text-xs text-[#8FA6AE]">
                    Primary stress drivers: {(analysis.hotspots.topPriority?.primaryDrivers || ['Thermal Stress', 'Vegetation Loss']).join(', ')}
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('hotspots')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0A1B27] hover:bg-[#0E2435] border border-white/10 hover:border-[#00E5A0]/30 text-xs font-mono text-[#00E5A0] transition-colors self-start sm:self-auto"
                >
                  Inspect Zone →
                </button>
              </div>
            </section>

            {/* ================================================== */}
            {/* 7. TECHNICAL DETAILS & METHODOLOGY (COLLAPSED BY DEFAULT) */}
            {/* ================================================== */}
            <section className="pt-2">
              <CalculationExplainer
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </section>

          </div>
        )}

        {/* TAB 3: LOCATION */}
        {activeTab === 'location' && (
          <LocationSearch
            currentLocation={currentLocation}
            onSelectLocation={handleSelectLocation}
            onAnalyzeLocation={handleAnalyzeCurrentLocation}
          />
        )}

        {/* TAB 4: ENVIRONMENTAL SCORE */}
        {activeTab === 'score' && analysis && (
          <div className="w-full space-y-8 animate-in fade-in duration-300">
            <div className="border-b border-white/10 pb-4">
              <span className="text-[10px] font-mono tracking-wider text-[#00E5A0] uppercase font-semibold">
                SCORING ARCHITECTURE
              </span>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#F1F7F5] tracking-tight mt-1">
                Environmental Health Index
              </h2>
              <p className="text-xs text-[#8FA6AE] font-mono">
                {formatLocationDisplay(analysis.location.name, analysis.location.latitude, analysis.location.longitude)} • 5 km Spatial Buffer
              </p>
            </div>

            <div className="bg-[#0A1B27] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
              <CircularScoreGauge
                score={analysis.score.overallScore}
                statusBand={analysis.score.statusBand}
                statusColor={analysis.score.statusColor}
                showSubtitle={true}
              />

              <ScoreBreakdownBars
                scoreData={analysis.score}
                onIndicatorClick={() => setActiveTab('indicators')}
              />

              <CalculationExplainer
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </div>

            {/* Score History Trajectory Card */}
            <div className="bg-[#0A1B27] border border-white/10 rounded-2xl p-5 space-y-3">
              <h3 className="font-heading font-semibold text-[#F1F7F5] text-sm">
                Score Trajectory & Historical Extremes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#06131D] border border-white/[0.06] space-y-1">
                  <span className="text-[#8FA6AE] block text-[10px]">Score Shift</span>
                  <span className="text-[#00E5A0] font-semibold text-sm">
                    {analysis.trends.deltaOverallScore > 0 ? `+${analysis.trends.deltaOverallScore}` : analysis.trends.deltaOverallScore} pts
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#06131D] border border-white/[0.06] space-y-1">
                  <span className="text-[#8FA6AE] block text-[10px]">Trajectory</span>
                  <span className="text-[#F1F7F5] font-semibold text-sm">{analysis.trends.direction}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#06131D] border border-white/[0.06] space-y-1">
                  <span className="text-[#8FA6AE] block text-[10px]">Historical Low</span>
                  <span className="text-[#FF5C5C] font-semibold text-sm">
                    {Math.min(...analysis.trends.points.map((p) => p.overallScore))}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#06131D] border border-white/[0.06] space-y-1">
                  <span className="text-[#8FA6AE] block text-[10px]">Historical High</span>
                  <span className="text-[#00E5A0] font-semibold text-sm">
                    {Math.max(...analysis.trends.points.map((p) => p.overallScore))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: INDICATORS */}
        {activeTab === 'indicators' && analysis && (
          <div className="w-full space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-white/10 pb-4">
              <span className="text-[10px] font-mono tracking-wider text-[#00E5A0] uppercase font-semibold">
                SATELLITE SIGNALS
              </span>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#F1F7F5] tracking-tight mt-1">
                Five Environmental Indicators
              </h2>
              <p className="text-xs sm:text-sm text-[#8FA6AE]">
                Satellite-derived multi-spectral indices normalized into an understandable 0–100 environmental score.
              </p>
            </div>

            <div className="space-y-4">
              {(Object.values(analysis.indicators) as IndicatorData[]).map((indicator) => (
                <IndicatorCard
                  key={indicator.key}
                  indicator={indicator}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: TRENDS */}
        {activeTab === 'trends' && analysis && (
          <div className="w-full space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-white/10 pb-4">
              <span className="text-[10px] font-mono tracking-wider text-[#00E5A0] uppercase font-semibold">
                TEMPORAL TRAJECTORY
              </span>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#F1F7F5] tracking-tight mt-1">
                Historical Environmental Trend
              </h2>
              <p className="text-xs text-[#8FA6AE] font-mono">
                {formatLocationDisplay(analysis.location.name, analysis.location.latitude, analysis.location.longitude)} • Annual GEE observations (2021, 2023, 2025)
              </p>
            </div>

            <TrendChart
              trends={analysis.trends}
              locationName={analysis.location.name}
            />
          </div>
        )}

        {/* TAB 7: HOTSPOTS */}
        {activeTab === 'hotspots' && analysis && (
          <HotspotInspector
            hotspots={analysis.hotspots}
            location={analysis.location}
          />
        )}

        {/* TAB 8: REPORTS */}
        {activeTab === 'reports' && analysis && (
          <ReportView analysis={analysis} />
        )}

        {/* TAB 9: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="w-full space-y-6">
            <div className="border-b border-white/10 pb-4">
              <span className="text-[10px] font-mono tracking-wider text-[#00E5A0] uppercase font-semibold">
                SYSTEM CONFIGURATION
              </span>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#F1F7F5] tracking-tight mt-1">
                Data Providers & Indicators
              </h2>
            </div>
            
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-5 py-3 rounded-xl bg-[#00E5A0] text-[#020B12] font-semibold text-xs transition-colors hover:bg-[#00E5A0]/90"
            >
              Configure Parameters & GEE Backend
            </button>
          </div>
        )}

      </main>

      {/* Footer Notice */}
      <footer className="w-full border-t border-white/10 bg-[#020B12] py-6 text-center text-xs text-[#8FA6AE] no-print">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00E5A0]" />
            <span className="font-heading font-semibold text-[#F1F7F5]">EarthPulse</span>
            <span className="text-[#8FA6AE] font-mono text-[11px]">Environmental Intelligence</span>
          </div>

          <div className="text-[11px] font-mono text-[#8FA6AE]">
            Sentinel-2 MSI • Landsat 8/9 TIRS • Dynamic World 10m • Google Earth Engine
          </div>

          <div className="text-[11px] text-[#8FA6AE]">
            "Satellite intelligence for environmental clarity"
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
