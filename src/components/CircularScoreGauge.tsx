import React from 'react';
import { StatusBand } from '../types';

interface CircularScoreGaugeProps {
  score: number; // 0 to 100
  statusBand: StatusBand;
  statusColor: string;
  size?: number;
  showSubtitle?: boolean;
}

export const CircularScoreGauge: React.FC<CircularScoreGaugeProps> = ({
  score,
  statusBand,
  statusColor,
  showSubtitle = true,
}) => {
  // Semi-circle gauge geometry
  // Angle goes from 180 degrees (left, score=0) to 360 degrees (right, score=100)
  const radius = 95;
  const strokeWidth = 14;
  const cx = 140;
  const cy = 135;

  // Calculate arc parameters
  const clampedScore = Math.max(0, Math.min(100, score));
  const angle = 180 + (clampedScore / 100) * 180;
  const radians = (angle * Math.PI) / 180;

  // Needle tip position
  const indicatorRadius = radius;
  const indicatorX = cx + indicatorRadius * Math.cos(radians);
  const indicatorY = cy + indicatorRadius * Math.sin(radians);

  // Background arc circumference for semi circle = PI * radius
  const arcLength = Math.PI * radius;
  const activeLength = (clampedScore / 100) * arcLength;

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <div className="relative w-full max-w-[280px] aspect-[1.5/1] flex items-center justify-center">
        <svg viewBox="0 0 280 180" className="w-full h-full overflow-visible">
          <defs>
            {/* Multi-spectral Health Gradient */}
            <linearGradient id="scoreGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF5C5C" />
              <stop offset="25%" stopColor="#FF8533" />
              <stop offset="50%" stopColor="#FFB020" />
              <stop offset="75%" stopColor="#00C9D9" />
              <stop offset="100%" stopColor="#00E5A0" />
            </linearGradient>

            {/* Subtle glow filter for the indicator dot */}
            <filter id="gaugeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Arc Track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#06131D"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Outer hairline accent ring */}
          <path
            d={`M ${cx - radius - 8} ${cy} A ${radius + 8} ${radius + 8} 0 0 1 ${cx + radius + 8} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />

          {/* Colored Active Gradient Track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="url(#scoreGaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength}`}
            strokeDashoffset={arcLength - activeLength}
            className="transition-all duration-1000 ease-out"
          />

          {/* Tick Marks for 0, 20, 40, 60, 80, 100 */}
          {[0, 20, 40, 60, 80, 100].map((tick) => {
            const tickAngle = 180 + (tick / 100) * 180;
            const rad = (tickAngle * Math.PI) / 180;
            const innerR = radius - 12;
            const outerR = radius - 18;
            const x1 = cx + innerR * Math.cos(rad);
            const y1 = cy + innerR * Math.sin(rad);
            const x2 = cx + outerR * Math.cos(rad);
            const y2 = cy + outerR * Math.sin(rad);
            return (
              <line
                key={`gauge-tick-${tick}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
            );
          })}

          {/* Indicator Needle Point */}
          <circle
            cx={indicatorX}
            cy={indicatorY}
            r="6"
            fill="#FFFFFF"
            stroke="#020B12"
            strokeWidth="2"
            filter="url(#gaugeGlow)"
            className="transition-all duration-1000 ease-out"
          />

          {/* Center Score Number */}
          <text
            x={cx}
            y={cy - 12}
            textAnchor="middle"
            className="font-heading font-bold text-5xl fill-[#F1F7F5] tracking-tight"
          >
            {score}
          </text>

          {/* Status Label */}
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fill={statusColor}
            className="text-xs font-mono font-semibold tracking-widest uppercase"
          >
            {statusBand.toUpperCase()}
          </text>
        </svg>
      </div>

      {showSubtitle && (
        <div className="text-center mt-[-4px]">
          <span className="text-[10px] font-mono tracking-widest text-[#8FA6AE] uppercase font-medium">
            ENVIRONMENTAL HEALTH SCORE • 0–100
          </span>
        </div>
      )}
    </div>
  );
};
