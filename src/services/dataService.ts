import {
  LocationData,
  AnalysisResult,
  TrendAnalysis,
  HotspotSummary,
  IndicatorType,
  PlainLanguageInsights,
} from '../types';
import { generateDemoAnalysis, PRESET_LOCATIONS } from './demoDataProvider';
import { OFFICIAL_WEIGHTS } from './scoringEngine';

export interface DataProvider {
  id: string;
  name: string;
  isDemo: boolean;
  getAnalysis(
    location: LocationData,
    customWeights?: Record<IndicatorType, number>
  ): Promise<AnalysisResult>;
  getTrends(location: LocationData): Promise<TrendAnalysis>;
  getHotspots(location: LocationData): Promise<HotspotSummary>;
  checkConnection(): Promise<{ connected: boolean; status: string; message: string }>;
}

export class DemoDataProviderImpl implements DataProvider {
  id = 'demo';
  name = 'EarthPulse Satellite Intelligence Model';
  isDemo = true;

  async getAnalysis(
    location: LocationData,
    customWeights: Record<IndicatorType, number> = OFFICIAL_WEIGHTS
  ): Promise<AnalysisResult> {
    try {
      // First try the backend server analyze endpoint
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          formattedAddress: location.formattedAddress,
          radiusKm: location.radiusKm || 5,
          customWeights,
        }),
      });

      if (response.ok) {
        const data: AnalysisResult = await response.json();
        return data;
      }
    } catch (e) {
      console.warn('Backend /api/analyze call failed, using client-side deterministic model', e);
    }

    // Client-side fallback
    await new Promise((resolve) => setTimeout(resolve, 200));
    return generateDemoAnalysis(location, customWeights);
  }

  async getTrends(location: LocationData): Promise<TrendAnalysis> {
    const analysis = await this.getAnalysis(location);
    return analysis.trends;
  }

  async getHotspots(location: LocationData): Promise<HotspotSummary> {
    const analysis = await this.getAnalysis(location);
    return analysis.hotspots;
  }

  async checkConnection(): Promise<{ connected: boolean; status: string; message: string }> {
    return {
      connected: true,
      status: 'DEMO_READY',
      message: 'Demo dataset engine active. Providing deterministic multi-spectral observations.',
    };
  }
}

export class EarthEngineDataProviderImpl implements DataProvider {
  id = 'gee_live';
  name = 'Google Earth Engine Service Layer';
  isDemo = false;

  async getAnalysis(
    location: LocationData,
    customWeights: Record<IndicatorType, number> = OFFICIAL_WEIGHTS
  ): Promise<AnalysisResult> {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          formattedAddress: location.formattedAddress,
          radiusKm: location.radiusKm || 5,
          customWeights,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const result: AnalysisResult = await response.json();
      return result;
    } catch (err: any) {
      console.warn('Live GEE Provider fallback:', err);
      const fallback = generateDemoAnalysis(location, customWeights);
      fallback.isDemoData = true;
      fallback.dataProviderName = 'Google Earth Engine (Demo Bridge Mode)';
      fallback.statusMessage = 'DEMO MODE — Satellite connection not configured';
      return fallback;
    }
  }

  async getTrends(location: LocationData): Promise<TrendAnalysis> {
    const analysis = await this.getAnalysis(location);
    return analysis.trends;
  }

  async getHotspots(location: LocationData): Promise<HotspotSummary> {
    const analysis = await this.getAnalysis(location);
    return analysis.hotspots;
  }

  async checkConnection(): Promise<{ connected: boolean; status: string; message: string }> {
    try {
      const res = await fetch('/api/gee-status');
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      return {
        connected: false,
        status: 'GEE_UNAVAILABLE',
        message: 'Google Earth Engine endpoint not responding. Demo mode active.',
      };
    } catch (e: any) {
      return {
        connected: false,
        status: 'GEE_OFFLINE',
        message: 'No active Google Earth Engine backend detected. Running in standalone presentation mode.',
      };
    }
  }
}

class EnvironmentalDataService {
  private activeProviderType: 'demo' | 'gee_live' = 'demo';
  private demoProvider = new DemoDataProviderImpl();
  private geeProvider = new EarthEngineDataProviderImpl();
  private currentLocation: LocationData = PRESET_LOCATIONS[0];
  private customWeights: Record<IndicatorType, number> = { ...OFFICIAL_WEIGHTS };
  private listeners: Array<() => void> = [];

  constructor() {
    try {
      const savedProvider = localStorage.getItem('earthpulse_provider');
      if (savedProvider === 'gee_live') {
        this.activeProviderType = 'gee_live';
      }
      const savedWeights = localStorage.getItem('earthpulse_weights');
      if (savedWeights) {
        this.customWeights = JSON.parse(savedWeights);
      }
      const savedLoc = localStorage.getItem('earthpulse_location');
      if (savedLoc) {
        this.currentLocation = JSON.parse(savedLoc);
      }
    } catch (e) {
      // ignore
    }
  }

  getProvider(): DataProvider {
    return this.activeProviderType === 'gee_live' ? this.geeProvider : this.demoProvider;
  }

  getProviderType(): 'demo' | 'gee_live' {
    return this.activeProviderType;
  }

  setProviderType(type: 'demo' | 'gee_live') {
    this.activeProviderType = type;
    try {
      localStorage.setItem('earthpulse_provider', type);
    } catch (e) {}
    this.notify();
  }

  getCurrentLocation(): LocationData {
    return this.currentLocation;
  }

  getLocation(): LocationData {
    return this.currentLocation;
  }

  setCurrentLocation(loc: LocationData) {
    this.currentLocation = loc;
    try {
      localStorage.setItem('earthpulse_location', JSON.stringify(loc));
    } catch (e) {}
    this.notify();
  }

  setLocation(loc: LocationData) {
    this.setCurrentLocation(loc);
  }

  getWeights(): Record<IndicatorType, number> {
    return this.customWeights;
  }

  setWeights(weights: Record<IndicatorType, number>) {
    this.customWeights = weights;
    try {
      localStorage.setItem('earthpulse_weights', JSON.stringify(weights));
    } catch (e) {}
    this.notify();
  }

  resetWeights() {
    this.customWeights = { ...OFFICIAL_WEIGHTS };
    try {
      localStorage.removeItem('earthpulse_weights');
    } catch (e) {}
    this.notify();
  }

  async fetchCurrentAnalysis(locationOverride?: LocationData): Promise<AnalysisResult> {
    const targetLoc = locationOverride || this.currentLocation;
    return this.getProvider().getAnalysis(targetLoc, this.customWeights);
  }

  async getAnalysis(forceRefresh?: boolean, locationOverride?: LocationData): Promise<AnalysisResult> {
    return this.fetchCurrentAnalysis(locationOverride);
  }

  async explainWithAI(analysis: AnalysisResult): Promise<PlainLanguageInsights> {
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysis),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('AI explain error, using default insights', e);
    }
    return analysis.insights;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const dataService = new EnvironmentalDataService();
