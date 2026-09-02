import React, { useState, useEffect } from 'react';
import {
  Sliders,
  X,
  Radio,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { IndicatorType } from '../types';
import { dataService } from '../services/dataService';
import { DEFAULT_WEIGHTS, SCIENTIFIC_WEIGHTS } from '../services/scoringEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [providerType, setProviderType] = useState<'demo' | 'gee_live'>('demo');
  const [weights, setWeights] = useState<Record<IndicatorType, number>>({ ...DEFAULT_WEIGHTS });
  const [geeStatus, setGeeStatus] = useState<{
    testing: boolean;
    result: { connected: boolean; status: string; message: string } | null;
  }>({
    testing: false,
    result: null,
  });

  useEffect(() => {
    if (isOpen) {
      setProviderType(dataService.getProviderType());
      setWeights({ ...dataService.getWeights() });
      testGeeConnection();
    }
  }, [isOpen]);

  const testGeeConnection = async () => {
    setGeeStatus({ testing: true, result: null });
    try {
      const res = await fetch('/api/gee-status');
      if (res.ok) {
        const data = await res.json();
        setGeeStatus({ testing: false, result: data });
      } else {
        setGeeStatus({
          testing: false,
          result: {
            connected: false,
            status: 'OFFLINE',
            message: 'Earth Engine API endpoint returned status ' + res.status,
          },
        });
      }
    } catch (e: any) {
      setGeeStatus({
        testing: false,
        result: {
          connected: false,
          status: 'OFFLINE',
          message: 'No active Google Earth Engine backend detected. Running in Demo Mode.',
        },
      });
    }
  };

  const handleWeightChange = (key: IndicatorType, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [key]: val / 100,
    }));
  };

  const handleResetWeights = () => {
    setWeights({ ...DEFAULT_WEIGHTS });
  };

  const handleApplyScientificWeights = () => {
    setWeights({ ...SCIENTIFIC_WEIGHTS });
  };

  const handleSave = () => {
    dataService.setProviderType(providerType);
    dataService.setWeights(weights);
    onSettingsSaved();
    onClose();
  };

  if (!isOpen) return null;

  const weightValues = Object.values(weights) as number[];
  const totalWeightPercent = Math.round(
    weightValues.reduce((a: number, b: number) => a + b, 0) * 100
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-[#06131D] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-6 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00E5A0]/10 border border-[#00E5A0]/30 flex items-center justify-center text-[#00E5A0]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">Application Settings</h3>
              <p className="text-xs text-[#8FA6AE]">Provider selection & scoring engine parameters</p>
            </div>
          </div>

          <button
            id="settings-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8FA6AE] hover:text-white hover:bg-[#0A1B27] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Data Provider Architecture */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[#8FA6AE] uppercase tracking-wider">
              DATA PROVIDER ENGINE
            </span>
            <button
              onClick={testGeeConnection}
              disabled={geeStatus.testing}
              className="text-[11px] font-mono text-[#00C9D9] hover:text-[#00E5A0] flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${geeStatus.testing ? 'animate-spin' : ''}`} />
              Test GEE status
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Option A: Demo Provider */}
            <div
              onClick={() => setProviderType('demo')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                providerType === 'demo'
                  ? 'bg-[#0A1B27] border-[#00E5A0] shadow-[0_0_15px_rgba(0,229,160,0.1)]'
                  : 'bg-[#020B12] border-white/8 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    providerType === 'demo' ? 'border-[#00E5A0] bg-[#00E5A0]' : 'border-[#8FA6AE]'
                  }`}>
                    {providerType === 'demo' && <div className="w-1.5 h-1.5 rounded-full bg-[#020B12]" />}
                  </div>
                  <span className="font-heading font-bold text-white text-sm">
                    EarthPulse Modeled Demo Engine
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#F4C95D]/15 text-[#F4C95D] border border-[#F4C95D]/30">
                  RECOMMENDED FOR DEMO
                </span>
              </div>
              <p className="text-xs text-[#8FA6AE] mt-2 ml-6 leading-relaxed">
                Deterministic Sentinel-2, Landsat & Dynamic World models for presentation without API failures.
              </p>
            </div>

            {/* Option B: GEE Live Provider */}
            <div
              onClick={() => setProviderType('gee_live')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                providerType === 'gee_live'
                  ? 'bg-[#0A1B27] border-[#00E5A0] shadow-[0_0_15px_rgba(0,229,160,0.1)]'
                  : 'bg-[#020B12] border-white/8 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    providerType === 'gee_live' ? 'border-[#00E5A0] bg-[#00E5A0]' : 'border-[#8FA6AE]'
                  }`}>
                    {providerType === 'gee_live' && <div className="w-1.5 h-1.5 rounded-full bg-[#020B12]" />}
                  </div>
                  <span className="font-heading font-bold text-white text-sm">
                    Google Earth Engine Service Layer
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00E5A0]/15 text-[#00E5A0] border border-[#00E5A0]/30">
                  {geeStatus.result?.connected ? 'LIVE PIPELINE' : 'SERVICE ADAPTER'}
                </span>
              </div>
              <p className="text-xs text-[#8FA6AE] mt-2 ml-6 leading-relaxed">
                Connects through the EarthPulse service layer to Google Earth Engine satellite compute nodes.
              </p>
            </div>
          </div>

          {/* GEE Status message */}
          {geeStatus.result && (
            <div className="p-3 rounded-xl bg-[#020B12] border border-white/5 text-xs flex items-start gap-2 text-[#8FA6AE]">
              {geeStatus.result.connected ? (
                <CheckCircle2 className="w-4 h-4 text-[#00E5A0] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#F4C95D] shrink-0 mt-0.5" />
              )}
              <div>
                <span className="text-white font-medium block">
                  Status: {geeStatus.result.status}
                </span>
                <span>{geeStatus.result.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Indicator Weight Customization */}
        <div className="space-y-3 pt-2 border-t border-white/8">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[#8FA6AE] uppercase tracking-wider">
              INDICATOR WEIGHTS ({totalWeightPercent}%)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetWeights}
                className="text-[11px] font-mono text-[#8FA6AE] hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Equal (20%)
              </button>
              <button
                onClick={handleApplyScientificWeights}
                className="text-[11px] font-mono text-[#00E5A0] hover:underline"
              >
                Scientific (30/20/20/15/15)
              </button>
            </div>
          </div>

          <div className="space-y-3 bg-[#020B12] p-4 rounded-2xl border border-white/5">
            {[
              { key: 'vegetation', label: 'Vegetation Cover (NDVI)', color: '#00E5A0' },
              { key: 'water', label: 'Water-Body Condition (NDWI)', color: '#00C9D9' },
              { key: 'landUse', label: 'Land-Use Stability (LULC)', color: '#8B5CF6' },
              { key: 'builtUp', label: 'Built-Up Control', color: '#F4C95D' },
              { key: 'temperature', label: 'Surface Temperature (LST)', color: '#FF4D5A' },
            ].map((ind) => {
              const weightVal = Math.round((weights[ind.key as IndicatorType] || 0.2) * 100);
              return (
                <div key={ind.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#F1F7F5] font-medium">{ind.label}</span>
                    <span className="font-mono font-bold text-white">{weightVal}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={weightVal}
                    onChange={(e) =>
                      handleWeightChange(ind.key as IndicatorType, parseInt(e.target.value))
                    }
                    className="w-full h-1.5 bg-[#06131D] rounded-lg appearance-none cursor-pointer accent-[#00E5A0]"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/8">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-xs font-semibold text-[#8FA6AE] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            id="settings-save-btn"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-[#00E5A0] hover:bg-[#00D98B] text-xs font-bold text-[#020B12] transition-all shadow-[0_0_20px_rgba(0,229,160,0.25)]"
          >
            Save & Apply Changes
          </button>
        </div>

      </div>
    </div>
  );
};
