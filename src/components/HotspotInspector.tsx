import React, { useState } from 'react';
import {
  Flame,
  Map as MapIcon,
  List,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Target,
  Layers,
} from 'lucide-react';
import { HotspotSummary, HotspotZone, LocationData } from '../types';
import { MapView } from './MapView';
import { formatLocationDisplay } from '../utils/formatters';

interface HotspotInspectorProps {
  hotspots: HotspotSummary;
  location: LocationData;
}

const FILTER_OPTIONS = [
  'All',
  'Vegetation Cover',
  'Water-Body Condition',
  'Land-Use Stability',
  'Built-Up Control',
  'Surface Temperature',
];

export const HotspotInspector: React.FC<HotspotInspectorProps> = ({
  hotspots,
  location,
}) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedZone, setSelectedZone] = useState<HotspotZone>(
    hotspots.topPriority || hotspots.zones[0]
  );

  // Filter zones
  const filteredZones = hotspots.zones.filter((zone) => {
    if (activeFilter === 'All') return true;
    return zone.primaryDrivers.some((d) =>
      d.toLowerCase().includes(activeFilter.toLowerCase().replace(' cover', '').replace(' condition', ''))
    );
  });

  return (
    <div className="w-full space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-wider text-[#00E5A0] uppercase font-semibold px-2 py-0.5 rounded bg-[#00E5A0]/10 border border-[#00E5A0]/20">
              SPATIAL HOTSPOT TRIAGE
            </span>
            <span className="text-xs font-mono text-[#8FA6AE]">
              {hotspots.totalMonitored} zones monitored
            </span>
          </div>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#F1F7F5] tracking-tight mt-1">
            Ecological Hotspot Detection
          </h2>
          <p className="text-xs text-[#8FA6AE] font-mono">
            {formatLocationDisplay(location.name, location.latitude, location.longitude)}
          </p>
        </div>

        {/* View Toggle (Map / List) */}
        <div className="flex items-center gap-1 bg-[#0A1B27] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            id="hotspots-view-map-btn"
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'map'
                ? 'bg-[#06131D] text-[#00E5A0] border border-[#00E5A0]/30 shadow-sm'
                : 'text-[#8FA6AE] hover:text-[#F1F7F5]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" /> Map View
          </button>
          <button
            id="hotspots-view-list-btn"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-[#06131D] text-[#00E5A0] border border-[#00E5A0]/30 shadow-sm'
                : 'text-[#8FA6AE] hover:text-[#F1F7F5]'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Priority List
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap border transition-all ${
              activeFilter === filter
                ? 'bg-[#0A1B27] text-[#00E5A0] border-[#00E5A0]/40'
                : 'bg-transparent text-[#8FA6AE] border-white/10 hover:text-[#F1F7F5] hover:border-white/20'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Severity Breakdown Bar */}
      <div className="flex items-center gap-4 text-xs font-mono text-[#8FA6AE]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00E5A0]" /> Low
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FFB020]" /> Moderate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF8533]" /> High
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF5C5C]" /> Critical
        </span>
      </div>

      {/* Large Hotspot Map First */}
      {viewMode === 'map' ? (
        <div className="bg-[#0A1B27] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <MapView
            location={location}
            hotspots={filteredZones}
            radiusKm={location.radiusKm || 5}
            onSelectHotspot={(zone) => setSelectedZone(zone)}
            defaultShowHotspots={true}
            height="360px"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredZones.map((zone) => {
            const isSelected = selectedZone?.id === zone.id;
            return (
              <div
                key={zone.id}
                onClick={() => setSelectedZone(zone)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0A1B27] border-[#00E5A0] shadow-md'
                    : 'bg-[#0A1B27]/60 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-semibold text-[#F1F7F5] text-sm">
                    {zone.name}
                  </h4>
                  <span
                    className="text-[10px] font-mono font-medium px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${zone.severityColor}15`,
                      color: zone.severityColor,
                      border: `1px solid ${zone.severityColor}35`,
                    }}
                  >
                    {zone.severityLevel.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-[#8FA6AE] mt-1 font-mono">
                  Severity: {zone.severityScore}/100 • {zone.areaHectares} ha
                </div>
                <div className="text-xs text-[#F1F7F5] mt-2 line-clamp-2">
                  {zone.recommendedAction}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Zone Details & Contributing Factors */}
      {selectedZone && (
        <div className="bg-[#0A1B27] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4 animate-in fade-in duration-150">
          
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-heading font-bold text-lg text-[#F1F7F5] tracking-tight">
                {selectedZone.name}
              </h3>
              <p className="text-xs font-mono text-[#8FA6AE] mt-0.5">
                Severity index {selectedZone.severityScore}/100 • {selectedZone.severityLevel} Attention Level
              </p>
            </div>

            <span
              className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg uppercase"
              style={{
                backgroundColor: `${selectedZone.severityColor}15`,
                color: selectedZone.severityColor,
                border: `1px solid ${selectedZone.severityColor}35`,
              }}
            >
              {selectedZone.severityLevel}
            </span>
          </div>

          {/* Primary Drivers List */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <span className="text-[10px] font-mono font-medium text-[#8FA6AE] uppercase tracking-wider block">
              PRIMARY CONTRIBUTING FACTORS
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(selectedZone.primaryDrivers || []).map((driver, idx) => (
                <div key={`driver-${selectedZone.id}-${idx}`} className="flex items-center gap-2 text-xs text-[#F1F7F5] p-2 rounded-lg bg-[#06131D] border border-white/[0.04]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF8533]" />
                  <span>{driver}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Severity Trend Sparkline */}
          <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8FA6AE]">
              <span>8-PERIOD SEVERITY EVOLUTION</span>
              <span className="text-[#00E5A0]">Current: {selectedZone.severityScore}/100</span>
            </div>
            <div className="h-8 w-full flex items-end gap-1.5 bg-[#06131D] p-1.5 rounded-lg border border-white/[0.04]">
              {(selectedZone.severityTrend || []).map((val, idx) => {
                const heightPct = Math.max(15, Math.min(100, (val / 100) * 100));
                const totalTrendCount = selectedZone.severityTrend?.length || 1;
                return (
                  <div
                    key={`sparkline-bar-${selectedZone.id}-${idx}`}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: selectedZone.severityColor,
                      opacity: 0.4 + (idx / totalTrendCount) * 0.6,
                    }}
                    title={`Period ${idx + 1}: ${val}/100`}
                  />
                );
              })}
            </div>
          </div>

          {/* Recommended Action */}
          <div className="p-3.5 rounded-xl bg-[#06131D] border border-[#00E5A0]/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00E5A0]">
              <Sparkles className="w-3.5 h-3.5" />
              Recommended Remediation Intervention
            </div>
            <p className="text-xs text-[#F1F7F5] leading-relaxed">
              {selectedZone.recommendedAction}
            </p>
          </div>

        </div>
      )}

      {/* Mandatory Analytical Classification Disclaimer */}
      <div className="p-4 rounded-xl bg-[#0A1B27]/50 border border-white/10 text-xs text-[#8FA6AE] leading-relaxed font-mono">
        <span className="text-[#00E5A0] font-medium">Notice:</span> Hotspot severity is an EarthPulse analytical classification and is not an official government hazard declaration.
      </div>

    </div>
  );
};
