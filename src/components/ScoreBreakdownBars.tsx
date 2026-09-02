import React from 'react';
import { IndicatorType, EnvironmentalScore } from '../types';

interface ScoreBreakdownBarsProps {
  scoreData: EnvironmentalScore;
  onIndicatorClick?: (key: IndicatorType) => void;
}

const INDICATOR_CONFIG: Record<
  IndicatorType,
  { label: string; barColor: string; bgTrack: string }
> = {
  vegetation: {
    label: 'Vegetation Cover (NDVI)',
    barColor: 'bg-[#00E5A0]',
    bgTrack: 'bg-[#00E5A0]/15',
  },
  water: {
    label: 'Water-Body Condition (NDWI)',
    barColor: 'bg-[#00C9D9]',
    bgTrack: 'bg-[#00C9D9]/15',
  },
  landUse: {
    label: 'Land-Use Stability (LULC)',
    barColor: 'bg-[#8B5CF6]',
    bgTrack: 'bg-[#8B5CF6]/15',
  },
  builtUp: {
    label: 'Built-Up Control',
    barColor: 'bg-[#FFB020]',
    bgTrack: 'bg-[#FFB020]/15',
  },
  temperature: {
    label: 'Surface Temperature (LST)',
    barColor: 'bg-[#FF5C5C]',
    bgTrack: 'bg-[#FF5C5C]/15',
  },
};

// Order matching the prototype: Temperature, Land-Use, Built-Up, Water, Vegetation
const DISPLAY_ORDER: IndicatorType[] = [
  'vegetation',
  'water',
  'landUse',
  'builtUp',
  'temperature',
];

export const ScoreBreakdownBars: React.FC<ScoreBreakdownBarsProps> = ({
  scoreData,
  onIndicatorClick,
}) => {
  return (
    <div className="w-full space-y-3 pt-1">
      <div className="flex items-center justify-between text-xs text-[#8EA2AD] border-b border-white/[0.06] pb-2">
        <span className="text-white text-xs font-semibold uppercase tracking-wider font-mono">Five Indicator Weights</span>
        <span className="font-mono text-[11px]">Normalized (0–100)</span>
      </div>

      <div className="space-y-2.5">
        {DISPLAY_ORDER.map((key) => {
          const config = INDICATOR_CONFIG[key];
          const item = scoreData.breakdown[key] || {
            score: 50,
            weightPercent: 20,
            weightedContribution: 10,
          };

          return (
            <div
              key={key}
              onClick={() => onIndicatorClick?.(key)}
              className={`group flex items-center justify-between gap-3 text-xs transition-all ${
                onIndicatorClick ? 'cursor-pointer hover:bg-white/[0.04] p-1.5 -mx-1.5 rounded-lg' : ''
              }`}
            >
              {/* Indicator Name */}
              <div className="w-44 text-xs font-medium text-[#F3F7F8] group-hover:text-white truncate">
                {config.label}
              </div>

              {/* Progress Bar */}
              <div className="flex-1 h-2 rounded-full bg-[#0B1D2B] border border-white/[0.04] overflow-hidden relative">
                <div
                  className={`h-full rounded-full ${config.barColor} transition-all duration-1000 ease-out`}
                  style={{ width: `${Math.max(4, Math.min(100, item.score))}%` }}
                />
              </div>

              {/* Score Value & Weight */}
              <div className="flex items-center justify-end gap-2.5 w-20 text-right font-mono">
                <span className="text-xs font-bold text-white">{item.score}</span>
                <span className="text-[11px] text-[#8EA2AD]">({item.weightPercent}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
