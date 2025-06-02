export interface AppConfig {
  agents: {
    enabled: boolean;
    timeout: number;
    retryAttempts: number;
    confidenceThreshold: number;
  };
  features: {
    agenticMode: boolean;
    documentSearch: boolean;
    advancedVisualization: boolean;
    webResearch: boolean;
    riskAdvisor: boolean;
  };
  ui: {
    showAgentStatus: boolean;
    showConfidenceScores: boolean;
    enableVoiceInput: boolean;
    enableRealTimeSearch: boolean;
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  agents: {
    enabled: true,
    timeout: 30000,
    retryAttempts: 3,
    confidenceThreshold: 0.6
  },
  features: {
    agenticMode: true,
    documentSearch: true,
    advancedVisualization: true,
    webResearch: true,
    riskAdvisor: true
  },
  ui: {
    showAgentStatus: true,
    showConfidenceScores: true,
    enableVoiceInput: true,
    enableRealTimeSearch: true
  }
};