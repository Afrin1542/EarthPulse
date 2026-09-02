import React, { useState } from 'react';
import {
  Leaf,
  Droplets,
  Trees,
  Building2,
  Thermometer,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Satellite,
} from 'lucide-react';
import { IndicatorData, IndicatorType } from '../types';

interface IndicatorCardProps {
  indicator: IndicatorData;
  onSelect?: () => void;
  expandedDefault?: boolean;
}

const ICON_MAP: Record<IndicatorType, React.ElementType> = {
  vegetation: Leaf,
  water: Droplets,
  landUse: Trees,
  builtUp: Building2,
  temperature: Thermometer,
};

export const IndicatorCard: React.FC<IndicatorCardProps> = ({
  indicator,
  expandedDefault = false,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(expandedDefault);
  const Icon = ICON_MAP[indicator.key] || Leaf;

  const isImproving = indicator.direction === 'Improving';
  const isDeclining = indicator.direction === 'Declining';

  const trendColor = isImproving
    ? 'text-[#00E5A0]'
    : isDeclining
    ? 'text-[#FF5C5C]'
    : 'text-[#8FA6AE]';

  return (
    <div
      id={`indicator-card-${indicator.key}`}
      className="w-full bg-[#0A1B27] border border-white/10 hover:border-[#00E5A0]/30 rounded-2xl p-5 sm:p-6 transition-all space-y-4 group"
    >
      <div className="flex items-start justify-between gap-4">
        
        {/* Left: Icon, Indicator Name & 1-line interpretation */}
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{
              backgroundColor: `${indicator.color}15`,
              color: indicator.color,
            }}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-semibold text-base sm:text-lg text-[#F1F7F5] group-hover:text-[#00E5A0] transition-colors">
                {indicator.name}
              </h3>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-white/[0.04] text-[#8FA6AE] border border-white/[0.06]">
                {indicator.code}
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-[#8FA6AE] leading-relaxed">
              {indicator.interpretation}
            </p>
          </div>
        </div>

        {/* Right: Score & Trend */}
        <div className="text-right shrink-0">
          <div className="font-heading font-bold text-2xl sm:text-3xl text-[#F1F7F5]">
            {indicator.score}
          </div>
          <div className={`flex items-center justify-end gap-1 text-xs font-mono font-medium mt-0.5 ${trendColor}`}>
            {isImproving && <TrendingUp className="w-3.5 h-3.5" />}
            {isDeclining && <TrendingDown className="w-3.5 h-3.5" />}
            {!isImproving && !isDeclining && <Minus className="w-3.5 h-3.5" />}
            <span>{indicator.direction}</span>
          </div>
        </div>

      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full rounded-full bg-[#06131D] border border-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.max(5, indicator.score)}%`,
            backgroundColor: indicator.color,
          }}
        />
      </div>

      {/* Secondary Technical Metadata & Expand Toggle */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#8FA6AE]">
        <div className="font-mono text-xs text-[#8FA6AE]">
          Observed Value: <span className="text-[#F1F7F5] font-semibold">{indicator.rawValue}</span>
        </div>

        <button
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="flex items-center gap-1 text-xs text-[#00C9D9] hover:text-[#00E5A0] font-mono transition-colors"
        >
          <span>{isDetailsOpen ? 'Hide sensor specs' : 'Sensor details'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Expanded Technical Details (Satellite Specs & Methodology) */}
      {isDetailsOpen && (
        <div className="pt-3 border-t border-white/[0.06] space-y-2 text-xs bg-[#06131D] p-4 rounded-xl border border-white/[0.06] animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[#8FA6AE] flex items-center gap-1.5 font-mono text-xs">
              <Satellite className="w-3.5 h-3.5 text-[#00E5A0]" />
              Satellite Data Source:
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/20 font-semibold">
              {indicator.dataSourceBadge}
            </span>
          </div>

          <p className="text-[#8FA6AE] text-xs leading-relaxed">
            {indicator.description}
          </p>

          <div className="text-[11px] font-mono text-[#8FA6AE]/80 pt-1.5 border-t border-white/[0.06]">
            {indicator.satelliteDetails}
          </div>
        </div>
      )}

    </div>
  );
};
