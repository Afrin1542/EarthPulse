import { GoogleGenAI } from '@google/genai';
import { AnalysisResult, PlainLanguageInsights } from '../../src/types';

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function generateEnvironmentalExplanation(
  analysis: AnalysisResult
): Promise<PlainLanguageInsights> {
  const ai = getAI();
  const { location, score, indicators, hotspots, trends } = analysis;

  // Fallback if no API key or call fails
  const fallbackInsights: PlainLanguageInsights = {
    summary: `The environmental health score for ${location.name} is ${score.overallScore}/100 (${score.statusBand}), showing a ${score.direction.toLowerCase()} trajectory compared with the 2023 observation window (${score.scoreChange > 0 ? '+' : ''}${score.scoreChange} points).`,
    strongestPositive: `${score.primaryDrivers.split(' and ')[0]} provides the strongest positive stabilization in this 5 km buffer.`,
    strongestConcern: `${score.primaryDrivers.split(' and ')[1] || 'Thermal variability'} represents the primary environmental pressure factor.`,
    hotspotExplanation: hotspots.totalHotspotAreaKm2 > 0
      ? `Satellite analysis identified ${hotspots.totalHotspotAreaKm2} km² of environmental stress clusters across ${hotspots.zones.length} zones driven by coincident thermal and canopy stress.`
      : 'No significant multi-stress environmental hotspots detected in the 5 km analysis buffer.',
    monitoringPriorities: [
      'Maintain continuous quarterly multi-spectral monitoring across canopy and thermal zones.',
      'Protect existing riparian and vegetation buffers from localized fragmentation.',
      'Track impervious surface expansion along buffer boundaries to limit runoff and thermal build-up.',
    ],
    aiGenerated: false,
  };

  if (!ai) {
    return fallbackInsights;
  }

  try {
    const prompt = `You are EarthPulse's chief satellite environmental scientist.
Analyze the following multi-spectral satellite results for "${location.formattedAddress}" (5 km radius buffer):

- Environmental Health Score: ${score.overallScore}/100 (${score.statusBand})
- Comparison: Previous period (2023) = ${score.previousScore}/100, Current period (2025) = ${score.currentScore}/100 (Change: ${score.scoreChange > 0 ? '+' : ''}${score.scoreChange} pts, ${score.direction})
- Satellite Indicators:
  * Vegetation Cover (NDVI): Score ${indicators.vegetation.score}/100 (Raw: ${indicators.vegetation.rawValue}, Trend: ${indicators.vegetation.direction})
  * Water-Body Condition (NDWI): Score ${indicators.water.score}/100 (Raw: ${indicators.water.rawValue}, Note: ${indicators.water.waterStatusNote || 'Assessed'})
  * Land-Use Stability: Score ${indicators.landUse.score}/100 (Raw: ${indicators.landUse.rawValue})
  * Built-Up Control: Score ${indicators.builtUp.score}/100 (Raw: ${indicators.builtUp.rawValue})
  * Surface Temperature (Landsat LST): Score ${indicators.temperature.score}/100 (Raw: ${indicators.temperature.rawValue})
- Supporting NDBI: ${analysis.supportingNdbi?.rawValue || 'Observed'}
- Hotspot Triage:
  * Total Stress Hotspot Area: ${hotspots.totalHotspotAreaKm2} km² (Moderate: ${hotspots.areaModerateKm2} km², High: ${hotspots.areaHighKm2} km², Critical: ${hotspots.areaCriticalKm2} km²)
  * Top Priority: ${hotspots.topPriority ? `${hotspots.topPriority.name} (${hotspots.topPriority.severityLevel} - ${hotspots.topPriority.primaryDrivers.join(', ')})` : 'None'}
  * Adaptive Thresholds: LST 90th: ${hotspots.thresholds.lst90th}°C, LST 95th: ${hotspots.thresholds.lst95th}°C, NDVI 10th: ${hotspots.thresholds.ndvi10th}, NDBI 90th: ${hotspots.thresholds.ndbi90th}

Instructions:
1. Use cautious, objective, scientific language based strictly on the satellite data provided.
2. Clearly identify:
   - Overall environmental condition
   - Strongest positive indicator
   - Strongest concern
   - Hotspot explanation
   - Environmental monitoring priorities
3. Do NOT make medical, regulatory, or unsupported claims.
4. Hotspot severity is a composite indicator of environmental stress, not a regulatory designation.

Return ONLY a valid JSON object matching this schema:
{
  "summary": "1-2 sentence objective summary of overall environmental condition and trajectory",
  "strongestPositive": "1-2 sentence description of the strongest positive indicator and what it indicates",
  "strongestConcern": "1-2 sentence description of the strongest environmental pressure/concern",
  "hotspotExplanation": "1-2 sentence explanation of the detected hotspot zones and stress drivers",
  "monitoringPriorities": [
    "Priority 1 for environmental monitoring",
    "Priority 2 for environmental monitoring",
    "Priority 3 for environmental monitoring"
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      summary: parsed.summary || fallbackInsights.summary,
      strongestPositive: parsed.strongestPositive || fallbackInsights.strongestPositive,
      strongestConcern: parsed.strongestConcern || fallbackInsights.strongestConcern,
      hotspotExplanation: parsed.hotspotExplanation || fallbackInsights.hotspotExplanation,
      monitoringPriorities: parsed.monitoringPriorities || fallbackInsights.monitoringPriorities,
      aiGenerated: true,
    };
  } catch (err) {
    console.error('Gemini explanation error:', err);
    return fallbackInsights;
  }
}
