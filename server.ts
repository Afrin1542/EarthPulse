import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { executeEarthEnginePipeline, isEarthEngineConfigured } from './server/services/earthEngineService';
import { verifyEarthEngineStatus } from './server/services/geeLiveService';
import { generateEnvironmentalExplanation } from './server/services/geminiService';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'EarthPulse Satellite Environmental Health Monitoring',
    version: '2.6.4',
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasEarthEngine: isEarthEngineConfigured(),
    timestamp: new Date().toISOString(),
  });
});

// Earth Engine status and configuration diagnostics endpoint
app.get('/api/status', async (req: Request, res: Response) => {
  try {
    const statusInfo = await verifyEarthEngineStatus();
    res.json({
      service: 'EarthPulse',
      version: '2.6.4',
      earthEngine: {
        configured: statusInfo.configured,
        connected: statusInfo.connected,
        serviceAccount: statusInfo.serviceAccount ? `${statusInfo.serviceAccount.substring(0, 8)}...` : undefined,
        projectId: statusInfo.projectId,
        statusMessage: statusInfo.message,
        error: statusInfo.error,
        quotaRestricted: statusInfo.quotaRestricted,
      },
      datasets: statusInfo.datasets,
      timePeriods: statusInfo.timePeriods,
      analysisRadiusDefaultKm: 5,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Status check failed' });
  }
});

// Search locations with Nominatim API + coordinate parser
app.get('/api/locations/search', async (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').trim();
  if (!query || query.length < 2) {
    return res.json({ results: [] });
  }

  // Check if user entered coordinates like "11.95, 77.55" or "12.9716, 77.5946"
  const coordMatch = query.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return res.json({
        results: [
          {
            id: `coord-${lat}-${lng}`,
            name: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            formattedAddress: `Lat: ${lat.toFixed(4)}°, Lng: ${lng.toFixed(4)}°`,
            latitude: lat,
            longitude: lng,
            radiusKm: 5,
            region: 'Custom Location',
            country: 'Earth Observation',
            tag: 'User specified geographic coordinates',
          },
        ],
      });
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=6&addressdetails=1`;

    const fetchRes = await fetch(url, {
      headers: {
        'User-Agent': 'EarthPulse-Environmental-App/2.6 (Hackathon-Project)',
      },
    });

    if (fetchRes.ok) {
      const data: any[] = await fetchRes.json();
      const results = data.map((item) => {
        const addr = item.address || {};
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          item.display_name.split(',')[0];
        const state = addr.state || addr.region || '';
        const country = addr.country || '';

        return {
          id: `osm-${item.place_id}`,
          name: city,
          formattedAddress: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          radiusKm: 5,
          region: state,
          country: country,
          tag: item.type ? `${item.type.replace('_', ' ')}` : 'Geographic region',
        };
      });
      return res.json({ results });
    }
  } catch (err) {
    console.error('Nominatim search error:', err);
  }

  res.json({ results: [] });
});

// Reverse Geocoding Endpoint for Map Coordinate Selection
app.get('/api/locations/reverse', async (req: Request, res: Response) => {
  const latStr = (req.query.lat || req.query.latitude) as string;
  const lngStr = (req.query.lng || req.query.lon || req.query.longitude) as string;

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  }

  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const coordFormatted = `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const fetchRes = await fetch(url, {
      headers: {
        'User-Agent': 'EarthPulse-Environmental-App/2.6 (Hackathon-Project)',
      },
    });

    if (fetchRes.ok) {
      const data = await fetchRes.json();
      const addr = data.address || {};

      const primary =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.suburb ||
        addr.hamlet ||
        addr.county ||
        addr.state_district ||
        addr.state ||
        data.display_name?.split(',')[0] ||
        'Selected Location';

      const state = addr.state || addr.region || '';
      const country = addr.country || '';

      const nameParts: string[] = [primary];
      if (state && state !== primary && !primary.includes(state)) {
        nameParts.push(state);
      }
      if (country && country !== state && country !== primary && !primary.includes(country)) {
        nameParts.push(country);
      }

      const placeName = nameParts.join(', ');

      return res.json({
        id: `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
        name: placeName,
        fullNameWithCoords: `${placeName} (${coordFormatted})`,
        formattedAddress: data.display_name || `${placeName} (${coordFormatted})`,
        latitude: lat,
        longitude: lng,
        radiusKm: 5,
        region: state,
        country: country,
        tag: data.type ? `${data.type.replace('_', ' ')}` : 'Map Selected Target',
      });
    }
  } catch (err) {
    console.warn('Reverse geocode query error:', err);
  }

  return res.json({
    id: `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
    name: `Observation Zone (${coordFormatted})`,
    fullNameWithCoords: `Observation Zone (${coordFormatted})`,
    formattedAddress: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
    latitude: lat,
    longitude: lng,
    radiusKm: 5,
    tag: 'Custom Selected Coordinate',
  });
});

// Google Earth Engine service status
app.get('/api/gee-status', async (req: Request, res: Response) => {
  const statusInfo = await verifyEarthEngineStatus();

  res.json({
    connected: statusInfo.connected,
    status: statusInfo.connected
      ? 'GEE_AUTHENTICATED'
      : statusInfo.quotaRestricted
      ? 'QUOTA_RESTRICTED'
      : statusInfo.configured
      ? 'IAM_CONFIG_REQUIRED'
      : 'DEMO_STANDALONE',
    message: statusInfo.message,
    error: statusInfo.error,
    projectId: statusInfo.projectId,
    serviceAccount: statusInfo.serviceAccount,
    datasets: statusInfo.datasets,
    timePeriods: statusInfo.timePeriods,
  });
});

// Primary Analysis Endpoint
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius, radiusKm, customWeights, name, formattedAddress } = req.body;
    const lat = typeof latitude === 'number' ? latitude : 11.95;
    const lng = typeof longitude === 'number' ? longitude : 77.55;
    
    // Handle radius in meters (e.g. 5000 -> 5 km) or radiusKm
    let computedRadiusKm = 5;
    if (typeof radius === 'number') {
      computedRadiusKm = radius > 100 ? radius / 1000 : radius;
    } else if (typeof radiusKm === 'number') {
      computedRadiusKm = radiusKm;
    }

    const analysisResult = await executeEarthEnginePipeline(
      lat,
      lng,
      computedRadiusKm,
      customWeights,
      name,
      formattedAddress
    );

    res.json(analysisResult);
  } catch (err: any) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message || 'Environmental calculation failed' });
  }
});

// Backward compatibility alias for /api/analysis
app.post('/api/analysis', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius, radiusKm, customWeights, name, formattedAddress } = req.body;
    const lat = typeof latitude === 'number' ? latitude : 11.95;
    const lng = typeof longitude === 'number' ? longitude : 77.55;

    let computedRadiusKm = 5;
    if (typeof radius === 'number') {
      computedRadiusKm = radius > 100 ? radius / 1000 : radius;
    } else if (typeof radiusKm === 'number') {
      computedRadiusKm = radiusKm;
    }

    const analysisResult = await executeEarthEnginePipeline(
      lat,
      lng,
      computedRadiusKm,
      customWeights,
      name,
      formattedAddress
    );

    res.json(analysisResult);
  } catch (err: any) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message || 'Environmental calculation failed' });
  }
});

// Explain Analysis with Gemini 3.7 Flash
app.post('/api/explain', async (req: Request, res: Response) => {
  try {
    const analysis = req.body;
    if (!analysis || !analysis.location) {
      return res.status(400).json({ error: 'Missing analysis result body' });
    }

    const insights = await generateEnvironmentalExplanation(analysis);
    res.json(insights);
  } catch (err: any) {
    console.error('Explain error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate explanation' });
  }
});

// AI Insights backward compatibility
app.post('/api/ai-insights', async (req: Request, res: Response) => {
  try {
    const analysis = req.body;
    if (analysis && analysis.location) {
      const insights = await generateEnvironmentalExplanation(analysis);
      return res.json(insights);
    }
    res.json({ aiGenerated: false, summary: 'Satellite analysis completed.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Assets
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌍 EarthPulse server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

