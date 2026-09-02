import React, { useState } from 'react';
import {
  FileText,
  Share2,
  Download,
  Printer,
  ShieldCheck,
  Calendar,
  MapPin,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { AnalysisResult, IndicatorData } from '../types';
import { formatLocationDisplay, formatCoordinates } from '../utils/formatters';

interface ReportViewProps {
  analysis: AnalysisResult;
}

export const ReportView: React.FC<ReportViewProps> = ({ analysis }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const { location, score, indicators, trends, hotspots, methodology } = analysis;
  const indicatorList: IndicatorData[] = Object.values(indicators);

  return (
    <div className="w-full space-y-6 report-container">
      
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 no-print">
        <div>
          <span className="text-[10px] font-mono tracking-wider text-[#00E5A0] uppercase font-semibold px-2 py-0.5 rounded bg-[#00E5A0]/10 border border-[#00E5A0]/20">
            AUDIT DOSSIER
          </span>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#F1F7F5] tracking-tight mt-1">
            Environmental Intelligence Report
          </h2>
          <p className="text-xs text-[#8FA6AE] truncate font-mono">
            {formatLocationDisplay(location.name, location.latitude, location.longitude)} • {analysis.analysisPeriod}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="report-share-btn"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A1B27] border border-white/10 hover:border-[#00E5A0]/30 text-xs font-medium text-[#F1F7F5] transition-all hover:bg-[#0E2435]"
          >
            <Share2 className="w-3.5 h-3.5 text-[#8FA6AE]" />
            {copied ? 'Copied' : 'Share'}
          </button>

          <button
            id="report-download-pdf-btn"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#00E5A0] hover:bg-[#00E5A0]/90 text-xs font-semibold text-[#020B12] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Document
          </button>
        </div>
      </div>

      {/* Printable Report Document Surface */}
      <div className="bg-[#0A1B27] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl report-card">
        
        {/* Document Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#06131D] border border-[#00E5A0]/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#00E5A0]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l3 7 4-14 3 7h4" />
              </svg>
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-[#F1F7F5]">EarthPulse Environmental Intelligence</h3>
              <p className="text-xs text-[#8FA6AE] font-mono">Autonomous Multi-Spectral Satellite Assessment</p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs font-mono text-[#8FA6AE] space-y-0.5">
            <div>Audit Date: {new Date().toLocaleDateString()}</div>
            <div>Radius: {analysis.analysisRadiusKm} km Spatial Buffer</div>
            <div>Coordinates: {formatCoordinates(location.latitude, location.longitude)}</div>
          </div>
        </div>

        {/* Executive Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#06131D] border border-white/10 flex flex-col justify-center items-center text-center space-y-1">
            <span className="text-[10px] font-mono text-[#8FA6AE] uppercase">Composite Health Score</span>
            <div className="font-heading font-extrabold text-4xl text-[#F1F7F5]">
              {score.overallScore}
            </div>
            <span
              className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded uppercase"
              style={{
                backgroundColor: `${score.statusColor}15`,
                color: score.statusColor,
              }}
            >
              {score.statusBand}
            </span>
          </div>

          <div className="md:col-span-2 p-4 rounded-xl bg-[#06131D] border border-white/10 space-y-2">
            <span className="text-[10px] font-mono text-[#00E5A0] uppercase font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Executive Synthesis
            </span>
            <p className="text-xs sm:text-sm text-[#F1F7F5] leading-relaxed">
              {analysis.insights.summary}
            </p>
          </div>
        </div>

        {/* Five Indicators Table */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-[#8FA6AE] uppercase tracking-wider block font-semibold">
            MULTI-SPECTRAL SENSOR INDICATORS
          </span>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[#8FA6AE] text-left">
                  <th className="py-2.5 px-3">Indicator</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3">Observed Value</th>
                  <th className="py-2.5 px-3">Trajectory</th>
                  <th className="py-2.5 px-3">Primary Sensor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {indicatorList.map((ind) => (
                  <tr key={ind.key} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-medium text-[#F1F7F5] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                      {ind.name}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#F1F7F5]">{ind.score}/100</td>
                    <td className="py-2.5 px-3 text-[#8FA6AE]">{ind.rawValue}</td>
                    <td className="py-2.5 px-3">
                      <span className={ind.direction === 'Improving' ? 'text-[#00E5A0]' : ind.direction === 'Declining' ? 'text-[#FF5C5C]' : 'text-[#8FA6AE]'}>
                        {ind.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#8FA6AE]">{ind.dataSourceBadge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Annual Satellite Observations (2021 - 2026 YTD) */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#8FA6AE] uppercase tracking-wider block font-semibold">
              ANNUAL GEE SATELLITE OBSERVATIONS (2021 – 2026 YTD)
            </span>
            <span className="text-[10px] font-mono text-[#00E5A0]">
              Net Trajectory: {analysis.trends.deltaOverallScore && analysis.trends.deltaOverallScore > 0 ? `+${analysis.trends.deltaOverallScore}` : analysis.trends.deltaOverallScore || 0} pts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[#8FA6AE] text-left">
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Health Score</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Veg (30%)</th>
                  <th className="py-2.5 px-3">Water (20%)</th>
                  <th className="py-2.5 px-3">Land-Use (20%)</th>
                  <th className="py-2.5 px-3">Built-Up (15%)</th>
                  <th className="py-2.5 px-3">Thermal (15%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {(analysis.trends.points || []).map((pt) => (
                  <tr key={pt.period} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-medium text-[#F1F7F5]">
                      <span className={pt.isYtd || pt.year === 2026 ? 'text-[#00E5A0] font-bold' : 'text-[#F1F7F5]'}>
                        {pt.period}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#00E5A0]">
                      {pt.overallScore !== null ? `${pt.overallScore} pts` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-[#8FA6AE]">
                      {pt.hasData ? (pt.statusBand ?? 'Calculated') : 'No data'}
                    </td>
                    <td className="py-2.5 px-3 text-[#F1F7F5]">{pt.vegetation !== null ? pt.vegetation : 'N/A'}</td>
                    <td className="py-2.5 px-3 text-[#F1F7F5]">{pt.water !== null ? pt.water : 'N/A'}</td>
                    <td className="py-2.5 px-3 text-[#F1F7F5]">{pt.landUse !== null ? pt.landUse : 'N/A'}</td>
                    <td className="py-2.5 px-3 text-[#F1F7F5]">{pt.builtUp !== null ? pt.builtUp : 'N/A'}</td>
                    <td className="py-2.5 px-3 text-[#F1F7F5]">{pt.temperature !== null ? pt.temperature : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hotspot & Recommended Actions */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <span className="text-[10px] font-mono text-[#8FA6AE] uppercase tracking-wider block font-semibold">
            KEY RECOMMENDATIONS & MITIGATION PRIORITIES
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(analysis.insights.keyPoints || []).map((point, idx) => (
              <div key={`report-keypoint-${idx}`} className="p-3.5 rounded-xl bg-[#06131D] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#00E5A0] font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finding {idx + 1}</span>
                </div>
                <p className="text-xs text-[#F1F7F5] leading-relaxed">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology Footer */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-[#8FA6AE]">
          <span>Generated by EarthPulse • {methodology.processingEngine}</span>
          <span>Sentinel-2 MSI • Landsat 8/9 TIRS • Dynamic World 10m</span>
        </div>

      </div>

    </div>
  );
};
