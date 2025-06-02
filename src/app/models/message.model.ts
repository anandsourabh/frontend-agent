export interface QueryRequest {
  question: string;
  visualization_type?: string;
}

export interface AgentResponse {
  response_id: string;
  agent_name: string;
  success: boolean;
  data: any;
  error?: string;
  metadata: any;
  confidence_score: number;
  sources: string[];
  timestamp: string;
}


export interface ChatHistory {
  query_id: string;
  question: string;
  sql_query?: string;
  response_type: string;
  timestamp: string;
}

export interface QueryHistory {
  id: string;
  query: string;
  timestamp: Date;
  isBookmarked: boolean;
  sqlQuery?: string;
  data?: any[];
  responseType?: string;
  agentsUsed?: string[];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'map' | 'stacked-bar' | 'donut';
  title: string;
  xAxis?: string;
  yAxis?: string;
  data: any[];
}

// New agentic interfaces
export interface AgentStatus {
  agent_id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface DocumentSearchRequest {
  query: string;
  collection?: string;
  max_results?: number;
}

export interface DocumentSearchResult {
  content: string;
  metadata: any;
  similarity_score: number;
  source: string;
}

export interface PlotlyVisualization {
  type: string;
  title: string;
  plotly_json: string;
  description: string;
}

export interface BookmarkRequest {
  query_id: string;
  question: string;
}

export interface FeedbackRequest {
  query_id: string;
  rating: number;
  feedback?: string;
  helpful: boolean;
}

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type: 'text' | 'data' | 'chart' | 'error';
  confidence?: number;
  responseType?: string;
  data?: any;
  sqlQuery?: string;
  agentResponses?: { [key: string]: any };
  visualization?: any;
  suggestions?: string[];
  metadata?: any;
  processingTime?: number;
  relatedMessageId?: string;
  isBookmarked?: boolean;
}

export interface QueryRequest {
  question: string;
  context?: any;
  use_agents?: boolean;
  require_sql?: boolean;
}

export interface QueryResponse {
  query_id: string;
  question: string;
  explanation: string;
  summary: string;
  timestamp: string;
  response_type: string;
  confidence_score?: number;
  processing_time_ms?: number;
  data?: any;
  sql_query?: string;
  agent_responses?: { [key: string]: any };
  visualization?: any;
  suggestions?: string[];
  metadata?: any;
}