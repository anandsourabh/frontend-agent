import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Message, AgentResponse } from '../../models/message.model';
import { marked } from 'marked';

@Component({
  selector: 'app-message',
  template: `
    <div class="message" [class.user-message]="message.isUser" [class.bot-message]="!message.isUser">
      <div class="message-content">
        <div class="message-header">
          <div class="avatar">
            <mat-icon>{{message.isUser ? 'person' : 'smart_toy'}}</mat-icon>
          </div>
          <div class="message-info">
            <span class="sender">{{message.isUser ? 'You' : 'AI Risk Advisor'}}</span>
            <span class="timestamp">{{message.timestamp | date:'short'}}</span>
            <!-- Agent activity indicator -->
            <div *ngIf="!message.isUser && message.activeAgents && message.activeAgents.length > 0" class="agent-activity">
              <mat-icon class="activity-icon">psychology</mat-icon>
              <span>{{message.activeAgents.length}} agents processed</span>
            </div>
          </div>
          <div class="message-status" *ngIf="message.isUser">
            <mat-icon *ngIf="message.status === 'sending'">schedule</mat-icon>
            <mat-icon *ngIf="message.status === 'sent'">check</mat-icon>
            <mat-icon *ngIf="message.status === 'error'" class="error">error</mat-icon>
          </div>
          <!-- Confidence score -->
          <div *ngIf="!message.isUser && message.confidenceScore" class="confidence-score">
            <mat-icon [class]="getConfidenceClass(message.confidenceScore)">{{getConfidenceIcon(message.confidenceScore)}}</mat-icon>
            <span>{{(message.confidenceScore * 100).toFixed(0)}}%</span>
          </div>
        </div>
        
        <div class="message-body">
          <!-- Main response content -->
          <div class="message-text" *ngIf="message.isUser" [innerHTML]="getFormattedContent()"></div>
          <div class="message-text" *ngIf="!message.isUser && message.summary" [innerHTML]="getFormattedSummary()"></div>
          <div class="message-text" *ngIf="!message.isUser && !message.summary" [innerHTML]="getFormattedContent()"></div>
          
          <!-- Agent responses breakdown -->
          <div *ngIf="!message.isUser && message.agentResponses && hasMultipleAgentResponses()" class="agent-responses">
            <mat-expansion-panel class="agent-panel">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>groups</mat-icon>
                  Agent Analysis Breakdown
                </mat-panel-title>
                <mat-panel-description>
                  {{Object.keys(message.agentResponses).length}} agents contributed
                </mat-panel-description>
              </mat-expansion-panel-header>
              
              <div class="agent-breakdown">
                <div *ngFor="let agentName of Object.keys(message.agentResponses)" class="agent-response-item">
                  <div class="agent-info">
                    <mat-icon [class]="getAgentIconClass(agentName)">{{getAgentIcon(agentName)}}</mat-icon>
                    <span class="agent-name">{{formatAgentName(agentName)}}</span>
                    <div class="agent-confidence">
                      <mat-icon class="confidence-mini">{{getConfidenceIcon(message.agentResponses[agentName].confidence_score)}}</mat-icon>
                      <span>{{(message.agentResponses[agentName].confidence_score * 100).toFixed(0)}}%</span>
                    </div>
                  </div>
                  <div class="agent-contribution" [innerHTML]="formatAgentContribution(message.agentResponses[agentName])"></div>
                </div>
              </div>
            </mat-expansion-panel>
          </div>

          <!-- Enhanced error handling -->
          <div *ngIf="message.error" class="error-message">
            <mat-icon>error</mat-icon>
            <span>{{message.error}}</span>
          </div>
          
          <!-- Enhanced no data response -->
          <div *ngIf="!message.isUser && isNoDataResponse()" class="no-data-message">
            <div class="no-data-header">
              <mat-icon>search_off</mat-icon>
              <div class="no-data-title">
                <h4>No Results Found</h4>
                <p>Your query was understood but didn't return any data.</p>
              </div>
            </div>
            
            <div class="quick-actions">
              <button mat-stroked-button (click)="onEditQuery()" class="action-button edit-btn">
                <mat-icon>edit</mat-icon>
                Modify Query
              </button>
              <button mat-stroked-button (click)="onTryBroaderSearch()" class="action-button broader-btn">
                <mat-icon>zoom_out</mat-icon>
                Broader Search
              </button>
              <button mat-stroked-button (click)="onShowAvailableData()" class="action-button data-btn">
                <mat-icon>dataset</mat-icon>
                Available Data
              </button>
            </div>

            <div class="smart-suggestions" *ngIf="getSmartSuggestions().length > 0">
              <h5><mat-icon>lightbulb</mat-icon> Try these instead:</h5>
              <div class="suggestion-chips">
                <button 
                  *ngFor="let suggestion of getSmartSuggestions().slice(0, 3)" 
                  mat-chip-option 
                  (click)="onUseSuggestion(suggestion)"
                  class="suggestion-chip">
                  {{suggestion}}
                </button>
              </div>
            </div>
          </div>

          <!-- SQL section -->
          <div *ngIf="message.sqlQuery && !message.isUser" class="sql-section">
            <app-sql-code [sql]="message.sqlQuery" (rerun)="onRerun()"></app-sql-code>
          </div>
          
          <!-- AI Explanation for successful responses -->
          <div *ngIf="message.explanation && !message.isUser && isSuccessfulResponse()" class="explanation-section">
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>psychology</mat-icon>
                  AI Analysis & Reasoning
                </mat-panel-title>
              </mat-expansion-panel-header>
              <div [innerHTML]="getFormattedExplanation()"></div>
            </mat-expansion-panel>
          </div>
          
          <!-- Enhanced data visualization section -->
          <div *ngIf="message.data && message.data.length > 0" class="data-section">
            <mat-expansion-panel [expanded]="true">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>table_chart</mat-icon>
                  Query Results ({{message.data.length}} rows)
                </mat-panel-title>
              </mat-expansion-panel-header>
              
              <div class="data-content">
                <mat-tab-group>
                  <mat-tab label="Table View">
                    <app-data-table [data]="message.data"></app-data-table>
                  </mat-tab>
                  <mat-tab label="Visualizations" *ngIf="hasVisualizations()">
                    <app-chart 
                      [data]="message.data"
                      [visualizationConfig]="message.queryResponse?.visualization"
                      [agentVisualizations]="getAgentVisualizations()">
                    </app-chart>
                  </mat-tab>
                  <mat-tab label="Risk Insights" *ngIf="hasRiskInsights()">
                    <div class="risk-insights">
                      <div [innerHTML]="formatRiskInsights()"></div>
                    </div>
                  </mat-tab>
                </mat-tab-group>
              </div>
            </mat-expansion-panel>
          </div>
          
          <!-- Processing time indicator -->
          <div *ngIf="!message.isUser && message.processingTime" class="processing-time">
            <mat-icon>schedule</mat-icon>
            <span>Processed in {{message.processingTime}}ms</span>
          </div>
          
          <!-- Enhanced AI notice -->
          <div *ngIf="!message.isUser && message.status !== 'error' && isSuccessfulResponse()" class="ai-notice">
            <mat-icon>info</mat-icon>
            <span>AI-powered analysis using {{getActiveAgentCount()}} specialized agents. Please verify critical information.</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Existing styles... */
    .message {
      margin-bottom: 24px;
      display: flex;
    }
    
    .user-message {
      justify-content: flex-end;
    }
    
    .bot-message {
      justify-content: flex-start;
    }
    
    .message-content {
      max-width: 85%;
      background-color: white;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 3px 12px rgba(0,0,0,0.1);
    }
    
    .user-message .message-content {
      background: linear-gradient(135deg, #2640e8 0%, #4054ea 100%);
      color: white;
    }
    
    .message-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #293340 0%, #3d4a5c 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    
    .message-info {
      flex: 1;
    }
    
    .sender {
      font-weight: 600;
      display: block;
      font-size: 14px;
    }
    
    .timestamp {
      font-size: 12px;
      opacity: 0.7;
    }
    
    /* New agent activity indicator */
    .agent-activity {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      font-size: 11px;
      color: #2640e8;
      font-weight: 500;
    }
    
    .activity-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }
    
.confidence-score {
     display: flex;
     align-items: center;
     gap: 4px;
     padding: 4px 8px;
     border-radius: 12px;
     background: rgba(38, 64, 232, 0.1);
     font-size: 12px;
     font-weight: 500;
   }
   
   .confidence-high { color: #4caf50; }
   .confidence-medium { color: #ff9800; }
   .confidence-low { color: #f44336; }
   
   /* Agent responses breakdown */
   .agent-responses {
     margin: 16px 0;
   }
   
   .agent-panel {
     background: #f8f9fa;
     border-radius: 8px;
   }
   
   .agent-breakdown {
     padding: 16px 0;
   }
   
   .agent-response-item {
     margin-bottom: 16px;
     padding: 12px;
     background: white;
     border-radius: 8px;
     border-left: 4px solid #2640e8;
   }
   
   .agent-info {
     display: flex;
     align-items: center;
     gap: 8px;
     margin-bottom: 8px;
   }
   
   .agent-name {
     font-weight: 500;
     color: #333;
     flex: 1;
   }
   
   .agent-confidence {
     display: flex;
     align-items: center;
     gap: 4px;
     font-size: 12px;
   }
   
   .confidence-mini {
     font-size: 14px !important;
     width: 14px !important;
     height: 14px !important;
   }
   
   .agent-contribution {
     font-size: 14px;
     line-height: 1.4;
     color: #666;
   }
   
   /* Agent-specific icon colors */
   .agent-query { color: #2196f3; }
   .agent-risk { color: #f44336; }
   .agent-knowledge { color: #9c27b0; }
   .agent-visualization { color: #ff9800; }
   .agent-search { color: #4caf50; }
   .agent-web { color: #607d8b; }
   
   /* Risk insights styling */
   .risk-insights {
     padding: 16px;
     background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
     border-radius: 8px;
     margin-top: 16px;
   }
   
   /* Processing time indicator */
   .processing-time {
     display: flex;
     align-items: center;
     gap: 6px;
     margin-top: 12px;
     font-size: 12px;
     color: #666;
     font-style: italic;
   }
   
   .processing-time mat-icon {
     font-size: 14px;
     width: 14px;
     height: 14px;
   }
   
   /* Enhanced AI notice */
   .ai-notice {
     display: flex;
     align-items: center;
     gap: 8px;
     margin-top: 16px;
     padding: 12px 16px;
     background: linear-gradient(135deg, rgba(38, 64, 232, 0.1) 0%, rgba(38, 64, 232, 0.05) 100%);
     border-radius: 8px;
     font-size: 13px;
     color: #2640e8;
     border: 1px solid rgba(38, 64, 232, 0.2);
   }
   
   .ai-notice mat-icon {
     font-size: 16px;
     width: 16px;
     height: 16px;
   }
   
   /* Existing styles for error handling, suggestions, etc. */
   .error-message {
     display: flex;
     align-items: center;
     gap: 8px;
     color: #f44336;
     background-color: #ffebee;
     padding: 12px;
     border-radius: 8px;
     margin-top: 12px;
   }

   .no-data-message {
     background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
     border: 1px solid #ffb74d;
     border-radius: 12px;
     padding: 20px;
     margin-top: 16px;
   }

   .no-data-header {
     display: flex;
     align-items: flex-start;
     gap: 16px;
     margin-bottom: 16px;
   }

   .no-data-header mat-icon {
     color: #ff9800;
     font-size: 28px;
     width: 28px;
     height: 28px;
   }

   .no-data-title h4 {
     margin: 0 0 4px 0;
     font-size: 16px;
     font-weight: 600;
   }

   .no-data-title p {
     margin: 0;
     font-size: 14px;
     opacity: 0.8;
   }

   .quick-actions {
     display: flex;
     gap: 8px;
     margin-bottom: 16px;
     flex-wrap: wrap;
   }

   .action-button {
     font-size: 12px !important;
     padding: 6px 12px !important;
     min-width: 0 !important;
     height: 32px !important;
     border-radius: 16px !important;
     display: flex;
     align-items: center;
     gap: 4px;
   }

   .action-button mat-icon {
     font-size: 16px !important;
     width: 16px !important;
     height: 16px !important;
   }

   .edit-btn {
     color: #ff9800 !important;
     border-color: #ff9800 !important;
   }

   .broader-btn {
     color: #2196f3 !important;
     border-color: #2196f3 !important;
   }

   .data-btn {
     color: #4caf50 !important;
     border-color: #4caf50 !important;
   }

   .smart-suggestions {
     margin-top: 12px;
   }

   .smart-suggestions h5 {
     display: flex;
     align-items: center;
     gap: 8px;
     margin: 0 0 8px 0;
     font-size: 14px;
     font-weight: 600;
     color: #666;
   }

   .smart-suggestions h5 mat-icon {
     font-size: 16px;
     width: 16px;
     height: 16px;
     color: #ffc107;
   }

   .suggestion-chips {
     display: flex;
     gap: 8px;
     flex-wrap: wrap;
   }

   .suggestion-chip {
     background-color: rgba(255, 152, 0, 0.1) !important;
     color: #e65100 !important;
     border: 1px solid #ffb74d !important;
     font-size: 12px !important;
     padding: 4px 8px !important;
     height: 24px !important;
     border-radius: 12px !important;
   }
   
   .sql-section,
   .explanation-section,
   .data-section {
     margin-top: 16px;
   }
   
   .data-content {
     margin-top: 16px;
   }
   
   /* Responsive design */
   @media (max-width: 768px) {
     .message-content {
       max-width: 95%;
     }
     
     .agent-breakdown {
       padding: 8px 0;
     }
     
     .agent-response-item {
       padding: 8px;
     }
     
     .quick-actions {
       flex-direction: column;
     }
     
     .action-button {
       width: 100% !important;
       justify-content: center;
     }
   }
 `]
})
export class MessageComponent {
 @Input() message!: Message;
 @Output() rerunQuery = new EventEmitter<Message>();
 @Output() editQuery = new EventEmitter<string>();
 @Output() useSuggestion = new EventEmitter<string>();
 @Output() showAvailableData = new EventEmitter<void>();

 getFormattedContent(): string {
   return marked(this.message.content);
 }

 getFormattedSummary(): string {
   return this.message.summary ? marked(this.message.summary) : marked(this.message.content);
 }

 getFormattedExplanation(): string {
   return this.message.explanation ? marked(this.message.explanation) : '';
 }

 // Agent-related methods
 hasMultipleAgentResponses(): boolean {
   return this.message.agentResponses && Object.keys(this.message.agentResponses).length > 1;
 }

 getActiveAgentCount(): number {
   if (!this.message.activeAgents) return 1;
   return this.message.activeAgents.length;
 }

 formatAgentName(agentName: string): string {
   return agentName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
 }

 getAgentIcon(agentName: string): string {
   const iconMap: { [key: string]: string } = {
     'query': 'storage',
     'risk_advisor': 'security',
     'knowledge': 'school',
     'visualization': 'bar_chart',
     'search': 'search',
     'web': 'public',
     'orchestrator': 'account_tree'
   };
   return iconMap[agentName] || 'smart_toy';
 }

 getAgentIconClass(agentName: string): string {
   return `agent-${agentName.replace('_', '-')}`;
 }

 formatAgentContribution(agentResponse: AgentResponse): string {
   if (!agentResponse.data) return 'No specific contribution data available.';
   
   // Format based on agent type
   if (agentResponse.agent_name.includes('risk')) {
     return this.formatRiskContribution(agentResponse.data);
   } else if (agentResponse.agent_name.includes('knowledge')) {
     return this.formatKnowledgeContribution(agentResponse.data);
   } else if (agentResponse.agent_name.includes('search')) {
     return this.formatSearchContribution(agentResponse.data);
   } else if (agentResponse.agent_name.includes('web')) {
     return this.formatWebContribution(agentResponse.data);
   } else {
     return this.formatGenericContribution(agentResponse.data);
   }
 }

 private formatRiskContribution(data: any): string {
   if (data.risk_score) {
     return `Risk Score: ${data.risk_score}/100. ${data.recommendations?.length || 0} recommendations provided.`;
   }
   return 'Risk analysis completed with recommendations.';
 }

 private formatKnowledgeContribution(data: any): string {
   if (data.answer) {
     return data.answer.substring(0, 150) + '...';
   }
   return 'Expert knowledge and guidance provided.';
 }

 private formatSearchContribution(data: any): string {
   if (data.total_results) {
     return `Found ${data.total_results} relevant documents from knowledge base.`;
   }
   return 'Document search completed.';
 }

 private formatWebContribution(data: any): string {
   if (data.total_sources) {
     return `Researched ${data.total_sources} external sources for current information.`;
   }
   return 'External research completed.';
 }

 private formatGenericContribution(data: any): string {
   return 'Analysis completed successfully.';
 }

 // Confidence scoring
 getConfidenceClass(score: number): string {
   if (score >= 0.8) return 'confidence-high';
   if (score >= 0.6) return 'confidence-medium';
   return 'confidence-low';
 }

 getConfidenceIcon(score: number): string {
   if (score >= 0.8) return 'check_circle';
   if (score >= 0.6) return 'help';
   return 'warning';
 }

 // Visualization methods
 hasVisualizations(): boolean {
   return !!(this.message.queryResponse?.visualization || this.getAgentVisualizations()?.length);
 }

 getAgentVisualizations(): any[] {
   if (!this.message.agentResponses) return [];
   
   const vizAgent = this.message.agentResponses['visualization'];
   if (vizAgent && vizAgent.data && vizAgent.data.visualizations) {
     return vizAgent.data.visualizations;
   }
   return [];
 }

 hasRiskInsights(): boolean {
   return !!(this.message.agentResponses && this.message.agentResponses['risk_advisor']);
 }

 formatRiskInsights(): string {
   if (!this.message.agentResponses || !this.message.agentResponses['risk_advisor']) {
     return '';
   }
   
   const riskData = this.message.agentResponses['risk_advisor'].data;
   if (!riskData) return '';
   
   let insights = '';
   
   if (riskData.overall_risk_score) {
     insights += `<h4>Overall Risk Score: ${riskData.overall_risk_score}/100</h4>`;
   }
   
   if (riskData.risk_factors && riskData.risk_factors.length > 0) {
     insights += '<h5>Key Risk Factors:</h5><ul>';
     riskData.risk_factors.forEach((factor: string) => {
       insights += `<li>${factor}</li>`;
     });
     insights += '</ul>';
   }
   
   if (riskData.recommendations && riskData.recommendations.length > 0) {
     insights += '<h5>Recommendations:</h5><ul>';
     riskData.recommendations.slice(0, 5).forEach((rec: string) => {
       insights += `<li>${rec}</li>`;
     });
     insights += '</ul>';
   }
   
   return insights;
 }

 // Response type checking
 isNoDataResponse(): boolean {
   return this.message.queryResponse?.response_type === 'no_data_found';
 }

 isSuccessfulResponse(): boolean {
   return this.message.queryResponse?.response_type === 'sql_convertible' ||
          this.message.queryResponse?.response_type === 'agentic_response' ||
          this.message.queryResponse?.response_type === 'property_risk_insurance' ||
          this.message.queryResponse?.response_type === 'data_insights';
 }

 // Suggestion methods (keep existing implementation)
 getSmartSuggestions(): string[] {
   // Keep your existing getSmartSuggestions implementation
   return [
     "Show me all properties",
     "What data do we have available?", 
     "Properties by state"
   ];
 }

 // Event handlers
 onRerun(): void {
   this.rerunQuery.emit(this.message);
 }

 onEditQuery(): void {
   if (this.message.queryResponse?.question) {
     this.editQuery.emit(this.message.queryResponse.question);
   }
 }

 onUseSuggestion(suggestion: string): void {
   this.useSuggestion.emit(suggestion);
 }

 onTryBroaderSearch(): void {
   // Generate a broader version of the original query
   if (this.message.queryResponse?.question) {
     const originalQuery = this.message.queryResponse.question;
     let broaderQuery = originalQuery;
     
     // Make the query broader by removing specific terms
     broaderQuery = broaderQuery.replace(/\b(high|low|above|below|over|under)\s+\d+/gi, '');
     broaderQuery = broaderQuery.replace(/\b(built after|built before)\s+\d{4}/gi, 'built');
     broaderQuery = broaderQuery.replace(/\bin\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi, '');
     
     if (broaderQuery === originalQuery) {
       broaderQuery = 'Show me all properties';
     }
     
     this.useSuggestion.emit(broaderQuery.trim());
   }
 }

 onShowAvailableData(): void {
   this.showAvailableData.emit();
 }
}