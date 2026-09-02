import React, { useState } from 'react';
import {
  Calendar,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { TrendAnalysis, AnnualTrendPoint } from '../types';

interface TrendChartProps {
  trends: TrendAnalysis;
  locationName: string;
}

type SeriesKey = 'overallScore' | 'vegetation' | 'water' | 'landUse' | 'builtUp' | 'temperature';

interface SeriesOption {
  key: SeriesKey;
  label: string;
  color: string;
}

const SERIES_OPTIONS: SeriesOption[] = [
  { key: 'overallScore', label: 'Health Score', color: '#00E5A0' },
  { key: 'vegetation', label: 'Vegetation (NDVI)', color: '#10B981' },
  { key: 'water', label: 'Water (NDWI)', color: '#00C9D9' },
  { key: 'landUse', label: 'Land-Use (LULC)', color: '#8B5CF6' },
  { key: 'builtUp', label: 'Built-Up Control', color: '#FFB020' },
  { key: 'temperature', label: 'Thermal (LST)', color: '#FF5C5C' },
];

export const TrendChart: React.FC<TrendChartProps> = ({ trends, locationName }) => {
  const [activeSeries, setActiveSeries] = useState<Record<SeriesKey, boolean>>({
    overallScore: true,
    vegetation: true,
    water: true,
    landUse: true,
    builtUp: true,
    temperature: true,
  });

  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const toggleSeries = (key: SeriesKey) => {
    setActiveSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const points = trends.points;
  const numPoints = points.length;

  // Chart dimensions & scaling
  const width = 640;
  const height = 280;
  const paddingLeft = 45;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (numPoints <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (numPoints - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return paddingTop + chartHeight - (clamped / 100) * chartHeight;
  };

  // Generate clean linear SVG path connecting genuine annual observations
  const generatePath = (key: SeriesKey) => {
    const validPoints = points
      .map((pt, i) => ({ pt, i, val: pt[key] }))
      .filter((item): item is { pt: AnnualTrendPoint; i: number; val: number } => item.val !== null && item.val !== undefined);

    if (validPoints.length < 2) return '';
    return validPoints.reduce((path, item, idx) => {
      const x = getX(item.i);
      const y = getY(item.val);
      if (idx === 0) return `M ${x} ${y}`;
      return `${path} L ${x} ${y}`;
    }, '');
  };

  const hoveredPoint: AnnualTrendPoint | null = hoveredPointIndex !== null ? points[hoveredPointIndex] : null;

  return (
    <div className="w-full space-y-6">
      
      {/* Series Toggle Buttons */}
      <div className="space-y-2">
        <div className="text-[10px] font-mono font-medium text-[#8FA6AE] uppercase tracking-wider">
          ACTIVE SATELLITE SERIES
        </div>
        <div className="flex flex-wrap gap-2">
          {SERIES_OPTIONS.map((s) => {
            const isSelected = activeSeries[s.key];
            return (
              <button
                key={s.key}
                id={`trend-toggle-${s.key}`}
                onClick={() => toggleSeries(s.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${
                  isSelected
                    ? 'bg-[#0A1B27] text-[#F1F7F5] border-white/20'
                    : 'bg-transparent text-[#8FA6AE] border-white/10 opacity-40 hover:opacity-75'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="bg-[#0A1B27] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl relative select-none">
        
        {/* Top Info Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 mb-4 gap-2 text-xs font-mono text-[#8FA6AE]">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#00E5A0]" />
            <span className="text-[#F1F7F5] font-semibold">Annual GEE Observations (2021 – 2026 YTD)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#00E5A0] font-semibold">
              Net Trajectory (2023→2025): {trends.deltaOverallScore && trends.deltaOverallScore > 0 ? `+${trends.deltaOverallScore}` : trends.deltaOverallScore || 0} pts
            </span>
          </div>
        </div>

        {/* Scientific Transparency Note */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00E5A0]/5 border border-[#00E5A0]/15 text-[11px] font-mono text-[#8FA6AE] mb-4">
          <Info className="w-3.5 h-3.5 text-[#00E5A0] shrink-0" />
          <span className="text-[#F1F7F5]">
            Direct Annual Satellite Observations from Google Earth Engine (Sentinel-2, Landsat 8/9, Dynamic World).
          </span>
        </div>

        {/* The SVG Canvas */}
        <div className="relative w-full aspect-[2.2/1]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            onMouseLeave={() => setHoveredPointIndex(null)}
          >
            <defs>
              {/* Overall Score area gradient */}
              <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5A0" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#00E5A0" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {[0, 25, 50, 75, 100].map((val) => {
              const y = getY(val);
              return (
                <g key={`grid-line-${val}`}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeDasharray={val === 50 ? '3 3' : 'none'}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-[#8FA6AE] font-mono"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Labels for All 6 Annual Periods */}
            {points.map((pt, idx) => {
              const x = getX(idx);
              const isYtd = pt.isYtd || pt.year === 2026;
              return (
                <g key={`xaxis-label-${pt.period}-${idx}`}>
                  <text
                    x={x}
                    y={height - 14}
                    textAnchor="middle"
                    className={`text-[10px] font-mono ${isYtd ? 'fill-[#00E5A0] font-bold' : 'fill-[#F1F7F5]'}`}
                  >
                    {pt.period}
                  </text>
                </g>
              );
            })}

            {/* Filled Area under Overall Score */}
            {activeSeries.overallScore && points.some((p) => p.overallScore !== null) && (() => {
              const validScores = points
                .map((pt, i) => ({ pt, i, val: pt.overallScore }))
                .filter((item): item is { pt: AnnualTrendPoint; i: number; val: number } => item.val !== null && item.val !== undefined);
              if (validScores.length < 2) return null;
              const firstIdx = validScores[0].i;
              const lastIdx = validScores[validScores.length - 1].i;
              return (
                <path
                  d={`${generatePath('overallScore')} L ${getX(lastIdx)} ${getY(0)} L ${getX(firstIdx)} ${getY(0)} Z`}
                  fill="url(#scoreAreaGradient)"
                />
              );
            })()}

            {/* Render lines for all other active series */}
            {SERIES_OPTIONS.filter((s) => s.key !== 'overallScore').map((s) => {
              if (!activeSeries[s.key]) return null;
              return (
                <path
                  key={`series-line-${s.key}`}
                  d={generatePath(s.key)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeOpacity="0.85"
                  className="transition-all duration-200"
                />
              );
            })}

            {/* Render dominant Overall Score line */}
            {activeSeries.overallScore && (
              <path
                d={generatePath('overallScore')}
                fill="none"
                stroke="#00E5A0"
                strokeWidth="3.2"
                strokeLinecap="round"
                className="transition-all duration-200"
              />
            )}

            {/* Render distinct Observation Nodes for each year */}
            {points.map((pt, idx) => {
              if (!pt.hasData || pt.overallScore === null) return null;
              const x = getX(idx);
              const y = getY(pt.overallScore);
              const isYtd = pt.isYtd || pt.year === 2026;
              return (
                <g key={`observed-node-${idx}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isYtd ? 6.5 : 5.5}
                    fill="#00E5A0"
                    fillOpacity="0.25"
                    stroke="#00E5A0"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isYtd ? 3.5 : 3}
                    fill={isYtd ? '#00E5A0' : '#F1F7F5'}
                  />
                </g>
              );
            })}

            {/* Interactive hover trigger columns */}
            {points.map((pt, idx) => {
              const x = getX(idx);
              const colWidth = numPoints > 1 ? chartWidth / (numPoints - 1) : chartWidth;
              return (
                <rect
                  key={`hover-col-${pt.period}-${idx}`}
                  x={x - colWidth / 2}
                  y={paddingTop}
                  width={colWidth}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredPointIndex(idx)}
                />
              );
            })}

            {/* Active Hover Line and Dots */}
            {hoveredPointIndex !== null && (
              <g>
                <line
                  x1={getX(hoveredPointIndex)}
                  y1={paddingTop}
                  x2={getX(hoveredPointIndex)}
                  y2={height - paddingBottom}
                  stroke="#00E5A0"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {SERIES_OPTIONS.map((s) => {
                  if (!activeSeries[s.key]) return null;
                  const val = points[hoveredPointIndex][s.key];
                  if (val === null || val === undefined) return null;
                  return (
                    <circle
                      key={`hover-point-${s.key}`}
                      cx={getX(hoveredPointIndex)}
                      cy={getY(val)}
                      r={s.key === 'overallScore' ? 5 : 4}
                      fill={s.color}
                      stroke="#020B12"
                      strokeWidth="2"
                    />
                  );
                })}
              </g>
            )}
          </svg>
        </div>

        {/* Hover Tooltip Card */}
        {hoveredPoint && (
          <div className="mt-4 p-4 rounded-xl bg-[#06131D] border border-white/10 space-y-3 text-xs font-mono animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#F1F7F5] text-sm">{hoveredPoint.period}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#00E5A0]/15 text-[#00E5A0] border border-[#00E5A0]/30 font-semibold">
                  {hoveredPoint.hasData
                    ? hoveredPoint.isYtd || hoveredPoint.year === 2026
                      ? 'LIVE GEE Annual Observation — 2026 YTD'
                      : 'LIVE GEE Annual Observation'
                    : 'No Satellite Data'}
                </span>
              </div>
              <span className="text-[#8FA6AE] font-semibold">
                Status: {hoveredPoint.hasData ? (hoveredPoint.statusBand ?? 'Calculated') : 'No data'}
              </span>
            </div>

            {!hoveredPoint.hasData ? (
              <div className="text-xs text-[#8FA6AE] py-1">
                {hoveredPoint.dataNote || 'Insufficient satellite observations for this annual window'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div>
                  <span className="text-[#00E5A0] block text-[10px]">HEALTH SCORE</span>
                  <span className="font-bold text-sm text-[#00E5A0]">
                    {hoveredPoint.overallScore !== null ? hoveredPoint.overallScore : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[#10B981] block text-[10px]">VEGETATION (30%)</span>
                  <span className="text-[#F1F7F5] font-semibold">
                    {hoveredPoint.vegetation !== null ? hoveredPoint.vegetation : 'N/A'}
                  </span>
                  {hoveredPoint.rawNdvi !== undefined && hoveredPoint.rawNdvi !== null && (
                    <span className="text-[#8FA6AE] block text-[9px]">{hoveredPoint.rawNdvi} NDVI</span>
                  )}
                </div>
                <div>
                  <span className="text-[#00C9D9] block text-[10px]">WATER (20%)</span>
                  <span className="text-[#F1F7F5] font-semibold">
                    {hoveredPoint.water !== null ? hoveredPoint.water : 'N/A'}
                  </span>
                  {hoveredPoint.rawNdwi !== undefined && hoveredPoint.rawNdwi !== null && (
                    <span className="text-[#8FA6AE] block text-[9px]">{hoveredPoint.rawNdwi} NDWI</span>
                  )}
                </div>
                <div>
                  <span className="text-[#8B5CF6] block text-[10px]">LAND-USE (20%)</span>
                  <span className="text-[#F1F7F5] font-semibold">
                    {hoveredPoint.landUse !== null ? hoveredPoint.landUse : 'N/A'}
                  </span>
                  {hoveredPoint.landUseStabilityPct !== undefined && hoveredPoint.landUseStabilityPct !== null && (
                    <span className="text-[#8FA6AE] block text-[9px]">{hoveredPoint.landUseStabilityPct}%</span>
                  )}
                </div>
                <div>
                  <span className="text-[#FFB020] block text-[10px]">BUILT-UP (15%)</span>
                  <span className="text-[#F1F7F5] font-semibold">
                    {hoveredPoint.builtUp !== null ? hoveredPoint.builtUp : 'N/A'}
                  </span>
                  {hoveredPoint.builtUpFractionPct !== undefined && hoveredPoint.builtUpFractionPct !== null && (
                    <span className="text-[#8FA6AE] block text-[9px]">{hoveredPoint.builtUpFractionPct}%</span>
                  )}
                </div>
                <div>
                  <span className="text-[#FF5C5C] block text-[10px]">THERMAL (15%)</span>
                  <span className="text-[#F1F7F5] font-semibold">
                    {hoveredPoint.temperature !== null ? hoveredPoint.temperature : 'N/A'}
                  </span>
                  {hoveredPoint.rawLst !== undefined && hoveredPoint.rawLst !== null && (
                    <span className="text-[#8FA6AE] block text-[9px]">{hoveredPoint.rawLst}°C</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Annual GEE Observation Windows Cards (2021 Baseline, 2023 Previous, 2025 Current, 2026 YTD) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#0A1B27] border border-white/10 space-y-1 font-mono text-xs">
          <span className="text-[10px] text-[#8FA6AE] block uppercase">Baseline Observation</span>
          <div className="flex items-baseline justify-between">
            <span className="text-[#F1F7F5] font-bold text-base">2021</span>
            <span className="text-[#00E5A0] font-bold">{trends.comparisonWindows.baselineScore} pts</span>
          </div>
          <span className="text-[10px] text-[#8FA6AE] block">Annual GEE Composite</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0A1B27] border border-white/10 space-y-1 font-mono text-xs">
          <span className="text-[10px] text-[#8FA6AE] block uppercase">Previous Observation</span>
          <div className="flex items-baseline justify-between">
            <span className="text-[#F1F7F5] font-bold text-base">2023</span>
            <span className="text-[#00E5A0] font-bold">{trends.comparisonWindows.previousScore} pts</span>
          </div>
          <span className="text-[10px] text-[#8FA6AE] block">Annual GEE Composite</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0A1B27] border border-white/10 space-y-1 font-mono text-xs">
          <span className="text-[10px] text-[#8FA6AE] block uppercase">Current Observation</span>
          <div className="flex items-baseline justify-between">
            <span className="text-[#F1F7F5] font-bold text-base">2025</span>
            <span className="text-[#00E5A0] font-bold">{trends.comparisonWindows.currentScore} pts</span>
          </div>
          <span className="text-[10px] text-[#8FA6AE] block">Annual GEE Composite</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0A1B27] border border-white/10 space-y-1 font-mono text-xs">
          <span className="text-[10px] text-[#8FA6AE] block uppercase">Latest Partial Year</span>
          <div className="flex items-baseline justify-between">
            <span className="text-[#00E5A0] font-bold text-base">2026 YTD</span>
            <span className="text-[#00E5A0] font-bold">{trends.comparisonWindows.ytdScore ?? trends.comparisonWindows.currentScore} pts</span>
          </div>
          <span className="text-[10px] text-[#8FA6AE] block">Year-To-Date Window</span>
        </div>
      </div>

      {/* Trajectory Insights */}
      <div className="p-5 rounded-2xl bg-[#0A1B27] border border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#00E5A0]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Long-Term Trajectory Assessment</span>
        </div>
        <p className="text-xs sm:text-sm text-[#F1F7F5] leading-relaxed">
          {trends.summary || `Annual multi-spectral observations from 2021 to 2026 YTD indicate an environmental trajectory of ${trends.deltaOverallScore && trends.deltaOverallScore > 0 ? `+${trends.deltaOverallScore}` : trends.deltaOverallScore || 0} pts.`}
        </p>
      </div>

    </div>
  );
};

