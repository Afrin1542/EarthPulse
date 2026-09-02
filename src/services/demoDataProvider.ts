import {
  LocationData,
  IndicatorData,
  IndicatorType,
  EnvironmentalScore,
  TrendAnalysis,
  AnnualTrendPoint,
  QuarterlyTrendPoint,
  SignificantChangePoint,
  HotspotSummary,
  HotspotZone,
  AnalysisResult,
  PlainLanguageInsights,
  SupportingIndicatorData,
  AdaptiveThresholds,
} from '../types';
import {
  calculateEnvironmentalScore,
  getStatusBand,
  getTrendDirection,
  normalizeVegetationScore,
  normalizeTemperatureScore,
  normalizeWaterScore,
  OFFICIAL_WEIGHTS,
} from './scoringEngine';

export const PRESET_LOCATIONS: LocationData[] = [
  {
    id: 'kollegal-satyamangalam',
    name: 'Kollegal / Satyamangalam Region',
    formattedAddress: 'Kollegal, Chamarajanagar, Karnataka, India (11.95°N, 77.55°E)',
    latitude: 11.95,
    longitude: 77.55,
    radiusKm: 5,
    region: 'Chamarajanagar, Karnataka',
    country: 'India',
    tag: 'Deciduous forest buffer & riverine reserve',
    narrative: 'High vegetation density with well-preserved ecological corridors and low built-up pressure.',
  },
  {
    id: 'bengaluru-urban',
    name: 'Bengaluru Urban Core',
    formattedAddress: 'Bengaluru, Karnataka, India (12.9716°N, 77.5946°E)',
    latitude: 12.9716,
    longitude: 77.5946,
    radiusKm: 5,
    region: 'Karnataka',
    country: 'India',
    tag: 'Rapid urban expansion & thermal signature',
    narrative: 'High impervious footprint with seasonal surface heat anomalies and fragmented canopy.',
  },
  {
    id: 'odisha-udayagiri',
    name: 'R.Udayagiri, Gajapati, Odisha',
    formattedAddress: 'R.Udayagiri, Gajapati, Odisha, 761214, India',
    latitude: 19.2814,
    longitude: 84.2963,
    radiusKm: 5,
    region: 'Gajapati, Odisha',
    country: 'India',
    tag: 'Forest buffer & mixed agricultural zone',
    narrative: 'Vegetation cover under moderate pressure with resilient thermal regulation.',
  },
  {
    id: 'brazil-novo-progresso',
    name: 'Novo Progresso, Pará',
    formattedAddress: 'Novo Progresso, Pará, Brazil',
    latitude: -7.147,
    longitude: -55.426,
    radiusKm: 5,
    region: 'Pará',
    country: 'Brazil',
    tag: 'Active deforestation front',
    narrative: 'Vegetation falling steadily while cleared land converts to pasture and roads.',
  },
  {
    id: 'usa-phoenix',
    name: 'Phoenix, Arizona',
    formattedAddress: 'Phoenix, Arizona, United States',
    latitude: 33.4484,
    longitude: -112.074,
    radiusKm: 5,
    region: 'Arizona',
    country: 'United States',
    tag: 'Urban heat island growth',
    narrative: 'Surface temperature and impervious cover climbing together across five years.',
  },
  {
    id: 'china-loess-plateau',
    name: 'Loess Plateau, Shaanxi',
    formattedAddress: "Yan'an, Loess Plateau, Shaanxi, China",
    latitude: 36.596,
    longitude: 109.489,
    radiusKm: 5,
    region: 'Shaanxi',
    country: 'China',
    tag: 'Restoration success story',
    narrative: 'Terracing and replanting lifting vegetation and water indicators year on year.',
  },
  {
    id: 'india-chilika',
    name: 'Chilika Wetland',
    formattedAddress: 'Chilika Lake Ramsar Site, Odisha, India',
    latitude: 19.7165,
    longitude: 85.3216,
    radiusKm: 5,
    region: 'Odisha',
    country: 'India',
    tag: 'Wetland recovery & water stability',
    narrative: 'Vegetation and water climbing steadily following eco-buffer regulation.',
  },
];

function seedRandom(lat: number, lng: number, offset = 0): number {
  const x = Math.sin(lat * 12.9898 + lng * 78.233 + offset * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

export function generateDemoAnalysis(
  location: LocationData,
  customWeights: Record<IndicatorType, number> = OFFICIAL_WEIGHTS
): AnalysisResult {
  const { latitude: lat, longitude: lng } = location;

  const isDefaultKollegal = Math.abs(lat - 11.95) < 0.05 && Math.abs(lng - 77.55) < 0.05;
  const isBengaluru = Math.abs(lat - 12.9716) < 0.05 && Math.abs(lng - 77.5946) < 0.05;
  const isOdisha = Math.abs(lat - 19.28) < 0.1 && Math.abs(lng - 84.3) < 0.1;
  const isNovoProgresso = Math.abs(lat - (-7.14)) < 0.2;
  const isPhoenix = Math.abs(lat - 33.44) < 0.2;
  const isLoess = Math.abs(lat - 36.59) < 0.2;
  const isChilika = Math.abs(lat - 19.71) < 0.2;

  let rawNdvi = 0.64;
  let rawNdwi = 0.18;
  let rawNdbi = -0.16;
  let rawLst = 28.2;
  let landUseStabilityPct = 91.2;
  let builtUpFractionPct = 6.4;
  let hasWater = true;

  if (isDefaultKollegal) {
    rawNdvi = 0.64;
    rawNdwi = 0.18;
    rawNdbi = -0.16;
    rawLst = 28.2;
    landUseStabilityPct = 91.2;
    builtUpFractionPct = 6.4;
    hasWater = true;
  } else if (isBengaluru) {
    rawNdvi = 0.32;
    rawNdwi = -0.08;
    rawNdbi = 0.24;
    rawLst = 36.8;
    landUseStabilityPct = 71.5;
    builtUpFractionPct = 64.2;
    hasWater = false;
  } else if (isOdisha) {
    rawNdvi = 0.58;
    rawNdwi = 0.22;
    rawNdbi = -0.12;
    rawLst = 26.8;
    landUseStabilityPct = 86.4;
    builtUpFractionPct = 8.1;
    hasWater = true;
  } else if (isNovoProgresso) {
    rawNdvi = 0.42;
    rawNdwi = -0.05;
    rawNdbi = 0.14;
    rawLst = 34.5;
    landUseStabilityPct = 58.2;
    builtUpFractionPct = 24.6;
    hasWater = false;
  } else if (isPhoenix) {
    rawNdvi = 0.24;
    rawNdwi = -0.12;
    rawNdbi = 0.32;
    rawLst = 42.1;
    landUseStabilityPct = 74.0;
    builtUpFractionPct = 62.8;
    hasWater = false;
  } else if (isLoess) {
    rawNdvi = 0.54;
    rawNdwi = 0.08;
    rawNdbi = -0.08;
    rawLst = 24.5;
    landUseStabilityPct = 89.0;
    builtUpFractionPct = 11.2;
    hasWater = true;
  } else if (isChilika) {
    rawNdvi = 0.52;
    rawNdwi = 0.38;
    rawNdbi = -0.22;
    rawLst = 27.2;
    landUseStabilityPct = 94.1;
    builtUpFractionPct = 4.2;
    hasWater = true;
  } else {
    const r1 = seedRandom(lat, lng, 1);
    const r2 = seedRandom(lat, lng, 2);
    const r3 = seedRandom(lat, lng, 3);
    const r4 = seedRandom(lat, lng, 4);

    rawNdvi = Math.round((0.25 + r1 * 0.52) * 100) / 100;
    hasWater = r2 > 0.35;
    rawNdwi = hasWater ? Math.round((-0.05 + r2 * 0.45) * 100) / 100 : -0.15;
    rawNdbi = Math.round((-0.25 + (1 - r1) * 0.5) * 100) / 100;
    rawLst = Math.round((21.0 + r3 * 18.5) * 10) / 10;
    landUseStabilityPct = Math.round((65 + r4 * 30) * 10) / 10;
    builtUpFractionPct = Math.round((4 + (1 - r4) * 35) * 10) / 10;
  }

  const vegetationScore = normalizeVegetationScore(rawNdvi);
  const temperatureScore = normalizeTemperatureScore(rawLst);
  const waterScore = hasWater ? normalizeWaterScore(rawNdwi) : 50;
  const landUseScore = Math.max(0, Math.min(100, Math.round(landUseStabilityPct)));
  const builtUpScore = Math.max(0, Math.min(100, Math.round(100 - builtUpFractionPct * 1.1)));

  const indicatorScores: Record<IndicatorType, number> = {
    vegetation: vegetationScore,
    water: waterScore,
    landUse: landUseScore,
    builtUp: builtUpScore,
    temperature: temperatureScore,
  };

  const prevOffset = (seedRandom(lat, lng, 5) - 0.45) * 6;
  const prevScores: Record<IndicatorType, number> = {
    vegetation: Math.max(0, Math.min(100, Math.round((vegetationScore - prevOffset * 0.8) * 10) / 10)),
    water: Math.max(0, Math.min(100, Math.round((waterScore - prevOffset * 0.5) * 10) / 10)),
    landUse: Math.max(0, Math.min(100, Math.round((landUseScore - prevOffset * 0.3) * 10) / 10)),
    builtUp: Math.max(0, Math.min(100, Math.round((builtUpScore + prevOffset * 0.4) * 10) / 10)),
    temperature: Math.max(0, Math.min(100, Math.round((temperatureScore - prevOffset * 0.6) * 10) / 10)),
  };

  const scoreResult = calculateEnvironmentalScore(indicatorScores, customWeights, prevScores);

  const indicators: Record<IndicatorType, IndicatorData> = {
    vegetation: {
      key: 'vegetation',
      name: 'Vegetation Cover',
      code: 'NDVI',
      score: vegetationScore,
      rawValue: `${rawNdvi.toFixed(2)} NDVI`,
      unit: 'NDVI',
      weightPercent: 30,
      statusBand: getStatusBand(vegetationScore).band,
      deltaPercent: Math.round(((vegetationScore - prevScores.vegetation) / (prevScores.vegetation || 1)) * 1000) / 10,
      pointsChange: Math.round((vegetationScore - prevScores.vegetation) * 10) / 10,
      direction: getTrendDirection(vegetationScore - prevScores.vegetation),
      interpretation: vegetationScore >= 70
        ? 'Dense, continuous canopy with high photosynthetic vigor and low canopy stress.'
        : vegetationScore >= 45
        ? 'Moderate vegetation density with scattered seasonal canopy cover.'
        : 'Sparse canopy cover with high ground fragmentation and vegetation loss.',
      dataSourceBadge: 'Sentinel-2 MSI (10m)',
      dataSourceType: 'gee_sentinel',
      description: 'Normalized Difference Vegetation Index computed from Sentinel-2 Harmonized Surface Reflectance (B8 and B4) with SCL cloud masking.',
      satelliteDetails: 'COPERNICUS/S2_SR_HARMONIZED • (B8 - B4) / (B8 + B4)',
      color: '#00E5A0',
    },
    water: {
      key: 'water',
      name: 'Water-Body Condition',
      code: 'NDWI',
      score: waterScore,
      rawValue: hasWater ? `${rawNdwi.toFixed(2)} NDWI` : 'No water pixels detected',
      unit: 'NDWI',
      weightPercent: 20,
      statusBand: getStatusBand(waterScore).band,
      deltaPercent: hasWater ? Math.round(((waterScore - prevScores.water) / (prevScores.water || 1)) * 1000) / 10 : 0,
      pointsChange: hasWater ? Math.round((waterScore - prevScores.water) * 10) / 10 : 0,
      direction: hasWater ? getTrendDirection(waterScore - prevScores.water) : 'Stable',
      interpretation: hasWater
        ? waterScore >= 65
          ? 'Perennial surface water retention with stable riparian moisture.'
          : 'Seasonal hydrological fluctuation with moderate turbidity.'
        : 'No significant open water bodies detected in this 5 km observation radius.',
      dataSourceBadge: 'Sentinel-2 & Dynamic World',
      dataSourceType: 'gee_sentinel',
      description: 'McFeeters Normalized Difference Water Index computed over Dynamic World Class 0 (Water) pixels across the analysis window.',
      satelliteDetails: 'COPERNICUS/S2_SR_HARMONIZED • (B3 - B8) / (B3 + B8) masked by Dynamic World',
      color: '#00C9D9',
      hasWaterPixels: hasWater,
      waterStatusNote: hasWater ? undefined : 'No significant water pixels detected in 5 km radius.',
    },
    landUse: {
      key: 'landUse',
      name: 'Land-Use Stability',
      code: 'LULC',
      score: landUseScore,
      rawValue: `${landUseStabilityPct}% Stable`,
      unit: '% stability',
      weightPercent: 20,
      statusBand: getStatusBand(landUseScore).band,
      deltaPercent: Math.round(((landUseScore - prevScores.landUse) / (prevScores.landUse || 1)) * 1000) / 10,
      pointsChange: Math.round((landUseScore - prevScores.landUse) * 10) / 10,
      direction: getTrendDirection(landUseScore - prevScores.landUse),
      interpretation: landUseScore >= 80
        ? 'High land-use stability with minimal landscape conversion or clearing.'
        : landUseScore >= 55
        ? 'Moderate land-use transition across agricultural and peri-urban fringes.'
        : 'Rapid land-cover transformation with substantial clearing or conversion.',
      dataSourceBadge: 'Dynamic World (10m)',
      dataSourceType: 'gee_dynamic_world',
      description: 'Temporal land-cover consistency evaluated using Dynamic World 10m LULC mode comparison between 2023 and 2025.',
      satelliteDetails: 'GOOGLE/DYNAMICWORLD/V1 • 10m Continuous Classification',
      color: '#4ADE80',
    },
    builtUp: {
      key: 'builtUp',
      name: 'Built-Up Control',
      code: 'BUILT',
      score: builtUpScore,
      rawValue: `${builtUpFractionPct}% Impervious`,
      unit: '% built footprint',
      weightPercent: 15,
      statusBand: getStatusBand(builtUpScore).band,
      deltaPercent: Math.round(((builtUpScore - prevScores.builtUp) / (prevScores.builtUp || 1)) * 1000) / 10,
      pointsChange: Math.round((builtUpScore - prevScores.builtUp) * 10) / 10,
      direction: getTrendDirection(builtUpScore - prevScores.builtUp),
      interpretation: builtUpScore >= 75
        ? 'Low recent built-up expansion with limited additional land conversion.'
        : builtUpScore >= 50
        ? 'Moderate recent built-up expansion along established development corridors.'
        : 'High recent built-up expansion indicating significant additional land conversion.',
      dataSourceBadge: 'Dynamic World & NDBI',
      dataSourceType: 'gee_dynamic_world',
      description: 'Fractional built area derived from Dynamic World Class 6 (Built) cross-validated with Sentinel-2 NDBI index.',
      satelliteDetails: 'GOOGLE/DYNAMICWORLD/V1 (Class 6) + Sentinel-2 NDBI',
      color: '#94A3B8',
    },
    temperature: {
      key: 'temperature',
      name: 'Surface Temperature',
      code: 'LST',
      score: temperatureScore,
      rawValue: `${rawLst}°C LST`,
      unit: '°C',
      weightPercent: 15,
      statusBand: getStatusBand(temperatureScore).band,
      deltaPercent: Math.round(((temperatureScore - prevScores.temperature) / (prevScores.temperature || 1)) * 1000) / 10,
      pointsChange: Math.round((temperatureScore - prevScores.temperature) * 10) / 10,
      direction: getTrendDirection(temperatureScore - prevScores.temperature),
      interpretation: temperatureScore >= 75
        ? 'Surface temperature comfortably regulated by evaporative cooling and canopy.'
        : temperatureScore >= 50
        ? 'Moderate thermal conditions with localized seasonal warm patches.'
        : 'Elevated thermal signature characteristic of urban heat or deforested surfaces.',
      dataSourceBadge: 'Landsat 8/9 TIRS (30m)',
      dataSourceType: 'gee_landsat',
      description: 'Land Surface Temperature derived from Landsat 8/9 Collection 2 Level-2 ST_B10 thermal band with QA_PIXEL cloud masking.',
      satelliteDetails: 'LANDSAT/LC08/C02/T1_L2 & LC09/C02/T1_L2 • ST_B10 * 0.00341802 + 149.0 - 273.15',
      color: '#FB923C',
    },
  };

  const supportingNdbi: SupportingIndicatorData = {
    key: 'ndbi',
    name: 'Normalized Difference Built-up Index',
    code: 'NDBI',
    rawValue: `${rawNdbi > 0 ? '+' : ''}${rawNdbi.toFixed(2)} NDBI`,
    interpretation: rawNdbi > 0.1
      ? 'High density of built structures, bare cleared soil, or impervious surfaces.'
      : rawNdbi > -0.1
      ? 'Mixed natural and semi-urban cover.'
      : 'Dominantly vegetated or water-saturated surfaces with minimal built footprint.',
    referenceRange: '-0.30 to +0.30',
    satelliteDetails: 'COPERNICUS/S2_SR_HARMONIZED • (B11 - B8) / (B11 + B8)',
  };

  const thresholds: AdaptiveThresholds = {
    lst90th: Math.round((rawLst + 3.8) * 10) / 10,
    lst95th: Math.round((rawLst + 6.2) * 10) / 10,
    ndvi10th: Math.max(0.08, Math.round((rawNdvi - 0.18) * 100) / 100),
    ndbi90th: Math.round((rawNdbi + 0.16) * 100) / 100,
  };

  const hotspotZones: HotspotZone[] = [];
  const hotspotAngles = [0.4, 2.1, 3.8, 5.2];
  const zoneNames = ['North Thermal Fringes', 'Eastern Buffer Corridor', 'Southwestern Transition', 'Central Core Cluster'];

  let areaModerateKm2 = 0;
  let areaHighKm2 = 0;
  let areaCriticalKm2 = 0;

  hotspotAngles.forEach((angle, idx) => {
    const distRatio = 0.35 + seedRandom(lat, lng, 10 + idx) * 0.45;
    const spotLat = lat + Math.cos(angle) * (5 * 0.009 * distRatio);
    const spotLng = lng + Math.sin(angle) * (5 * 0.009 * distRatio);

    const isHeatStress = seedRandom(lat, lng, 20 + idx) > 0.3;
    const isVegStress = seedRandom(lat, lng, 30 + idx) > 0.35;
    const isBuiltStress = seedRandom(lat, lng, 40 + idx) > 0.5;

    let stressCount = 0;
    if (isHeatStress) stressCount++;
    if (isVegStress) stressCount++;
    if (isBuiltStress) stressCount++;

    const isExtremeHeat = isHeatStress && seedRandom(lat, lng, 50 + idx) > 0.7;

    let severityClass: 0 | 1 | 2 | 3 = 0;
    let severityLevel: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
    let severityColor = '#00E5A0';

    if (stressCount >= 3 && isExtremeHeat) {
      severityClass = 3;
      severityLevel = 'Critical';
      severityColor = '#FF4D5A';
    } else if (stressCount >= 3) {
      severityClass = 2;
      severityLevel = 'High';
      severityColor = '#FF9F43';
    } else if (stressCount >= 2) {
      severityClass = 1;
      severityLevel = 'Moderate';
      severityColor = '#F4C95D';
    }

    if (severityClass > 0) {
      const continuousSeverity = Math.round(
        ((isHeatStress ? 0.40 : 0.05) +
          (isVegStress ? 0.35 : 0.05) +
          (isBuiltStress ? 0.25 : 0.05) +
          (isExtremeHeat ? 0.15 : 0)) * 100
      ) / 100;

      const areaKm2 = Math.round((0.25 + seedRandom(lat, lng, 60 + idx) * 0.6) * 100) / 100;
      const areaHectares = Math.round(areaKm2 * 100);

      if (severityClass === 3) areaCriticalKm2 += areaKm2;
      else if (severityClass === 2) areaHighKm2 += areaKm2;
      else if (severityClass === 1) areaModerateKm2 += areaKm2;

      const drivers: string[] = [];
      if (isHeatStress) drivers.push(`Surface Heat (${thresholds.lst90th}°C+)`);
      if (isVegStress) drivers.push(`Canopy Stress (NDVI ≤ ${thresholds.ndvi10th})`);
      if (isBuiltStress) drivers.push(`Impervious Expansion (NDBI ≥ ${thresholds.ndbi90th})`);
      if (isExtremeHeat) drivers.push('Extreme Thermal Peak');

      hotspotZones.push({
        id: `hotspot-${idx + 1}`,
        name: zoneNames[idx],
        lat: Math.round(spotLat * 10000) / 10000,
        lng: Math.round(spotLng * 10000) / 10000,
        radiusMeters: Math.round(Math.sqrt(areaKm2 / Math.PI) * 1000),
        areaKm2,
        areaHectares,
        severityClass,
        severityScore: Math.round(continuousSeverity * 100),
        severityLevel,
        severityColor,
        stressFactorCount: stressCount,
        isHeatStress,
        isVegetationStress: isVegStress,
        isBuiltUpStress: isBuiltStress,
        isExtremeHeat,
        primaryDrivers: drivers,
        contributingFactors: ['Reduced canopy evapotranspiration', 'Localized impervious cover', 'Micro-topographical heat retention'],
        severityTrend: [
          Math.max(10, Math.round(continuousSeverity * 85)),
          Math.max(15, Math.round(continuousSeverity * 90)),
          Math.max(20, Math.round(continuousSeverity * 95)),
          Math.round(continuousSeverity * 100),
        ],
        recommendedAction: severityClass === 3
          ? 'Urgent targeted canopy restoration & soil cooling buffer'
          : severityClass === 2
          ? 'Priority vegetative buffer enhancement and runoff management'
          : 'Periodic quarterly thermal and vegetation surveillance',
        linkedSDGs: ['SDG 11 (Sustainable Cities)', 'SDG 13 (Climate Action)', 'SDG 15 (Life on Land)'],
        explanation: `Multi-stress anomaly combining ${drivers.join(' and ')} across ${areaKm2} km² of terrain.`,
      });
    }
  });

  const totalHotspotAreaKm2 = Math.round((areaModerateKm2 + areaHighKm2 + areaCriticalKm2) * 100) / 100;
  const topPriority = hotspotZones.sort((a, b) => b.severityScore - a.severityScore)[0] || null;

  const hotspotsSummary: HotspotSummary = {
    totalMonitored: hotspotZones.length,
    thresholds,
    areaModerateKm2: Math.round(areaModerateKm2 * 100) / 100,
    areaHighKm2: Math.round(areaHighKm2 * 100) / 100,
    areaCriticalKm2: Math.round(areaCriticalKm2 * 100) / 100,
    totalHotspotAreaKm2,
    counts: {
      low: 0,
      moderate: hotspotZones.filter((z) => z.severityClass === 1).length,
      high: hotspotZones.filter((z) => z.severityClass === 2).length,
      critical: hotspotZones.filter((z) => z.severityClass === 3).length,
    },
    topPriority,
    zones: hotspotZones,
    methodologyNote: 'Hotspot severity is a composite indicator of environmental stress, not a medical, safety, or regulatory classification.',
  };

  const trendPoints: AnnualTrendPoint[] = [];
  const annualYears = [2021, 2022, 2023, 2024, 2025, 2026];

  for (const yr of annualYears) {
    const isYtd = yr === 2026;
    const yrOffset = (yr - 2023) * 0.8;
    const yrNdvi = Math.max(0.05, Math.min(0.9, rawNdvi + (yrOffset * 0.015)));
    const yrWater = hasWater ? rawNdwi + (yrOffset * 0.01) : null;
    const yrLuPct = Math.max(30, Math.min(99, landUseStabilityPct - (yrOffset * 0.4)));
    const yrBuiltPct = Math.max(1, Math.min(95, builtUpFractionPct + (yrOffset * 0.5)));
    const yrLst = Math.max(10, Math.min(55, rawLst + (yrOffset * 0.3)));

    const vScore = normalizeVegetationScore(yrNdvi);
    const wScore = yrWater !== null ? normalizeWaterScore(yrWater) : 50;
    const luScore = Math.max(0, Math.min(100, Math.round(yrLuPct)));
    const buScore = Math.max(0, Math.min(100, Math.round(100 - yrBuiltPct * 1.1)));
    const tScore = normalizeTemperatureScore(yrLst);

    const yrOverall = Math.round(
      ((vScore * OFFICIAL_WEIGHTS.vegetation) +
        (wScore * OFFICIAL_WEIGHTS.water) +
        (luScore * OFFICIAL_WEIGHTS.landUse) +
        (buScore * OFFICIAL_WEIGHTS.builtUp) +
        (tScore * OFFICIAL_WEIGHTS.temperature)) * 10
    ) / 10;

    trendPoints.push({
      period: isYtd ? '2026 YTD' : `${yr}`,
      year: yr,
      isYtd,
      isLiveGeeObserved: false,
      hasData: true,
      overallScore: yrOverall,
      statusBand: getStatusBand(yrOverall).band,
      vegetation: vScore,
      water: wScore,
      landUse: luScore,
      builtUp: buScore,
      temperature: tScore,
      rawNdvi: Math.round(yrNdvi * 100) / 100,
      rawNdwi: yrWater !== null ? Math.round(yrWater * 100) / 100 : null,
      rawLst: Math.round(yrLst * 10) / 10,
      landUseStabilityPct: Math.round(yrLuPct * 10) / 10,
      builtUpFractionPct: Math.round(yrBuiltPct * 10) / 10,
    });
  }

  const pt2021 = trendPoints.find((p) => p.year === 2021);
  const pt2023 = trendPoints.find((p) => p.year === 2023);
  const pt2025 = trendPoints.find((p) => p.year === 2025);
  const pt2026 = trendPoints.find((p) => p.year === 2026);

  const baselineScore = pt2021?.overallScore ?? scoreResult.previousScore;
  const previousScore = pt2023?.overallScore ?? scoreResult.previousScore;
  const currentScore = pt2025?.overallScore ?? scoreResult.currentScore;
  const ytdScore = pt2026?.overallScore ?? scoreResult.currentScore;

  const deltaPrevToCurr = Math.round((currentScore - previousScore) * 10) / 10;
  const direction = getTrendDirection(deltaPrevToCurr);

  const trends: TrendAnalysis = {
    points: trendPoints,
    comparisonWindows: {
      baselinePeriod: 'Baseline period: 2021 (2021-01-01 to 2021-12-31)',
      baselineScore,
      previousPeriod: 'Previous period: 2023 (2023-01-01 to 2023-12-31)',
      previousScore,
      currentPeriod: 'Current period: 2025 (2025-01-01 to 2025-12-31)',
      currentScore,
      ytdPeriod: 'Latest period: 2026 YTD (2026-01-01 to Present)',
      ytdScore,
      deltaPreviousToCurrent: deltaPrevToCurr,
      direction,
      note: 'Annual observation windows (2021–2026 YTD).',
    },
    previousPeriodLabel: 'Previous Period (2023)',
    previousScore,
    currentPeriodLabel: 'Current Period (2025)',
    currentScore,
    scoreChange: deltaPrevToCurr,
    deltaOverallScore: deltaPrevToCurr,
    direction,
    significantChangePoints: [
      {
        id: 'shift-1',
        indicatorKey: 'vegetation',
        indicatorName: 'Vegetation Cover',
        text: 'Canopy density changes observed across vegetation boundaries.',
        startPeriod: '2021',
        endPeriod: '2025',
        deltaPoints: Math.round(((pt2025?.vegetation ?? vegetationScore) - (pt2021?.vegetation ?? prevScores.vegetation)) * 10) / 10,
        type: (pt2025?.vegetation ?? vegetationScore) >= (pt2021?.vegetation ?? prevScores.vegetation) ? 'rise' : 'decline',
        color: '#00E5A0',
      },
    ],
    summary: `Multi-year satellite observations from 2021 to 2026 YTD show fluctuations in environmental health, with a modest recovery of +1.8 points from 2023 to 2025.`,
  };

  const defaultInsights = {
    summary: `Environmental Health Score for ${location.name} is ${scoreResult.currentScore}/100 (${scoreResult.statusBand}), showing a ${scoreResult.direction.toLowerCase()} trajectory (+${scoreResult.scoreChange} pts compared with 2023).`,
    strongestPositive: `${scoreResult.primaryDrivers.split(' and ')[0]} provides the strongest environmental resilience.`,
    strongestConcern: `${scoreResult.primaryDrivers.split(' and ')[1] || 'Thermal peaks'} is the leading pressure factor.`,
    hotspotExplanation: totalHotspotAreaKm2 > 0
      ? `${totalHotspotAreaKm2} km² of multi-stress hotspot clusters detected across ${hotspotZones.length} zones.`
      : 'No significant multi-stress environmental hotspots detected in the 5 km analysis buffer.',
    monitoringPriorities: [
      'Maintain quarterly satellite monitoring of canopy health.',
      'Protect natural riparian and vegetation corridors.',
      'Track impervious surface expansion to mitigate heat retention.',
    ],
    aiGenerated: false,
  };

  return {
    location,
    analysisPeriod: '2021 – 2025 (Annual Comparison)',
    currentPeriodWindow: '2025-01-01 to 2026-01-01',
    previousPeriodWindow: '2023-01-01 to 2024-01-01',
    baselinePeriodWindow: '2021-01-01 to 2022-01-01',
    analysisRadiusKm: location.radiusKm || 5,
    timestamp: new Date().toISOString(),
    dataProviderType: 'demo',
    dataProviderName: 'EarthPulse Satellite Intelligence Model',
    isDemoData: true,
    isLiveGeeConnected: false,
    statusMessage: 'DEMO MODE — Satellite connection not configured',
    indicators,
    supportingNdbi,
    score: scoreResult,
    trends,
    hotspots: hotspotsSummary,
    insights: defaultInsights,
    methodology: {
      satellites: [
        'Sentinel-2 MSI Harmonized (10m Multi-spectral)',
        'Landsat 8/9 TIRS Collection 2 Level-2 (30m Thermal)',
        'Dynamic World V1 (10m Near-Real-Time LULC)',
      ],
      algorithmVersion: 'EarthPulse GEE Engine v2.6.4',
      disclaimer: 'Hotspot severity is a composite indicator of environmental stress, not a medical, safety, or regulatory classification.',
      weightsNote: 'Official Weights: Vegetation 30%, Water 20%, Land-Use 20%, Built-Up 15%, Surface Temperature 15%.',
      spatialDistinctionNote: 'Area-Level Environmental Health Score evaluates the entire 5 km buffer. Pixel-Level Environmental Health Map is a spatial visualization.',
    },
  };
}
