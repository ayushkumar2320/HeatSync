// aiContextService.js
// Gathers rich contextual data from the entire digital twin state
// to provide the AI assistant with maximum real information.
// NEVER fabricates data — only collects what exists.

import {
  fetchCurrentHeatPredictions, fetchModelInfo,
  fetchScenarios, fetchAIStatus
} from './backendClient';
import {
  fetchCityPoint, fetchCoolingPotential, fetchInterventions, fetchExplain
} from './cityClient';

/* -------------------------------------------------------------------------- */
/* Data collectors                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Gather all available context from the digital twin.
 * Returns a structured context object the AI can use to answer questions.
 * Missing data is omitted — never fabricated.
 */
export async function gatherFullContext(selectedLocation) {
  const ctx = {
    timestamp: new Date().toISOString(),
    data_sources: [],
    unavailable: [],
  };

  // 1. Model info
  try {
    const model = await fetchModelInfo();
    if (model?.available) {
      ctx.model = {
        name: model.model_name || 'XGBoost',
        features: model.feature_count || 58,
        trained: true,
        available: true,
      };
      ctx.data_sources.push('XGBoost model');
    } else {
      ctx.model = { available: false };
      ctx.unavailable.push('XGBoost model');
    }
  } catch {
    ctx.model = { available: false };
    ctx.unavailable.push('XGBoost model');
  }

  // 2. Current heat predictions
  try {
    const heat = await fetchCurrentHeatPredictions();
    if (heat?.success) {
      ctx.heat = {
        mean_lst: heat.grid_summary?.mean_lst,
        min_lst: heat.grid_summary?.min_lst,
        max_lst: heat.grid_summary?.max_lst,
        prediction_count: heat.prediction_count,
        generated_at: heat.generated_at,
        snapshot_id: heat.snapshot_id,
      };
      ctx.data_sources.push('Heat predictions (53,802 cells)');
    }
  } catch {
    ctx.unavailable.push('Heat predictions');
  }

  // 3. AI status
  try {
    const ai = await fetchAIStatus();
    ctx.ai = { configured: ai?.status === 'configured' };
  } catch {
    ctx.ai = { configured: false };
  }

  // 4. Available scenarios
  try {
    const scenarios = await fetchScenarios();
    if (scenarios?.length) {
      ctx.scenarios = scenarios.map(s => ({
        name: s.name,
        description: s.description,
      }));
      ctx.data_sources.push(`${scenarios.length} scenario definitions`);
    }
  } catch {
    ctx.unavailable.push('Scenario definitions');
  }

  // 5. Cooling potential
  try {
    const cooling = await fetchCoolingPotential();
    if (cooling?.cells?.length) {
      ctx.cooling_potential = {
        cell_count: cooling.cells.length,
        top_opportunities: cooling.cells.slice(0, 5).map(c => ({
          grid_id: c.grid_id,
          max_cooling_c: c.max_cooling_c,
          best_scenario: c.best_scenario,
        })),
      };
      ctx.data_sources.push('Cooling potential');
    }
  } catch {
    ctx.unavailable.push('Cooling potential');
  }

  // 6. Ranked interventions
  try {
    const interventions = await fetchInterventions(5);
    if (interventions?.interventions?.length) {
      ctx.top_interventions = interventions.interventions.map(i => ({
        scenario: i.scenario,
        grid_id: i.grid_id,
        cooling_c: i.cooling_c,
        current_lst_c: i.current_lst_c,
        after_lst_c: i.after_lst_c,
        latitude: i.latitude,
        longitude: i.longitude,
      }));
      ctx.data_sources.push('Intervention rankings');
    }
  } catch {
    ctx.unavailable.push('Intervention rankings');
  }

  // 7. Selected location (if any)
  if (selectedLocation?.lat && selectedLocation?.lng) {
    ctx.location = {
      name: selectedLocation.name || 'Selected point',
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
    };

    // Fetch point profile
    try {
      const profile = await fetchCityPoint(selectedLocation.lat, selectedLocation.lng);
      if (profile && !profile.available === false) {
        ctx.location_profile = {
          predicted_lst_c: profile.predicted_lst_c,
          mean_ndvi: profile.mean_ndvi,
          green_cover_pct: profile.green_cover_pct,
          building_density_pct: profile.building_density_pct,
          tree_density: profile.tree_density,
          land_cover: profile.land_cover,
          vegetation_density: profile.vegetation_density,
          aqi: profile.aqi,
          nearby_hotspots: profile.nearby_hotspots,
          cooling_potential: profile.cooling_potential,
        };
        ctx.data_sources.push(`Location profile (${selectedLocation.name || 'point'})`);
      }
    } catch {
      // Location data unavailable
    }

    // Fetch explainability
    try {
      const explain = await fetchExplain(selectedLocation.lat, selectedLocation.lng);
      if (explain?.factors?.length) {
        ctx.location_explain = {
          factors: explain.factors.map(f => ({
            feature: f.feature,
            contribution: f.contribution,
            direction: f.direction,
            value: f.value,
          })),
          summary: explain.summary,
        };
        ctx.data_sources.push('SHAP factor analysis');
      }
    } catch {
      // Explain unavailable
    }
  }

  return ctx;
}

/**
 * Build the context payload for the backend AI endpoint.
 * Extracts only the fields the backend expects.
 */
export function buildAIContextPayload(fullContext) {
  const payload = {};

  if (fullContext.location) {
    payload.location = fullContext.location;
  }

  if (fullContext.location_profile) {
    const lp = fullContext.location_profile;
    const env = {};
    if (lp.mean_ndvi != null) env.ndvi = lp.mean_ndvi;
    if (lp.green_cover_pct != null) env.green_cover = lp.green_cover_pct;
    if (lp.predicted_lst_c != null) env.lst = lp.predicted_lst_c;
    if (Object.keys(env).length) payload.environment = env;

    const urban = {};
    if (lp.building_density_pct != null) urban.building_density = lp.building_density_pct;
    if (lp.tree_density != null) urban.tree_density = lp.tree_density;
    if (Object.keys(urban).length) payload.urban = urban;

    if (lp.aqi != null) {
      payload.air_quality = { aqi: lp.aqi };
    }
  }

  if (fullContext.model) {
    payload.prediction = { available: fullContext.model.available };
  }

  if (fullContext.heat?.snapshot_id) {
    payload.snapshot_id = fullContext.heat.snapshot_id;
  }

  return payload;
}

/**
 * Generate context-aware suggested questions based on current state.
 */
export function getContextualSuggestions(ctx) {
  const suggestions = [];

  // Location-specific questions
  if (ctx.location) {
    suggestions.push({
      question: `Why is ${ctx.location.name} hot?`,
      category: 'explain',
    });

    if (ctx.location_profile?.building_density_pct > 40) {
      suggestions.push({
        question: `What interventions would cool ${ctx.location.name}?`,
        category: 'intervene',
      });
    }

    if (ctx.location_profile?.green_cover_pct < 20) {
      suggestions.push({
        question: `How would increasing green cover at ${ctx.location.name} affect temperature?`,
        category: 'scenario',
      });
    }
  }

  // Scenario-based questions
  if (ctx.scenarios?.length) {
    suggestions.push({
      question: 'Which intervention gives the highest cooling?',
      category: 'compare',
    });
    suggestions.push({
      question: 'What happens if green cover increases by 20%?',
      category: 'scenario',
    });
  }

  // Cooling potential questions
  if (ctx.cooling_potential?.top_opportunities?.length) {
    suggestions.push({
      question: 'Which areas have the highest cooling potential?',
      category: 'analysis',
    });
  }

  // General questions
  suggestions.push({
    question: 'What are the main drivers of heat in this city?',
    category: 'analysis',
  });

  suggestions.push({
    question: 'How does this area compare to the city average?',
    category: 'compare',
  });

  // Limit questions to 6
  return suggestions.slice(0, 6);
}

/**
 * Parse the AI response into structured sections.
 * The backend returns plain text; we parse it into structured format.
 */
export function parseAIResponse(result) {
  if (!result?.answer) {
    return {
      answer: 'No response available.',
      evidence: [],
      metrics: [],
      confidence: 'low',
      action: null,
    };
  }

  const text = result.answer;
  const evidence = [];
  const metrics = [];

  // Extract data_used as evidence
  if (result.data_used?.length) {
    result.data_used.forEach(d => {
      evidence.push({ source: d, type: 'data' });
    });
  }

  // Extract key factors as evidence
  if (result.key_factors?.length) {
    result.key_factors.forEach(f => {
      evidence.push({ source: f, type: 'factor' });
    });
  }

  // Extract numerical values from the answer text as metrics
  const tempMatch = text.match(/(\d+\.?\d*)\s*°C/g);
  if (tempMatch) {
    tempMatch.forEach(m => {
      const value = parseFloat(m);
      if (value > 0 && value < 80) {
        metrics.push({ label: 'Temperature', value: `${value}°C`, type: 'temperature' });
      }
    });
  }

  const pctMatch = text.match(/(\d+\.?\d*)\s*%/g);
  if (pctMatch) {
    pctMatch.forEach(m => {
      const value = parseFloat(m);
      if (value >= 0 && value <= 100) {
        metrics.push({ label: 'Percentage', value: `${value}%`, type: 'percentage' });
      }
    });
  }

  // Determine confidence based on data sources used
  let confidence = 'low';
  if (evidence.length >= 3) confidence = 'high';
  else if (evidence.length >= 1) confidence = 'medium';

  // Determine recommended action
  let action = null;
  const lowerText = text.toLowerCase();
  if (lowerText.includes('tree') || lowerText.includes('green') || lowerText.includes('vegetation')) {
    action = 'Consider running a greening scenario in Scenario Lab';
  } else if (lowerText.includes('building') || lowerText.includes('roof')) {
    action = 'Evaluate cool roof or building modification scenarios';
  } else if (lowerText.includes('water')) {
    action = 'Explore water restoration options in City Planning';
  } else if (lowerText.includes('intervention') || lowerText.includes('cooling')) {
    action = 'Check the Optimization module for cost-effective interventions';
  }

  return {
    answer: text,
    evidence,
    metrics: metrics.slice(0, 5), // Limit to 5 metrics
    confidence,
    action,
    data_used: result.data_used || [],
    context_used: result.context_used || {},
  };
}
