/**
 * healthModelContract.ts
 * Mandatory Ethical Boundaries & Health Model Status
 */

export const HEALTH_MODEL_STATUS = 'BLOCKED_NO_HEALTH_OUTCOME_DATA';
export const HEALTH_DATA_STATUS = 'NO_LEGITIMATE_HEALTH_OUTCOME_DATA';

export const MANDATORY_HEALTH_DISCLAIMER = 
  'Health Impact Risk Proxy — NOT an observed hospitalization or mortality prediction.';

export const HEALTH_STATUS_NOTICE = 
  'Health Model Status: BLOCKED_NO_HEALTH_OUTCOME_DATA. Direct clinical forecasts (hospital admissions, heatstroke fatalities) are strictly blocked until validated epidemiological outcome registries are authorized.';

export interface AttentionLevelMeta {
  level: string;
  color: string;
  description: string;
}

export const PUBLIC_HEALTH_ATTENTION_LEVELS: Record<string, AttentionLevelMeta> = {
  ROUTINE: {
    level: 'ROUTINE',
    color: '#22c55e',
    description: 'Standard public health surveillance. Normal seasonal hydration advisories.',
  },
  WATCH: {
    level: 'WATCH',
    color: '#eab308',
    description: 'Targeted heat-health monitoring. Advisories for high-exposure occupational groups.',
  },
  ATTENTION: {
    level: 'ATTENTION',
    color: '#f97316',
    description: 'Elevated readiness. Mobilize cooling centers, hydration posts, and CHC/PHC preparedness.',
  },
  URGENT_ATTENTION: {
    level: 'URGENT_ATTENTION',
    color: '#ef4444',
    description: 'Emergency civil protection mobilization. Heatwave action plan triggers for vulnerable populations.',
  },
};
