import crypto from 'crypto';
// @ts-ignore
import ee from '@google/earthengine';
import { GoogleAuth, JWT } from 'google-auth-library';
import {
  LocationData,
  AnalysisResult,
  IndicatorData,
  IndicatorType,
  EnvironmentalScore,
  TrendAnalysis,
  QuarterlyTrendPoint,
  HotspotSummary,
  HotspotZone,
  AdaptiveThresholds,
  SupportingIndicatorData,
} from '../../src/types';
import {
  OFFICIAL_WEIGHTS,
  getStatusBand,
  getTrendDirection,
  normalizeVegetationScore,
  normalizeTemperatureScore,
  normalizeWaterScore,
  calculateEnvironmentalScore,
} from '../../src/services/scoringEngine';

// Earth Engine API Configuration
const EE_ENDPOINT = 'https://earthengine.googleapis.com/v1';

export interface GeeStatusInfo {
  configured: boolean;
  connected: boolean;
  projectId?: string;
  serviceAccount?: string;
  hasPrivateKey: boolean;
  error?: string;
  quotaRestricted?: boolean;
  message: string;
  datasets: string[];
  timePeriods: {
    currentPeriod: string;
    previousPeriod: string;
    baselinePeriod: string;
  };
}

let cachedAuthClient: JWT | null = null;
let lastAuthError: string | null = null;
let lastSdkInitError: string | null = null;
let lastQuotaExceededTime = 0;
const QUOTA_COOLDOWN_MS = 60000; // 1 minute cooldown to prevent repeated expensive requests

let isEeSdkInitialized = false;
let eeSdkInitPromise: Promise<boolean> | null = null;

// In-memory Spatial Cache and In-Flight Request Deduplication
interface CacheEntry {
  timestamp: number;
  data: LiveGeeReductionResults;
}
const GEE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_ENTRIES = 120;
const reductionCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<LiveGeeReductionResults>>();

function getCacheKey(lat: number, lng: number, radiusKm: number): string {
  // Round to ~100m coordinate precision for spatial reuse
  return `${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusKm.toFixed(1)}`;
}

/**
 * Validates and canonicalizes a private key using Node.js crypto module.
 * Returns the exact PKCS#8 PEM string that Node.js crypto accepts, or null if invalid.
 */
function getCanonicalPrivateKey(): string | null {
  let rawKey = process.env.GEE_PRIVATE_KEY?.trim() || '';
  if (!rawKey && process.env.GEE_SERVICE_ACCOUNT?.startsWith('{')) {
    rawKey = process.env.GEE_SERVICE_ACCOUNT.trim();
  }
  if (!rawKey) return null;

  // Check if rawKey is a JSON string containing private_key
  if (rawKey.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawKey);
      if (parsed.private_key) {
        rawKey = parsed.private_key;
      }
    } catch {
      // not JSON
    }
  }

  // Strip wrapping single or double quotes
  if ((rawKey.startsWith('"') && rawKey.endsWith('"')) || (rawKey.startsWith("'") && rawKey.endsWith("'"))) {
    rawKey = rawKey.slice(1, -1);
  }

  // Unescape standard newline literals
  const unescaped = rawKey
    .replace(/\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\r\n/g, '\n')
    .trim();

  // Try parsing directly with crypto.createPrivateKey
  const attempts: string[] = [unescaped];

  // If standard header exists, isolate and rebuild clean PEM
  const beginMarkerMatch = unescaped.match(/-----BEGIN [A-Z0-9 _-]+KEY-----/i);
  const endMarkerMatch = unescaped.match(/-----END [A-Z0-9 _-]+KEY-----/i);

  if (beginMarkerMatch && endMarkerMatch) {
    const startIndex = unescaped.indexOf(beginMarkerMatch[0]) + beginMarkerMatch[0].length;
    const endIndex = unescaped.indexOf(endMarkerMatch[0]);
    const base64Body = unescaped.substring(startIndex, endIndex).replace(/[^A-Za-z0-9+/=]/g, '');

    if (base64Body.length > 0) {
      const wrappedBody = base64Body.match(/.{1,64}/g)?.join('\n') || base64Body;
      attempts.push(`-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----\n`);
      attempts.push(`-----BEGIN RSA PRIVATE KEY-----\n${wrappedBody}\n-----END RSA PRIVATE KEY-----\n`);
    }
  } else {
    // If only base64 was passed
    const cleanBase64 = unescaped.replace(/[^A-Za-z0-9+/=]/g, '');
    if (cleanBase64.length > 50) {
      const wrappedBody = cleanBase64.match(/.{1,64}/g)?.join('\n') || cleanBase64;
      attempts.push(`-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----\n`);
      attempts.push(`-----BEGIN RSA PRIVATE KEY-----\n${wrappedBody}\n-----END RSA PRIVATE KEY-----\n`);
    }
  }

  for (const attempt of attempts) {
    try {
      const keyObj = crypto.createPrivateKey(attempt);
      const pem = keyObj.export({ type: 'pkcs8', format: 'pem' }) as string;
      return pem;
    } catch {
      // Continue to next attempt
    }
  }

  return null;
}

/**
 * Validates whether Google Earth Engine environment credentials are configured.
 */
export function checkGeeConfiguration(): {
  configured: boolean;
  projectId?: string;
  serviceAccount?: string;
  hasPrivateKey: boolean;
} {
  let projectId = process.env.GEE_PROJECT_ID?.trim();
  let serviceAccount = process.env.GEE_SERVICE_ACCOUNT?.trim();
  let rawKey = process.env.GEE_PRIVATE_KEY?.trim();

  // Strip wrapping quotes
  if (projectId && ((projectId.startsWith('"') && projectId.endsWith('"')) || (projectId.startsWith("'") && projectId.endsWith("'")))) {
    projectId = projectId.slice(1, -1).trim();
  }
  if (serviceAccount && ((serviceAccount.startsWith('"') && serviceAccount.endsWith('"')) || (serviceAccount.startsWith("'") && serviceAccount.endsWith("'")))) {
    serviceAccount = serviceAccount.slice(1, -1).trim();
  }

  // Check if GEE_SERVICE_ACCOUNT or GEE_PRIVATE_KEY contains the whole JSON key file
  if (serviceAccount && serviceAccount.startsWith('{') && serviceAccount.endsWith('}')) {
    try {
      const parsed = JSON.parse(serviceAccount);
      if (parsed.client_email) serviceAccount = parsed.client_email;
      if (parsed.project_id && !projectId) projectId = parsed.project_id;
      if (parsed.private_key && !rawKey) rawKey = parsed.private_key;
    } catch {
      // ignore
    }
  }

  if (rawKey && rawKey.startsWith('{') && rawKey.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawKey);
      if (parsed.client_email && !serviceAccount) serviceAccount = parsed.client_email;
      if (parsed.project_id && !projectId) projectId = parsed.project_id;
      if (parsed.private_key) rawKey = parsed.private_key;
    } catch {
      // ignore
    }
  }

  const configured = Boolean(projectId && serviceAccount && rawKey);
  return {
    configured,
    projectId,
    serviceAccount,
    hasPrivateKey: Boolean(rawKey),
  };
}

/**
 * Initializes and returns an authenticated JWT client for Earth Engine.
 */
export async function getEarthEngineAuth(): Promise<JWT | null> {
  const config = checkGeeConfiguration();
  if (!config.configured || !config.serviceAccount || !config.projectId) {
    return null;
  }

  if (cachedAuthClient) {
    return cachedAuthClient;
  }

  const canonicalKey = getCanonicalPrivateKey();
  if (!canonicalKey) {
    lastAuthError = 'Could not decode RSA Private Key from GEE_PRIVATE_KEY. Check format.';
    return null;
  }

  try {
    const authClient = new JWT({
      email: config.serviceAccount,
      key: canonicalKey,
      scopes: ['https://www.googleapis.com/auth/earthengine'],
    });

    // Authorize and acquire access token
    await authClient.authorize();
    cachedAuthClient = authClient;
    lastAuthError = null;
    return cachedAuthClient;
  } catch (err: any) {
    lastAuthError = err.message || 'Authorization failed';
    cachedAuthClient = null;
    return null;
  }
}

/**
 * Initializes the Earth Engine Node.js client SDK.
 */
export async function initializeEarthEngineSdk(): Promise<boolean> {
  if (isEeSdkInitialized) return true;
  if (eeSdkInitPromise) return eeSdkInitPromise;

  eeSdkInitPromise = new Promise(async (resolve) => {
    const config = checkGeeConfiguration();
    if (!config.configured || !config.serviceAccount || !config.projectId) {
      resolve(false);
      return;
    }

    const canonicalKey = getCanonicalPrivateKey();
    if (!canonicalKey) {
      lastSdkInitError = 'Invalid RSA Private Key format';
      resolve(false);
      return;
    }

    const privateKey = {
      client_email: config.serviceAccount,
      private_key: canonicalKey,
    };

    try {
      ee.data.authenticateViaPrivateKey(
        privateKey,
        () => {
          ee.initialize(
            null,
            null,
            () => {
              isEeSdkInitialized = true;
              lastSdkInitError = null;
              resolve(true);
            },
            (err: any) => {
              const errMsg = err?.message || String(err);
              lastSdkInitError = errMsg;
              console.warn('[GEE SDK] ee.initialize failed:', errMsg);
              eeSdkInitPromise = null; // Allow retry on subsequent attempts
              resolve(false);
            },
            null,
            config.projectId
          );
        },
        (err: any) => {
          const errMsg = err?.message || String(err);
          lastSdkInitError = errMsg;
          console.warn('[GEE SDK] authenticateViaPrivateKey failed:', errMsg);
          eeSdkInitPromise = null;
          resolve(false);
        }
      );
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      lastSdkInitError = errMsg;
      console.warn('[GEE SDK] Error in SDK initialization:', errMsg);
      eeSdkInitPromise = null;
      resolve(false);
    }
  });

  return eeSdkInitPromise;
}

/**
 * Verifies live connection status with Google Earth Engine.
 */
export async function verifyEarthEngineStatus(): Promise<GeeStatusInfo> {
  const config = checkGeeConfiguration();
  const datasets = [
    'COPERNICUS/S2_SR_HARMONIZED (Sentinel-2 10m Multi-spectral: NDVI, NDWI, NDBI)',
    'LANDSAT/LC08/C02/T1_L2 & LANDSAT/LC09/C02/T1_L2 (Landsat 8/9 Thermal Band ST_B10: LST)',
    'GOOGLE/DYNAMICWORLD/V1 (Dynamic World 10m Near-Real-Time LULC)',
  ];
  const timePeriods = {
    currentPeriod: '2025-01-01 to 2026-01-01 (Current Observation)',
    previousPeriod: '2023-01-01 to 2024-01-01 (Previous Comparison)',
    baselinePeriod: '2021-01-01 to 2022-01-01 (Baseline Trajectory)',
  };

  if (!config.configured) {
    return {
      configured: false,
      connected: false,
      hasPrivateKey: config.hasPrivateKey,
      message: 'DEMO MODE — Earth Engine credentials not configured in environment (GEE_PROJECT_ID, GEE_SERVICE_ACCOUNT, GEE_PRIVATE_KEY required).',
      datasets,
      timePeriods,
    };
  }

  // Check cooldown if recently quota restricted
  const now = Date.now();
  if (now - lastQuotaExceededTime < QUOTA_COOLDOWN_MS) {
    return {
      configured: true,
      connected: false,
      projectId: config.projectId,
      serviceAccount: config.serviceAccount,
      hasPrivateKey: config.hasPrivateKey,
      quotaRestricted: true,
      error: 'RESOURCE_EXHAUSTED / Quota limit reached',
      message: 'Google Earth Engine project has exceeded noncommercial compute quota or is in restricted mode.',
      datasets,
      timePeriods,
    };
  }

  try {
    const auth = await getEarthEngineAuth();
    if (!auth) {
      return {
        configured: true,
        connected: false,
        projectId: config.projectId,
        serviceAccount: config.serviceAccount,
        hasPrivateKey: config.hasPrivateKey,
        error: lastAuthError || 'Authentication failed',
        message: lastAuthError
          ? `Earth Engine authentication issue: ${lastAuthError}`
          : 'Could not authenticate Service Account key with Earth Engine OAuth2 service.',
        datasets,
        timePeriods,
      };
    }

    // Initialize Earth Engine SDK to verify end-to-end compute and IAM access
    const sdkReady = await initializeEarthEngineSdk();
    if (!sdkReady) {
      const isPermissionError =
        lastSdkInitError?.includes('permission') ||
        lastSdkInitError?.includes('serviceusage') ||
        lastSdkInitError?.includes('roles/serviceusage.serviceUsageConsumer');

      return {
        configured: true,
        connected: false,
        projectId: config.projectId,
        serviceAccount: config.serviceAccount,
        hasPrivateKey: true,
        error: lastSdkInitError || 'Earth Engine SDK initialization failed',
        message: isPermissionError
          ? `Project '${config.projectId}' requires IAM role 'roles/serviceusage.serviceUsageConsumer' granted to service account '${config.serviceAccount}'. Operating with calibrated spatial baseline.`
          : `Earth Engine SDK initialization error: ${lastSdkInitError || 'Permission check failed'}. Operating with calibrated spatial baseline.`,
        datasets,
        timePeriods,
      };
    }

    return {
      configured: true,
      connected: true,
      projectId: config.projectId,
      serviceAccount: config.serviceAccount,
      hasPrivateKey: true,
      message: 'Google Earth Engine credentials verified. Live satellite computation pipeline active.',
      datasets,
      timePeriods,
    };
  } catch (err: any) {
    const isQuota = err.message?.includes('quota') || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
    if (isQuota) {
      lastQuotaExceededTime = Date.now();
    }
    return {
      configured: true,
      connected: false,
      projectId: config.projectId,
      serviceAccount: config.serviceAccount,
      hasPrivateKey: true,
      quotaRestricted: isQuota,
      error: err.message || 'Connection test failed',
      message: isQuota
        ? 'Earth Engine project noncommercial compute quota exceeded. Gracefully handled.'
        : `Earth Engine connection failed: ${err.message}`,
      datasets,
      timePeriods,
    };
  }
}

/**
 * Evaluates an Earth Engine object into a typed JavaScript Promise.
 */
export function eeEvaluate<T>(eeObject: any): Promise<T> {
  return new Promise((resolve, reject) => {
    eeObject.evaluate((result: T, error: any) => {
      if (error) {
        reject(new Error(typeof error === 'string' ? error : JSON.stringify(error)));
      } else {
        resolve(result);
      }
    });
  });
}

export interface AnnualSatelliteObservation {
  year: number;
  period: string; // "2021", "2022", "2023", "2024", "2025", "2026 YTD"
  isYtd: boolean;
  ndviMean: number | null;
  waterNdwiMean: number | null;
  waterPixelCount: number;
  changeFraction: number | null;
  builtUpFraction: number | null;
  lstMean: number | null;
  ndbiMean: number | null;
  hasData: boolean;
}

export interface LiveGeeHotspotCluster {
  id: string;
  name: string;
  lat: number;
  lng: number;
  areaKm2: number;
  radiusMeters: number;
  pixelCount: number;
  meanNdvi: number | null;
  meanLst: number | null;
  meanNdbi: number | null;
  level3Count: number;
  severityClass: 0 | 1 | 2 | 3;
  severityLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  severityScore: number;
  severityColor: string;
  isHeatStress: boolean;
  isVegetationStress: boolean;
  isBuiltUpStress: boolean;
  isExtremeHeat: boolean;
  primaryDrivers: string[];
}

export interface LiveGeeReductionResults {
  // Current 2025 observation
  ndviMean: number | null;
  ndviP10: number | null;
  waterNdwiMean: number | null;
  waterPixelCount: number;
  changeFraction: number | null;
  builtUpFraction: number | null;
  lstMean: number | null;
  lstP90: number | null;
  lstP95: number | null;
  ndbiMean: number | null;
  ndbiP90: number | null;

  // Previous 2023 observation
  ndvi2023Mean: number | null;
  waterNdwi2023Mean: number | null;
  waterPixelCount2023: number;
  changeFraction2023: number | null;
  builtUpFraction2023: number | null;
  lst2023Mean: number | null;

  // Baseline 2021 observation
  ndvi2021Mean: number | null;
  waterNdwi2021Mean: number | null;
  builtUpFraction2021: number | null;
  lst2021Mean: number | null;

  // Genuine Annual Observations (2021, 2022, 2023, 2024, 2025, 2026 YTD)
  annualObservations: AnnualSatelliteObservation[];

  // Genuine GEE Spatial Hotspot Clusters
  hotspotClusters: LiveGeeHotspotCluster[];
}

/**
 * Computes all 5 EarthPulse satellite indicators via an optimized, capacity-efficient Earth Engine reduction pipeline.
 */
export async function executeLiveGeeSatelliteReduction(
  lat: number,
  lng: number,
  radiusKm = 5
): Promise<LiveGeeReductionResults> {
  const cacheKey = getCacheKey(lat, lng, radiusKm);

  // 1. Check in-memory cache for instant spatial reuse
  const cached = reductionCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < GEE_CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Request coalescing: reuse in-flight Promise if identical location requested concurrently
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const reductionPromise = (async () => {
    const sdkReady = await initializeEarthEngineSdk();
    if (!sdkReady) {
      throw new Error('Earth Engine SDK could not be initialized.');
    }

    const point = ee.Geometry.Point([lng, lat]);
    const region = point.buffer(radiusKm * 1000);

    // =========================================================================
    // STREAMLINED COMPOSITE GENERATION WITH PRE-FILTERING ACROSS 2021-2026 YTD
    // =========================================================================
    const buildS2Composite = (startDate: string, endDate: string) => {
      const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(region)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 25))
        .sort('CLOUDY_PIXEL_PERCENTAGE')
        .limit(15);

      const medianBands = collection.map((img: any) => {
        const scl = img.select('SCL');
        const mask = scl.neq(1).and(scl.neq(2)).and(scl.neq(3)).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
        return img.select(['B3', 'B4', 'B8', 'B11']).updateMask(mask);
      }).median();

      const ndvi = medianBands.normalizedDifference(['B8', 'B4']).rename('NDVI');
      const ndwi = medianBands.normalizedDifference(['B3', 'B8']).rename('NDWI');
      const ndbi = medianBands.normalizedDifference(['B11', 'B8']).rename('NDBI');

      return medianBands.addBands([ndvi, ndwi, ndbi]);
    };

    const getDwMode = (startDate: string, endDate: string) => {
      return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
        .filterBounds(region)
        .filterDate(startDate, endDate)
        .limit(25)
        .select('label')
        .reduce(ee.Reducer.mode());
    };

    const buildLstComposite = (startDate: string, endDate: string) => {
      const l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
        .filterBounds(region)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt('CLOUD_COVER', 25))
        .limit(10);

      const l9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
        .filterBounds(region)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt('CLOUD_COVER', 25))
        .limit(10);

      const rawThermalMedian = l8.merge(l9).map((img: any) => {
        const qa = img.select('QA_PIXEL');
        const mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
        return img.select('ST_B10').updateMask(mask);
      }).median();

      return rawThermalMedian
        .multiply(0.00341802)
        .add(149.0)
        .subtract(273.15)
        .rename('LST');
    };

    const annualYears = [2021, 2022, 2023, 2024, 2025, 2026];
    let compositeToReduce = ee.Image();

    const dwModes: Record<number, any> = {};

    const todayIso = new Date().toISOString().slice(0, 10);

    for (const yr of annualYears) {
      const startDate = `${yr}-01-01`;
      const endDate = yr === 2026 ? todayIso : `${yr + 1}-01-01`;

      const s2 = buildS2Composite(startDate, endDate);
      const dwMode = getDwMode(startDate, endDate).rename(`label_${yr}`);
      dwModes[yr] = dwMode;

      const builtMask = dwMode.eq(6).rename(`built_${yr}`);
      const waterMask = dwMode.eq(0);
      const waterNdwi = s2.select('NDWI').updateMask(waterMask).rename(`water_NDWI_${yr}`);
      const lst = buildLstComposite(startDate, endDate).rename(`LST_${yr}`);

      const s2Ndvi = s2.select('NDVI').rename(`NDVI_${yr}`);
      const s2Ndbi = s2.select('NDBI').rename(`NDBI_${yr}`);

      compositeToReduce = compositeToReduce.addBands([
        s2Ndvi,
        s2Ndbi,
        waterNdwi,
        builtMask,
        lst,
        dwMode,
      ]);
    }

    // Inter-annual Land-Use Stability Change Detection
    for (let i = 1; i < annualYears.length; i++) {
      const yr = annualYears[i];
      const prevYr = annualYears[i - 1];
      const dwCurr = dwModes[yr];
      const dwPrev = dwModes[prevYr];
      const changed = dwPrev.neq(dwCurr).rename(`changed_${yr}`);
      const valid = dwPrev.mask().and(dwCurr.mask());
      compositeToReduce = compositeToReduce.addBands(changed.updateMask(valid));
    }

    // Baseline change proxy for 2021
    const changed2021 = dwModes[2021].neq(dwModes[2022]).rename('changed_2021');
    compositeToReduce = compositeToReduce.addBands(changed2021.updateMask(dwModes[2021].mask()));

    // =========================================================================
    // GENUINE GEE SPATIAL ENVIRONMENTAL STRESS HOTSPOT EXTRACTION (2025)
    // =========================================================================
    const s2_2025 = buildS2Composite('2025-01-01', '2026-01-01');
    const s2Ndvi_2025 = s2_2025.select('NDVI');
    const s2Ndbi_2025 = s2_2025.select('NDBI');
    const lst_2025 = buildLstComposite('2025-01-01', '2026-01-01');

    // Multi-criteria compound stress masks from actual satellite observations:
    // 1. Heat stress: LST >= 32.0°C
    // 2. Veg stress: NDVI <= 0.35
    // 3. Built/impervious stress: NDBI >= -0.05
    const heatStressMask = lst_2025.gte(32.0);
    const vegStressMask = s2Ndvi_2025.lte(0.35);
    const builtStressMask = s2Ndbi_2025.gte(-0.05);

    const compoundStress = heatStressMask.add(vegStressMask).add(builtStressMask); // values 0..3
    const compoundStressMask = compoundStress.gte(2);

    // Contiguous spatial cluster filter: at least 15 connected 30m pixels (~1.35 hectares)
    const connectedStressMask = compoundStressMask.connectedPixelCount(100, true).gte(15).and(compoundStressMask);

    // Convert contiguous connected stress clusters into individual vector polygons
    const stressVectors = connectedStressMask.selfMask().reduceToVectors({
      geometry: region,
      crs: 'EPSG:4326',
      scale: 30,
      geometryType: 'polygon',
      eightConnected: true,
      labelProperty: 'stress_val',
      reducer: ee.Reducer.countEvery(),
      maxPixels: 1e7,
      bestEffort: true,
      tileScale: 2,
    });

    // Filter clusters to ensure minimum connected size (at least 15 pixels, ~1.35 ha)
    const qualifyingClusters = stressVectors.filter(ee.Filter.gte('count', 15));

    // Sort by count (area) descending and limit to top significant individual clusters (up to 8)
    const topClusters = qualifyingClusters.sort('count', false).limit(8);

    // Multi-band driver image to reduce over each individual polygon
    const clusterDriverImage = ee.Image.cat([
      lst_2025.rename('mean_lst'),
      s2Ndvi_2025.rename('mean_ndvi'),
      s2Ndbi_2025.rename('mean_ndbi'),
      heatStressMask.rename('heat_frac'),
      vegStressMask.rename('veg_frac'),
      builtStressMask.rename('built_frac'),
      compoundStress.gte(3).rename('l3_frac'),
    ]);

    // Sample mean driver values across each polygon
    const clustersWithStats = clusterDriverImage.reduceRegions({
      collection: topClusters,
      reducer: ee.Reducer.mean(),
      scale: 30,
      tileScale: 2,
    });

    // Compute genuine GEE polygon centroid coordinates and genuine polygon area
    const enrichedClusters = clustersWithStats.map((feature: any) => {
      const geom = feature.geometry();
      const centroid = geom.centroid(1);
      const coords = centroid.coordinates();
      const areaM2 = geom.area(1);
      return feature.set({
        centroid_lng: coords.get(0),
        centroid_lat: coords.get(1),
        area_m2: areaM2,
        area_km2: ee.Number(areaM2).divide(1e6),
      });
    });

    const primaryReducer = ee.Reducer.mean().combine({
      reducer2: ee.Reducer.count(),
      sharedInputs: true,
    });

    const primaryStatsPromise = eeEvaluate<Record<string, number | null>>(
      compositeToReduce.reduceRegion({
        reducer: primaryReducer,
        geometry: region,
        scale: 30,
        maxPixels: 1e8,
        bestEffort: true,
      })
    );

    // Lean 3-band hotspot sub-composite for percentiles (10, 90, 95) on 2025 operational window
    const hotspotSubComposite = compositeToReduce.select(['NDVI_2025', 'NDBI_2025', 'LST_2025']);
    const percentileStatsPromise = eeEvaluate<Record<string, number | null>>(
      hotspotSubComposite.reduceRegion({
        reducer: ee.Reducer.percentile([10, 90, 95]),
        geometry: region,
        scale: 30,
        maxPixels: 1e8,
        bestEffort: true,
      })
    );

    const clustersPromise = eeEvaluate<any>(enrichedClusters).catch((err) => {
      console.warn('[GEE Live] Cluster extraction notice:', err.message || err);
      return { type: 'FeatureCollection', features: [] };
    });

    const [stats, pStats, rawClusterFc] = await Promise.all([
      primaryStatsPromise,
      percentileStatsPromise,
      clustersPromise,
    ]);

    const annualObservations: AnnualSatelliteObservation[] = annualYears.map((yr) => {
      const isYtd = yr === 2026;
      const ndviMean = stats[`NDVI_${yr}_mean`] ?? null;
      const waterNdwiMean = stats[`water_NDWI_${yr}_mean`] ?? null;
      const waterPixelCount = Number(stats[`water_NDWI_${yr}_count`] ?? 0);
      const changeFraction = stats[`changed_${yr}_mean`] ?? null;
      const builtUpFraction = stats[`built_${yr}_mean`] ?? null;
      const lstMean = stats[`LST_${yr}_mean`] ?? null;
      const ndbiMean = stats[`NDBI_${yr}_mean`] ?? null;

      const hasData = ndviMean !== null || lstMean !== null || builtUpFraction !== null;

      return {
        year: yr,
        period: isYtd ? '2026 YTD' : `${yr}`,
        isYtd,
        ndviMean,
        waterNdwiMean,
        waterPixelCount,
        changeFraction,
        builtUpFraction,
        lstMean,
        ndbiMean,
        hasData,
      };
    });

    const hotspotClusters: LiveGeeHotspotCluster[] = [];
    const rawFeatures = rawClusterFc?.features || [];

    rawFeatures.forEach((feat: any, idx: number) => {
      const props = feat.properties || {};
      const pixelCount = Number(props.count ?? 0);
      const clusterLat = Number(props.centroid_lat);
      const clusterLng = Number(props.centroid_lng);

      if (!isNaN(clusterLat) && !isNaN(clusterLng) && (pixelCount >= 15 || props.area_m2 >= 13500)) {
        const areaM2 = Number(props.area_m2 || (pixelCount * 900));
        const areaKm2 = Math.round((Number(props.area_km2 || (areaM2 / 1e6))) * 100) / 100;
        const radiusMeters = Math.round(Math.sqrt(areaM2 / Math.PI));

        const meanLst = props.mean_lst !== undefined && props.mean_lst !== null ? Number(props.mean_lst) : null;
        const meanNdvi = props.mean_ndvi !== undefined && props.mean_ndvi !== null ? Number(props.mean_ndvi) : null;
        const meanNdbi = props.mean_ndbi !== undefined && props.mean_ndbi !== null ? Number(props.mean_ndbi) : null;
        const heatFrac = Number(props.heat_frac ?? 0);
        const vegFrac = Number(props.veg_frac ?? 0);
        const builtFrac = Number(props.built_frac ?? 0);
        const l3Frac = Number(props.l3_frac ?? 0);
        const l3Count = Math.round(l3Frac * pixelCount);

        const isHeatStress = (meanLst !== null && meanLst >= 32.0) || heatFrac >= 0.4;
        const isVegetationStress = (meanNdvi !== null && meanNdvi <= 0.35) || vegFrac >= 0.4;
        const isBuiltUpStress = (meanNdbi !== null && meanNdbi >= -0.05) || builtFrac >= 0.4;
        const isExtremeHeat = (meanLst !== null && meanLst >= 38.0) || l3Frac >= 0.25;

        let stressCount = 0;
        if (isHeatStress) stressCount++;
        if (isVegetationStress) stressCount++;
        if (isBuiltUpStress) stressCount++;

        let severityClass: 0 | 1 | 2 | 3 = 1;
        let severityLevel: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Moderate';
        let severityColor = '#F4C95D';

        if (l3Frac >= 0.35 || (stressCount >= 3 && isExtremeHeat)) {
          severityClass = 3;
          severityLevel = 'Critical';
          severityColor = '#FF4D5A';
        } else if (stressCount >= 3 || (stressCount >= 2 && isExtremeHeat)) {
          severityClass = 2;
          severityLevel = 'High';
          severityColor = '#FF9F43';
        } else if (stressCount >= 2) {
          severityClass = 1;
          severityLevel = 'Moderate';
          severityColor = '#F4C95D';
        }

        const severityScore = Math.min(
          100,
          Math.round(50 + severityClass * 14 + l3Frac * 15 + (meanLst ? Math.min(10, Math.max(0, meanLst - 30)) : 0))
        );

        const drivers: string[] = [];
        if (isHeatStress && meanLst !== null) drivers.push(`Surface Heat (${meanLst.toFixed(1)}°C)`);
        if (isVegetationStress && meanNdvi !== null) drivers.push(`Canopy Stress (NDVI ${meanNdvi.toFixed(2)})`);
        if (isBuiltUpStress && meanNdbi !== null) drivers.push(`Impervious Expansion (NDBI ${meanNdbi > 0 ? '+' : ''}${meanNdbi.toFixed(2)})`);
        if (isExtremeHeat) drivers.push('Elevated Thermal Peak');

        // Directional & functional cluster designation based on genuine centroid offset
        const dLat = clusterLat - lat;
        const dLng = clusterLng - lng;
        let dirPrefix = 'Central';
        if (Math.abs(dLat) > 0.003 || Math.abs(dLng) > 0.003) {
          const latPart = dLat >= 0.002 ? 'North' : dLat <= -0.002 ? 'South' : '';
          const lngPart = dLng >= 0.002 ? 'east' : dLng <= -0.002 ? 'west' : '';
          dirPrefix = latPart && lngPart ? `${latPart}${lngPart}ern` : latPart ? `${latPart}ern` : lngPart ? (lngPart === 'east' ? 'Eastern' : 'Western') : 'Central';
        }

        let typeName = 'Environmental Stress Cluster';
        if (isHeatStress && isBuiltUpStress) typeName = 'Thermal / Impervious Core';
        else if (isHeatStress) typeName = 'Thermal Anomaly Zone';
        else if (isVegetationStress) typeName = 'Canopy Depletion Corridor';

        const clusterName = `${dirPrefix} ${typeName} #${idx + 1}`;

        hotspotClusters.push({
          id: `gee-cluster-${idx + 1}`,
          name: clusterName,
          lat: Math.round(clusterLat * 100000) / 100000,
          lng: Math.round(clusterLng * 100000) / 100000,
          areaKm2,
          radiusMeters,
          pixelCount,
          meanNdvi: meanNdvi !== null ? Math.round(meanNdvi * 100) / 100 : null,
          meanLst: meanLst !== null ? Math.round(meanLst * 10) / 10 : null,
          meanNdbi: meanNdbi !== null ? Math.round(meanNdbi * 100) / 100 : null,
          level3Count: l3Count,
          severityClass,
          severityLevel,
          severityScore,
          severityColor,
          isHeatStress,
          isVegetationStress,
          isBuiltUpStress,
          isExtremeHeat,
          primaryDrivers: drivers,
        });
      }
    });

    const result: LiveGeeReductionResults = {
      ndviMean: stats['NDVI_2025_mean'] ?? null,
      ndviP10: pStats['NDVI_2025_p10'] ?? null,
      waterNdwiMean: stats['water_NDWI_2025_mean'] ?? null,
      waterPixelCount: Number(stats['water_NDWI_2025_count'] ?? 0),
      changeFraction: stats['changed_2025_mean'] ?? null,
      builtUpFraction: stats['built_2025_mean'] ?? null,
      lstMean: stats['LST_2025_mean'] ?? null,
      lstP90: pStats['LST_2025_p90'] ?? null,
      lstP95: pStats['LST_2025_p95'] ?? null,
      ndbiMean: stats['NDBI_2025_mean'] ?? null,
      ndbiP90: pStats['NDBI_2025_p90'] ?? null,

      ndvi2023Mean: stats['NDVI_2023_mean'] ?? null,
      waterNdwi2023Mean: stats['water_NDWI_2023_mean'] ?? null,
      waterPixelCount2023: Number(stats['water_NDWI_2023_count'] ?? 0),
      changeFraction2023: stats['changed_2023_mean'] ?? null,
      builtUpFraction2023: stats['built_2023_mean'] ?? null,
      lst2023Mean: stats['LST_2023_mean'] ?? null,

      ndvi2021Mean: stats['NDVI_2021_mean'] ?? null,
      waterNdwi2021Mean: stats['water_NDWI_2021_mean'] ?? null,
      builtUpFraction2021: stats['built_2021_mean'] ?? null,
      lst2021Mean: stats['LST_2021_mean'] ?? null,

      annualObservations,
      hotspotClusters,
    };

    if (reductionCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = reductionCache.keys().next().value;
      if (oldestKey) reductionCache.delete(oldestKey);
    }
    reductionCache.set(cacheKey, { timestamp: Date.now(), data: result });

    return result;
  })();

  inFlightRequests.set(cacheKey, reductionPromise);

  try {
    const res = await reductionPromise;
    return res;
  } catch (err: any) {
    const isQuotaOrCapacity =
      err.message?.includes('capacity') ||
      err.message?.includes('memory') ||
      err.message?.includes('quota') ||
      err.message?.includes('429') ||
      err.message?.includes('RESOURCE_EXHAUSTED');
    if (isQuotaOrCapacity) {
      lastQuotaExceededTime = Date.now();
      console.warn('[GEE Capacity Guard] Earth Engine capacity or quota condition detected:', err.message);
    }
    throw err;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

