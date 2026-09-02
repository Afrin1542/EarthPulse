import React, { useState } from 'react';
import { ChevronDown, Info, Sliders } from 'lucide-react';

interface CalculationExplainerProps {
  onOpenSettings?: () => void;
}

export const CalculationExplainer: React.FC<CalculationExplainerProps> = ({
  onOpenSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full pt-4 border-t border-white/[0.08]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#8FA6AE]" />
          <span className="text-xs font-mono font-medium text-[#8FA6AE]">
            Scoring Methodology
          </span>
        </div>
        <button
          id="calc-explainer-toggle-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-[#00E5A0] hover:text-[#00E5A0] transition-colors focus:outline-none"
        >
          <span>{isOpen ? 'Hide methodology' : 'View methodology'}</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4 text-xs text-[#8FA6AE] leading-relaxed bg-[#06131D] p-5 rounded-xl border border-white/10 animate-in fade-in duration-200">
          <p className="text-[#F1F7F5] font-normal leading-relaxed text-xs sm:text-sm">
            The Environmental Health Index combines five satellite-derived indicators into a normalized 0–100 index where 100 represents the optimal ecological baseline.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
            <div className="space-y-1 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="font-mono text-[#00E5A0] font-semibold block text-[11px]">01. TELEMETRY ACQUISITION</span>
              <p className="text-[#8FA6AE]">Harmonized Sentinel-2 MSI, Landsat 8/9 TIRS, and Dynamic World 10m land cover models.</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="font-mono text-[#00C9D9] font-semibold block text-[11px]">02. SCALING & INVERSION</span>
              <p className="text-[#8FA6AE]">Vegetation and water scaled linearly; built-up sprawl and thermal stress inverted so higher indicates healthier conditions.</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="font-mono text-[#FFB020] font-semibold block text-[11px]">03. WEIGHTED SYNTHESIS</span>
              <p className="text-[#8FA6AE]">
                Calculated as a weighted mean across all five dimensions.
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="inline-flex items-center gap-1 ml-1 text-[#00E5A0] hover:underline font-mono"
                  >
                    Configure <Sliders className="w-3 h-3 inline" />
                  </button>
                )}
              </p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="font-mono text-[#8B5CF6] font-semibold block text-[11px]">04. STATUS CATEGORIZATION</span>
              <p className="text-[#8FA6AE]">Mapped to status bands: Excellent (80–100), Good (60–79), Moderate (40–59), Poor (20–39), Critical (0–19).</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
