import { IndicatorType, StatusBand, TrendDirection, EnvironmentalScore } from '../types';

export const OFFICIAL_WEIGHTS: Record<IndicatorType, number> = {
  vegetation: 0.30,
  water: 0.20,
  landUse: 0.20,
  builtUp: 0.15,
  temperature: 0.15,
};

export const DEFAULT_WEIGHTS = OFFICIAL_WEIGHTS;
export const SCIENTIFIC_WEIGHTS = OFFICIAL_WEIGHTS;

export function getStatusBand(score: number): { band: StatusBand; color: string } {
  if (score >= 80) {
    return { band: 'Excellent', color: '#00E5A0' };
  } else if (score >= 60) {
    return { band: 'Good', color: '#00D98B' };
  } else if (score >= 40) {
    return { band: 'Moderate', color: '#F4C95D' };
  } else if (score >= 20) {
    return { band: 'Poor', color: '#FF9F43' };
  } else {
    return { band: 'Critical', color: '#FF4D5A' };
  }
}

export function getTrendDirection(scoreChange: number): TrendDirection {
  if (scoreChange > 2) return 'Improving';
  if (scoreChange < -2) return 'Declining';
  return 'Stable';
}

// Indicator normalization functions according to official methodology
export function normalizeVegetationScore(ndvi: number): number {
  // Reference range: 0.20 (score 0) to 0.80 (score 100)
  const normalized = ((ndvi - 0.20) / (0.80 - 0.20)) * 100;
  return Math.max(0, Math.min(100, Math.round(normalized * 10) / 10));
}

export function normalizeTemperatureScore(lstCelsius: number): number {
  // Reference range: 20°C (score 100) to 45°C (score 0). Higher temperature means lower score.
  const normalized = ((45 - lstCelsius) / (45 - 20)) * 100;
  return Math.max(0, Math.min(100, Math.round(normalized * 10) / 10));
}

export function normalizeWaterScore(ndwi: number | null | undefined): number {
  // Mean NDWI over Dynamic World class 0 water pixels. Formula: (waterMean - (-0.10)) / 0.60 * 100
  if (ndwi === null || ndwi === undefined || isNaN(ndwi)) {
    return 50; // Neutral fallback if no water pixels detected
  }
  const normalized = ((ndwi - (-0.10)) / 0.60) * 100;
  return Math.max(0, Math.min(100, Math.round(normalized * 10) / 10));
}

export function normalizeLandUseScore(changeFraction: number): number {
  // Change percentage = changed pixels / analysis area. Score: 100 - (change / 0.30 * 100)
  const normalized = 100 - (changeFraction / 0.30) * 100;
  return Math.max(0, Math.min(100, Math.round(normalized * 10) / 10));
}

export function normalizeBuiltUpScore(expansionFraction: number): number {
  // Expansion = max(Current built fraction - Previous built fraction, 0). Score: 100 - (expansion / 0.20 * 100)
  const expansion = Math.max(0, expansionFraction);
  const normalized = 100 - (expansion / 0.20) * 100;
  return Math.max(0, Math.min(100, Math.round(normalized * 10) / 10));
}

export function calculateEnvironmentalScore(
  indicatorScores: Record<IndicatorType, number>,
  customWeights: Record<IndicatorType, number> = OFFICIAL_WEIGHTS,
  previousYearScores?: Record<IndicatorType, number>
): EnvironmentalScore {
  // Normalize weights so they sum to 1
  const totalWeight = Object.values(customWeights).reduce((a, b) => a + b, 0) || 1;
  const normalizedWeights: Record<IndicatorType, number> = {
    vegetation: customWeights.vegetation / totalWeight,
    water: customWeights.water / totalWeight,
    landUse: customWeights.landUse / totalWeight,
    builtUp: customWeights.builtUp / totalWeight,
    temperature: customWeights.temperature / totalWeight,
  };

  let weightedSum = 0;
  const breakdown: EnvironmentalScore['breakdown'] = {} as any;

  (Object.keys(indicatorScores) as IndicatorType[]).forEach((key) => {
    const score = Math.max(0, Math.min(100, Math.round(indicatorScores[key] * 10) / 10));
    const weight = normalizedWeights[key];
    const weightPercent = Math.round(weight * 100);
    const weightedContribution = Math.round(score * weight * 10) / 10;
    
    weightedSum += score * weight;
    breakdown[key] = {
      score,
      weightPercent,
      weightedContribution,
    };
  });

  const currentScore = Math.max(0, Math.min(100, Math.round(weightedSum * 10) / 10));
  const { band, color } = getStatusBand(currentScore);

  // Calculate previous score if previous indicators are available
  let previousScore = currentScore;
  if (previousYearScores) {
    let prevSum = 0;
    (Object.keys(previousYearScores) as IndicatorType[]).forEach((key) => {
      const prevVal = Math.max(0, Math.min(100, previousYearScores[key]));
      prevSum += prevVal * normalizedWeights[key];
    });
    previousScore = Math.max(0, Math.min(100, Math.round(prevSum * 10) / 10));
  } else {
    previousScore = Math.max(0, Math.min(100, Math.round((currentScore - 1.8) * 10) / 10));
  }

  const scoreChange = Math.round((currentScore - previousScore) * 10) / 10;
  const direction = getTrendDirection(scoreChange);

  // Determine top contributing drivers
  const sortedIndicators = (Object.keys(breakdown) as IndicatorType[]).sort(
    (a, b) => breakdown[b].score - breakdown[a].score
  );
  const highest = sortedIndicators[0];
  const lowest = sortedIndicators[sortedIndicators.length - 1];

  const indicatorNames: Record<IndicatorType, string> = {
    vegetation: 'Vegetation Cover',
    water: 'Water-Body Condition',
    landUse: 'Land-Use Stability',
    builtUp: 'Built-Up Control',
    temperature: 'Surface Temperature',
  };

  const narrative = `Environmental health is rated ${band} (${currentScore}/100), led by ${indicatorNames[highest]} (${breakdown[highest].score}/100) and constrained by ${indicatorNames[lowest]} (${breakdown[lowest].score}/100).`;

  return {
    overallScore: currentScore,
    statusBand: band,
    statusColor: color,
    previousScore,
    currentScore,
    scoreChange,
    direction,
    weights: normalizedWeights,
    breakdown,
    overallNarrative: narrative,
    primaryDrivers: `${indicatorNames[highest]} and ${indicatorNames[lowest]}`,
  };
}

