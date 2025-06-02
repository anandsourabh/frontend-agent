import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Message } from '../../models/message.model';
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
          <span class="sender">{{message.isUser ? 'You' : 'AI Assistant'}}</span>
          <span class="timestamp">{{message.timestamp | date:'short'}}</span>
        </div>
        <div class="message-status" *ngIf="message.isUser">
          <mat-icon *ngIf="message.status === 'sending'">schedule</mat-icon>
          <mat-icon *ngIf="message.status === 'sent'">check</mat-icon>
          <mat-icon *ngIf="message.status === 'error'" class="error">error</mat-icon>
        </div>
      </div>
      
      <div class="message-body">
        <!-- Show summary instead of full content for bot messages -->
        <div class="message-text" *ngIf="message.isUser" [innerHTML]="getFormattedContent()"></div>
        <div class="message-text" *ngIf="!message.isUser && message.summary" [innerHTML]="getFormattedSummary()"></div>
        <div class="message-text" *ngIf="!message.isUser && !message.summary" [innerHTML]="getFormattedContent()"></div>
        
        <!-- ENHANCED: Better error message display -->
        <div *ngIf="message.error" class="error-message">
          <mat-icon>error</mat-icon>
          <span>{{message.error}}</span>
        </div>
        
        <!-- ENHANCED: No data found handling with smart suggestions -->
        <div *ngIf="!message.isUser && isNoDataResponse()" class="no-data-message">
          <div class="no-data-header">
            <mat-icon>search_off</mat-icon>
            <div class="no-data-title">
              <h4>No Results Found</h4>
              <p>Your query was understood but didn't return any data.</p>
            </div>
          </div>
          
          <!-- Quick action buttons -->
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

          <!-- Smart suggestions based on the query -->
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

        <!-- ENHANCED: Query generation failed handling -->
        <div *ngIf="!message.isUser && isQueryFailedResponse()" class="query-failed-message">
          <div class="query-failed-header">
            <mat-icon>psychology</mat-icon>
            <div class="query-failed-title">
              <h4>Need Help Understanding</h4>
              <p>I had trouble converting your question to a database query.</p>
            </div>
          </div>
          
          <div class="quick-actions">
            <button mat-stroked-button (click)="onEditQuery()" class="action-button edit-btn">
              <mat-icon>edit</mat-icon>
              Rephrase
            </button>
            <button mat-stroked-button (click)="onShowExamples()" class="action-button examples-btn">
              <mat-icon>quiz</mat-icon>
              See Examples
            </button>
            <button mat-stroked-button (click)="onSimplifyQuery()" class="action-button simple-btn">
              <mat-icon>straighten</mat-icon>
              Simplify
            </button>
          </div>

          <!-- Example queries that work -->
          <div class="example-queries">
            <h5><mat-icon>star</mat-icon> Example queries that work:</h5>
            <div class="example-list">
              <button 
                *ngFor="let example of getExampleQueries().slice(0, 4)" 
                mat-button 
                (click)="onUseExample(example)"
                class="example-button">
                <mat-icon>arrow_forward</mat-icon>
                {{example}}
              </button>
            </div>
          </div>
        </div>

        <!-- ENHANCED: Processing error handling -->
        <div *ngIf="!message.isUser && isProcessingErrorResponse()" class="processing-error-message">
          <div class="error-header">
            <mat-icon>warning</mat-icon>
            <div class="error-title">
              <h4>Technical Issue</h4>
              <p>Something went wrong while processing your request.</p>
            </div>
          </div>
          
          <div class="quick-actions">
            <button mat-stroked-button (click)="onRetryQuery()" class="action-button retry-btn">
              <mat-icon>refresh</mat-icon>
              Try Again
            </button>
            <button mat-stroked-button (click)="onSimplifyQuery()" class="action-button simple-btn">
              <mat-icon>straighten</mat-icon>
              Simpler Query
            </button>
          </div>
        </div>
        
        <div *ngIf="message.sqlQuery && !message.isUser" class="sql-section">
          <app-sql-code [sql]="message.sqlQuery" (rerun)="onRerun()"></app-sql-code>
        </div>
        
        <!-- Only show AI Explanation for successful SQL queries -->
        <div *ngIf="message.explanation && !message.isUser && message.queryResponse?.response_type === 'sql_convertible'" class="explanation-section">
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>AI Explanation</mat-panel-title>
            </mat-expansion-panel-header>
            <div [innerHTML]="getFormattedExplanation()"></div>
          </mat-expansion-panel>
        </div>
        
        <div *ngIf="message.data && message.data.length > 0" class="data-section">
          <mat-expansion-panel [expanded]="true">
            <mat-expansion-panel-header>
              <mat-panel-title>Query Results ({{message.data.length}} rows)</mat-panel-title>
              <!--<mat-panel-description *ngIf="message.queryResponse?.response_type">
                Type: {{message.queryResponse?.response_type}}
              </mat-panel-description>-->
            </mat-expansion-panel-header>
            
            <div class="data-content">
              <mat-tab-group>
                <mat-tab label="Table">
                  <app-data-table [data]="message.data"></app-data-table>
                </mat-tab>
                <mat-tab label="Chart" *ngIf="message.queryResponse?.visualization">
                  <app-chart 
                    [data]="message.data"
                    [visualizationConfig]="message.queryResponse?.visualization">
                  </app-chart>
                </mat-tab>
              </mat-tab-group>
            </div>
          </mat-expansion-panel>
        </div>
        
        <!-- AI Generated Notice - only for successful responses -->
        <div *ngIf="!message.isUser && message.status !== 'error' && isSuccessfulResponse()" class="ai-notice">
          <mat-icon>info</mat-icon>
          <span>This response is AI-generated. Please verify the accuracy and relevance of the information before use.</span>
        </div>
      </div>
    </div>
  </div>
`,
  styles: [`
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
      max-width: 80%;
      background-color: white;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .user-message .message-content {
      color: black;
      border: 1px solid steelblue;
    }
    
    .message-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #293340;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .message-info {
      flex: 1;
    }
    
    .sender {
      font-weight: 500;
      display: block;
    }
    
    .timestamp {
      font-size: 12px;
      opacity: 0.7;
    }
    
    .message-status {
      color: #4caf50;
    }
    
    .message-status .error {
      color: #f44336;
    }
    
    .message-text {
      line-height: 1.5;
    }
    
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

    /* ENHANCED: Comprehensive styling for different message types */
    .no-data-message {
      background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
      border: 1px solid #ffb74d;
      border-radius: 12px;
      padding: 20px;
      margin-top: 16px;
    }

    .query-failed-message {
      background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
      border: 1px solid #ba68c8;
      border-radius: 12px;
      padding: 20px;
      margin-top: 16px;
    }

    .processing-error-message {
      background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
      border: 1px solid #ef5350;
      border-radius: 12px;
      padding: 20px;
      margin-top: 16px;
    }

    .no-data-header, .query-failed-header, .error-header {
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

    .query-failed-header mat-icon {
      color: #9c27b0;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .error-header mat-icon {
      color: #f44336;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .no-data-title h4, .query-failed-title h4, .error-title h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .no-data-title p, .query-failed-title p, .error-title p {
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

    .broader-btn, .simple-btn {
      color: #2196f3 !important;
      border-color: #2196f3 !important;
    }

    .data-btn, .examples-btn {
      color: #4caf50 !important;
      border-color: #4caf50 !important;
    }

    .retry-btn {
      color: #9c27b0 !important;
      border-color: #9c27b0 !important;
    }

    .smart-suggestions, .example-queries {
      margin-top: 12px;
    }

    .smart-suggestions h5, .example-queries h5 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #666;
    }

    .smart-suggestions h5 mat-icon, .example-queries h5 mat-icon {
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

    .example-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .example-button {
      text-align: left !important;
      justify-content: flex-start !important;
      padding: 8px 12px !important;
      color: #666 !important;
      font-size: 13px !important;
      border-radius: 8px !important;
      background-color: rgba(0,0,0,0.02) !important;
    }

    .example-button:hover {
      background-color: rgba(156, 39, 176, 0.04) !important;
      color: #9c27b0 !important;
    }

    .example-button mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      margin-right: 8px !important;
    }
    
    .sql-section,
    .explanation-section,
    .data-section {
      margin-top: 16px;
    }
    
    .data-content {
      margin-top: 16px;
    }
    
    @media (max-width: 768px) {
      .message-content {
        max-width: 95%;
      }
      
      .quick-actions {
        flex-direction: column;
      }
      
      .action-button {
        width: 100% !important;
        justify-content: center;
      }
      
      .suggestion-chips {
        flex-direction: column;
      }
    }

    .ai-notice {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding: 8px 12px;
      background-color: rgba(255, 193, 7, 0.1);
      border-radius: 6px;
      font-size: 12px;
      color: #f57c00;
      border-left: 3px solid #ffc107;
    }
    
    .ai-notice mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
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

  // ENHANCED: Check different response types
  isNoDataResponse(): boolean {
    return this.message.queryResponse?.response_type === 'no_data_found';
  }

  isQueryFailedResponse(): boolean {
    return this.message.queryResponse?.response_type === 'query_generation_failed';
  }

  isProcessingErrorResponse(): boolean {
    return this.message.queryResponse?.response_type === 'processing_error';
  }

  isSuccessfulResponse(): boolean {
    return this.message.queryResponse?.response_type === 'sql_convertible' ||
           this.message.queryResponse?.response_type === 'property_risk_insurance' ||
           this.message.queryResponse?.response_type === 'data_insights';
  }

  // ENHANCED: Generate smart suggestions based on the original query
  getSmartSuggestions(): string[] {
    if (!this.message.queryResponse?.question) return [];
    
    const question = this.message.queryResponse.question.toLowerCase();
    const suggestions: string[] = [];

    // Location-based suggestions
    if (question.includes('california') || question.includes('texas') || question.includes('florida')) {
      suggestions.push('What states do we have data for?');
      suggestions.push('Show me properties in the US');
      suggestions.push('List all available locations');
    }
    
    // Risk-based suggestions
    else if (question.includes('earthquake') || question.includes('flood') || question.includes('hurricane')) {
      suggestions.push('What hazard zones are available?');
      suggestions.push('Show me properties with any natural disaster risk');
      suggestions.push('List properties by risk category');
    }
    
    // Value-based suggestions
    else if (question.includes('value') || question.includes('tiv') || question.includes('insured')) {
      suggestions.push('What is the range of property values?');
      suggestions.push('Show me average insured values by state');
      suggestions.push('List properties with highest values');
    }
    
    // Date-based suggestions
    else if (question.includes('built') || question.includes('year') || question.includes('construction')) {
      suggestions.push('What is the range of construction years?');
      suggestions.push('Show me properties built in the last 20 years');
      suggestions.push('List properties by construction decade');
    }
    
    // Default suggestions
    else {
      suggestions.push('Show me all properties');
      suggestions.push('What data do we have available?');
      suggestions.push('List properties by state');
    }

    return suggestions;
  }

  // ENHANCED: Example queries that typically work
  getExampleQueries(): string[] {
    return [
      'What is the total insured value by state?',
      'Show me properties with high earthquake risk',
      'List all buildings built after 2000',
      'Properties in California',
      'Average TIV by construction type',
      'Buildings without sprinkler systems',
      'Show locations on map',
      'Properties in flood zones'
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

  onUseExample(example: string): void {
    this.useSuggestion.emit(example);
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
      broaderQuery = broaderQuery.replace(/\bwith\s+[a-z]+\s+(earthquake|flood|hurricane|tornado)/gi, 'with natural disaster risk');
      
      // If no changes were made, use a generic broader query
      if (broaderQuery === originalQuery) {
        broaderQuery = 'Show me all properties';
      }
      
      this.useSuggestion.emit(broaderQuery.trim());
    }
  }

  onShowAvailableData(): void {
    this.showAvailableData.emit();
  }

  onShowExamples(): void {
    // Emit the first example query
    const examples = this.getExampleQueries();
    if (examples.length > 0) {
      this.useSuggestion.emit(examples[0]);
    }
  }

  onSimplifyQuery(): void {
    // Suggest a very simple query
    this.useSuggestion.emit('Show me all properties');
  }

  onRetryQuery(): void {
    if (this.message.queryResponse?.question) {
      this.useSuggestion.emit(this.message.queryResponse.question);
    }
  }
}