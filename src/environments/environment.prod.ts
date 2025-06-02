export const environment = {
  production: false,
  apiUrl: '/api',
  features: {
    agenticMode: true,
    documentSearch: true,
    advancedVisualization: true,
    webResearch: true,
    riskAdvisor: true
  },
  agents: {
    timeout: 60000, // Longer timeout for development
    retryAttempts: 5,
    confidenceThreshold: 0.5
  },
  debug: {
    logAgentResponses: true,
    showProcessingTimes: true,
    enableMockData: false
  }
};