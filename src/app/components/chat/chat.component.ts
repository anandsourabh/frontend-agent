import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { ChatService } from '../../services/chat.service';
import { ApiService } from '../../services/api.service';
import { AgentService } from '../../services/agent.service';
import { Message, QueryRequest, QueryResponse } from '../../models/message.model';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('queryInput') private queryInput!: ElementRef;

  // Chat state
  messages: Message[] = [];
  currentQuery = '';
  isLoading = false;
  isTyping = false;
  
  // Agent status
  agentStatus: any = {};
  showAgentStatus = false;
  processingAgents: string[] = [];
  
  // Features and UI state
  showSuggestions = true;
  suggestions: string[] = [];
  queryHistory: string[] = [];
  errorMessage = '';
  
  // Search and filtering
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  // Enhanced features
  showConfidenceScores = true;
  enableRealTimeSearch = true;
  voiceInputEnabled = false;
  
  // Suggestions for new users
  defaultSuggestions = [
    "Show me a risk assessment for our current portfolio",
    "What are the latest regulatory updates affecting insurance?",
    "Create a chart showing claims trends over the last year",
    "Find best practices for cybersecurity risk management",
    "Compare our loss ratios with industry benchmarks"
  ];

  constructor(
    private chatService: ChatService,
    private apiService: ApiService,
    private agentService: AgentService
  ) {}

  ngOnInit(): void {
    this.initializeChat();
    this.setupSearchDebounce();
    this.loadAgentStatus();
    this.setupPeriodicAgentCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private initializeChat(): void {
    // Load existing messages
    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messages = messages;
      });

    // Load suggestions
    this.suggestions = this.defaultSuggestions;
    
    // Add welcome message if no existing messages
    if (this.messages.length === 0) {
      this.addWelcomeMessage();
    }
  }

  private addWelcomeMessage(): void {
    const welcomeMessage: Message = {
      id: 'welcome',
      content: 'Hello! I\'m your AI Risk Advisor. I can help you with risk assessments, data analysis, regulatory compliance, and much more. What would you like to explore today?',
      isUser: false,
      timestamp: new Date(),
      type: 'text',
      confidence: 1.0,
      responseType: 'welcome'
    };
    
    this.chatService.addMessage(welcomeMessage);
  }

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.performSearch(query);
      });
  }

  private loadAgentStatus(): void {
    this.agentService.getAgentStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.agentStatus = status;
        },
        error: (error) => {
          console.warn('Failed to load agent status:', error);
        }
      });
  }

  private setupPeriodicAgentCheck(): void {
    // Check agent status every 30 seconds
    setInterval(() => {
      if (this.showAgentStatus) {
        this.loadAgentStatus();
      }
    }, 30000);
  }

  // Message sending and processing
  async sendMessage(): Promise<void> {
    if (!this.currentQuery.trim() || this.isLoading) {
      return;
    }

    const userMessage: Message = {
      id: this.generateId(),
      content: this.currentQuery,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    // Add user message
    this.chatService.addMessage(userMessage);
    
    // Add to history
    this.addToQueryHistory(this.currentQuery);
    
    const query = this.currentQuery;
    this.currentQuery = '';
    this.clearError();
    
    // Show loading state
    this.setLoadingState(true);
    
    try {
      await this.processQueryWithAgents(query, userMessage.id);
    } catch (error) {
      this.handleQueryError(error);
    } finally {
      this.setLoadingState(false);
    }
  }

  private async processQueryWithAgents(query: string, userMessageId: string): Promise<void> {
    try {
      // Prepare request
      const request: QueryRequest = {
        question: query,
        context: this.buildRequestContext(),
        use_agents: true,
        require_sql: false
      };

      // Process with agentic backend
      const response = await this.apiService.processQuery(request).toPromise();
      
      if (response) {
        await this.handleQueryResponse(response, userMessageId);
      } else {
        throw new Error('No response received from server');
      }

    } catch (error) {
      console.error('Query processing error:', error);
      this.handleQueryError(error);
    }
  }

  private buildRequestContext(): any {
    return {
      recent_queries: this.queryHistory.slice(-3),
      user_preferences: this.getUserPreferences(),
      session_context: {
        show_confidence_scores: this.showConfidenceScores,
        enable_real_time_search: this.enableRealTimeSearch,
        timestamp: new Date().toISOString()
      }
    };
  }

  private async handleQueryResponse(response: QueryResponse, userMessageId: string): Promise<void> {
    // Create assistant message
    const assistantMessage: Message = {
      id: this.generateId(),
      content: response.explanation || 'I processed your request.',
      isUser: false,
      timestamp: new Date(),
      type: this.determineMessageType(response),
      confidence: response.confidence_score,
      responseType: response.response_type,
      data: response.data,
      sqlQuery: response.sql_query,
      agentResponses: response.agent_responses,
      visualization: response.visualization,
      suggestions: response.suggestions,
      metadata: response.metadata,
      processingTime: response.processing_time_ms,
      relatedMessageId: userMessageId
    };

    // Add to chat
    this.chatService.addMessage(assistantMessage);

    // Update suggestions
    if (response.suggestions && response.suggestions.length > 0) {
      this.suggestions = response.suggestions;
    }

    // Add to query history for analytics
    this.chatService.addToHistory({
      id: response.query_id,
      query: response.question,
      timestamp: new Date().toISOString(),
      responseType: response.response_type,
      agentsUsed: this.extractAgentsUsed(response),
      isBookmarked: false
    });
  }

  private determineMessageType(response: QueryResponse): 'text' | 'data' | 'chart' | 'error' {
    if (response.response_type === 'error') return 'error';
    if (response.visualization) return 'chart';
    if (response.data) return 'data';
    return 'text';
  }

  private extractAgentsUsed(response: QueryResponse): string[] {
    if (response.metadata?.agents_used) {
      return response.metadata.agents_used;
    }
    if (response.agent_responses) {
      return Object.keys(response.agent_responses);
    }
    return [];
  }

  // UI interaction methods
  selectSuggestion(suggestion: string): void {
    this.currentQuery = suggestion;
    this.queryInput?.nativeElement.focus();
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onSearchInput(event: any): void {
    const query = event.target.value;
    this.searchSubject.next(query);
  }

  private performSearch(query: string): void {
    if (!query.trim()) {
      return;
    }
    
    // Implement search functionality
    console.log('Searching for:', query);
    // This could filter existing messages or trigger a search query
  }

  // Agent status methods
  toggleAgentStatus(): void {
    this.showAgentStatus = !this.showAgentStatus;
    if (this.showAgentStatus) {
      this.loadAgentStatus();
    }
  }

  refreshAgentStatus(): void {
    this.loadAgentStatus();
  }

  getAgentStatusColor(agent: any): string {
    if (!agent) return 'gray';
    
    if (agent.error_count > 5) return 'red';
    if (agent.success_rate < 0.8) return 'orange';
    if (agent.is_active) return 'green';
    return 'gray';
  }

  getAgentStatusText(agent: any): string {
    if (!agent) return 'Unknown';
    
    if (!agent.is_active) return 'Inactive';
    if (agent.error_count > 5) return 'Issues';
    if (agent.success_rate < 0.8) return 'Degraded';
    return 'Healthy';
  }

  // Message interaction methods
  bookmarkMessage(message: Message): void {
    if (message.id && !message.isUser) {
      this.chatService.bookmarkQuery(message.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            message.isBookmarked = true;
          },
          error: (error) => {
            console.error('Failed to bookmark message:', error);
          }
        });
    }
  }

  copyMessage(message: Message): void {
    navigator.clipboard.writeText(message.content).then(() => {
      // Could add a toast notification here
      console.log('Message copied to clipboard');
    });
  }

  retryQuery(message: Message): void {
    if (message.relatedMessageId) {
      const originalMessage = this.messages.find(m => m.id === message.relatedMessageId);
      if (originalMessage) {
        this.currentQuery = originalMessage.content;
        this.sendMessage();
      }
    }
  }

  // Voice input methods
  toggleVoiceInput(): void {
    this.voiceInputEnabled = !this.voiceInputEnabled;
    if (this.voiceInputEnabled) {
      this.startVoiceRecognition();
    } else {
      this.stopVoiceRecognition();
    }
  }

  private startVoiceRecognition(): void {
    // Implement voice recognition
    console.log('Voice recognition started');
    // This would integrate with Web Speech API
  }

  private stopVoiceRecognition(): void {
    // Stop voice recognition
    console.log('Voice recognition stopped');
  }

  // Utility methods
  private setLoadingState(loading: boolean): void {
    this.isLoading = loading;
    if (loading) {
      this.isTyping = true;
      setTimeout(() => {
        this.isTyping = false;
      }, 1000);
    }
  }

  private handleQueryError(error: any): void {
    console.error('Query error:', error);
    
    let errorMessage = 'Sorry, I encountered an error processing your request.';
    
    if (error?.error?.detail) {
      errorMessage = error.error.detail;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    const errorMsg: Message = {
      id: this.generateId(),
      content: errorMessage,
      isUser: false,
      timestamp: new Date(),
      type: 'error',
      confidence: 0,
      responseType: 'error',
      suggestions: [
        'Try rephrasing your question',
        'Check your internet connection',
        'Contact support if the issue persists'
      ]
    };

    this.chatService.addMessage(errorMsg);
    this.errorMessage = errorMessage;
  }

  private clearError(): void {
    this.errorMessage = '';
  }

  private addToQueryHistory(query: string): void {
    this.queryHistory.unshift(query);
    if (this.queryHistory.length > 10) {
      this.queryHistory = this.queryHistory.slice(0, 10);
    }
  }

  private getUserPreferences(): any {
    return {
      show_confidence_scores: this.showConfidenceScores,
      enable_real_time_search: this.enableRealTimeSearch,
      preferred_chart_types: ['bar', 'line', 'pie'],
      language: 'en'
    };
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.warn('Could not scroll to bottom:', err);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Public utility methods for template
  getConfidenceColor(confidence?: number): string {
    if (!confidence) return '#666';
    
    if (confidence >= 0.8) return '#4caf50';
    if (confidence >= 0.6) return '#ff9800';
    return '#f44336';
  }

  getConfidenceText(confidence?: number): string {
    if (!confidence) return 'Unknown';
    
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  }

  formatProcessingTime(time?: number): string {
    if (!time) return '';
    
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  }

  getAgentCount(message: Message): number {
    if (message.agentResponses) {
      return Object.keys(message.agentResponses).length;
    }
    if (message.metadata?.agents_used) {
      return message.metadata.agents_used.length;
    }
    return 0;
  }

  getSuccessfulAgents(message: Message): string[] {
    if (!message.agentResponses) return [];
    
    return Object.keys(message.agentResponses).filter(
      agentName => message.agentResponses![agentName]?.success
    );
  }

  hasVisualization(message: Message): boolean {
    return !!(message.visualization && 
             message.visualization.visualizations && 
             message.visualization.visualizations.length > 0);
  }

  hasData(message: Message): boolean {
    return !!(message.data && 
             ((Array.isArray(message.data) && message.data.length > 0) ||
              (typeof message.data === 'object' && Object.keys(message.data).length > 0)));
  }

  // Feature toggles
  toggleConfidenceScores(): void {
    this.showConfidenceScores = !this.showConfidenceScores;
  }

  toggleRealTimeSearch(): void {
    this.enableRealTimeSearch = !this.enableRealTimeSearch;
  }

  toggleSuggestions(): void {
    this.showSuggestions = !this.showSuggestions;
  }
}