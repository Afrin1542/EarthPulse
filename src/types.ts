export type IndicatorType = 'vegetation' | 'water' | 'landUse' | 'builtUp' | 'temperature';

export type StatusBand = 'Excellent' | 'Good' | 'Moderate' | 'Poor' | 'Critical';

export type TrendDirection = 'Improving' | 'Stable' | 'Declining';

export interface LocationData {
  id: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  region?: string;
  country?: string;
  narrative?: string;
  tag?: string;
}

export interface IndicatorData {
  key: IndicatorType;
  name: string;
  code: string; // NDVI, NDWI, LULC, NDBI, LST
  score: number; // 0-100 normalized
  rawValue: string; // e.g. "0.64 NDVI", "28.5°C", "0.12 NDBI"
  unit?: string;
  weightPercent: number; // 30, 20, 20, 15, 15
  statusBand: StatusBand;
  deltaPercent: number; // e.g. -5.3%
  pointsChange: number; // e.g. -3
  direction: TrendDirection;
  interpretation: string;
  dataSourceBadge: string;
  dataSourceType: 'gee_sentinel' | 'gee_landsat' | 'gee_dynamic_world' | 'modeled_geography';
  description: string;
  satelliteDetails: string;
  color: string;
  hasWaterPixels?: boolean; // Specific to water indicator
  waterStatusNote?: string;
}

export interface SupportingIndicatorData {
  key: string;
  name: string;
  code: string;
  rawValue: string;
  interpretation: string;
  referenceRange: string;
  satelliteDetails: string;
}

export interface EnvironmentalScore {
  overallScore: number;
  statusBand: StatusBand;
  statusColor: string;
  previousScore: number;
  currentScore: number;
  scoreChange: number;
  direction: TrendDirection;
  weights: Record<IndicatorType, number>;
  breakdown: Record<IndicatorType, {
    score: number;
    weightPercent: number;
    weightedContribution: number;
  }>;
  overallNarrative: string;
  primaryDrivers: string;
}

export interface AdaptiveThresholds {
  lst90th: number; // e.g. 34.2 °C
  lst95th: number; // e.g. 38.6 °C
  ndvi10th: number; // e.g. 0.22 NDVI
  ndbi90th: number; // e.g. 0.18 NDBI
}

export interface AnnualTrendPoint {
  period: string; // "2021", "2022", "2023", "2024", "2025", "2026 YTD"
  year: number;
  quarter?: number;
  isYtd?: boolean;
  isLiveGeeObserved: boolean;
  hasData: boolean;
  overallScore: number | null;
  statusBand?: StatusBand | null;
  vegetation: number | null;
  water: number | null;
  landUse: number | null;
  builtUp: number | null;
  temperature: number | null;
  rawNdvi?: number | null;
  rawNdwi?: number | null;
  rawLst?: number | null;
  landUseStabilityPct?: number | null;
  builtUpFractionPct?: number | null;
  dataNote?: string;
}

export type QuarterlyTrendPoint = AnnualTrendPoint;

export interface SignificantChangePoint {
  id: string;
  indicatorKey: IndicatorType;
  indicatorName: string;
  text: string;
  startPeriod: string;
  endPeriod: string;
  deltaPoints: number;
  type: 'rise' | 'decline' | 'stable';
  color: string;
}

export interface TrendAnalysis {
  points: AnnualTrendPoint[];
  comparisonWindows: {
    baselinePeriod: string; // "Baseline period: 2021 (2021-01-01 to 2021-12-31)"
    baselineScore: number;
    previousPeriod: string; // "Previous period: 2023 (2023-01-01 to 2023-12-31)"
    previousScore: number;
    currentPeriod: string; // "Current period: 2025 (2025-01-01 to 2025-12-31)"
    currentScore: number;
    ytdPeriod?: string; // "Latest period: 2026 YTD (2026-01-01 to Present)"
    ytdScore?: number;
    deltaPreviousToCurrent: number;
    direction: TrendDirection;
    note: string;
  };
  previousPeriodLabel: string;
  previousScore: number;
  currentPeriodLabel: string;
  currentScore: number;
  scoreChange: number;
  deltaOverallScore?: number;
  direction: TrendDirection;
  significantChangePoints: SignificantChangePoint[];
  summary?: string;
}

export interface HotspotZone {
  id: string;
  name: string; // "North Zone", "Central Sector", etc.
  lat: number;
  lng: number;
  radiusMeters: number;
  areaKm2: number;
  areaHectares: number;
  severityClass: 0 | 1 | 2 | 3; // 0 = No hotspot, 1 = Moderate, 2 = High, 3 = Critical
  severityScore: number; // 0-1 continuous severity (or 0-100 display)
  severityLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  severityColor: string;
  stressFactorCount: number;
  isHeatStress: boolean;
  isVegetationStress: boolean;
  isBuiltUpStress: boolean;
  isExtremeHeat: boolean; // LST >= 95th percentile
  primaryDrivers: string[];
  contributingFactors: string[];
  severityTrend: number[];
  recommendedAction: string;
  linkedSDGs: string[];
  explanation: string;
}

export interface HotspotSummary {
  totalMonitored: number;
  thresholds: AdaptiveThresholds;
  areaModerateKm2: number;
  areaHighKm2: number;
  areaCriticalKm2: number;
  totalHotspotAreaKm2: number;
  counts: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  topPriority: HotspotZone | null;
  zones: HotspotZone[];
  methodologyNote: string;
}

export interface PlainLanguageInsights {
  summary: string;
  strongestPositive: string;
  strongestConcern: string;
  hotspotExplanation: string;
  monitoringPriorities: string[];
  governanceRecommendation?: string;
  keyPoints?: string[];
  aiGenerated?: boolean;
}

export interface AnalysisResult {
  location: LocationData;
  analysisPeriod: string;
  currentPeriodWindow: string;
  previousPeriodWindow: string;
  baselinePeriodWindow: string;
  analysisRadiusKm: number;
  timestamp: string;
  dataProviderType: 'demo' | 'gee_live';
  dataProviderName: string;
  isDemoData: boolean;
  isLiveGeeConnected: boolean;
  statusMessage?: string;
  indicators: Record<IndicatorType, IndicatorData>;
  supportingNdbi: SupportingIndicatorData;
  score: EnvironmentalScore;
  trends: TrendAnalysis;
  hotspots: HotspotSummary;
  insights: PlainLanguageInsights;
  methodology: {
    satellites: string[];
    algorithmVersion: string;
    disclaimer: string;
    weightsNote: string;
    spatialDistinctionNote: string;
  };
}

export type ActiveTab = 
  | 'home'
  | 'dashboard'
  | 'location'
  | 'score'
  | 'indicators'
  | 'hotspots'
  | 'trends'
  | 'methodology'
  | 'reports'
  | 'settings';

