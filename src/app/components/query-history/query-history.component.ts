// src/app/components/query-history/query-history.component.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { ApiService } from '../../services/api.service';
import { QueryHistory } from '../../models/message.model';
@Component({
  selector: 'app-query-history',
  template: `
    <div class="history-container">
      <div class="history-tabs">
        <button 
          mat-button 
          [class.active]="activeTab === 'all'"
          (click)="setActiveTab('all')">
          Recent ({{Math.min(allQueriesCount, 20)}})
        </button>
        <button 
          mat-button 
          [class.active]="activeTab === 'bookmarked'"
          (click)="setActiveTab('bookmarked')">
          Bookmarked ({{bookmarkedCount}})
        </button>
        <button 
          mat-button 
          [class.active]="activeTab === 'suggestions'"
          (click)="setActiveTab('suggestions')">
          Suggestions
        </button>
        <button 
          mat-button 
          [class.active]="activeTab === 'agents'"
          (click)="setActiveTab('agents')">
          Agents ({{agentQueriesCount}})
        </button>
      </div>
      
      <div class="search-box" *ngIf="activeTab !== 'suggestions' && queryHistory.length > 5">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Search queries...</mat-label>
          <input matInput [(ngModel)]="searchQuery" (input)="filterHistory()">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>
      
      <div class="history-list">
        <!-- Query History -->
        <mat-list *ngIf="activeTab !== 'suggestions'">
          <mat-list-item 
            *ngFor="let query of filteredHistory; trackBy: trackByQuery"
            class="history-item"
            (click)="selectQuery(query.query)">
            
            <!-- UPDATED: New layout structure -->
            <div class="query-item-layout">
              <!-- Left side: Query content -->
              <div class="query-content-wrapper">
                <div class="query-text" [title]="query.query">{{query.query}}</div>
                <div class="query-timestamp">{{query.timestamp | date:'short'}}</div>
              </div>
              
              <!-- Right side: Bookmark button centered -->
              <div class="bookmark-wrapper">
                <button 
                  mat-icon-button 
                  (click)="toggleBookmark(query); $event.stopPropagation()"
                  [class.bookmarked]="query.isBookmarked"
                  [matTooltip]="query.isBookmarked ? 'Remove bookmark' : 'Add bookmark'"
                  class="bookmark-button">
                  <mat-icon>{{query.isBookmarked ? 'bookmark' : 'bookmark_border'}}</mat-icon>
                </button>
              </div>

        <div *ngIf="query.agentsUsed && query.agentsUsed.length > 0" class="agent-indicators">
          <mat-icon class="agent-icon" 
            *ngFor="let agent of query.agentsUsed.slice(0, 3)" 
            [title]="formatAgentName(agent)"
            [class]="getAgentIconClass(agent)">
            {{getAgentIcon(agent)}}
          </mat-icon>
           <span *ngIf="query.agentsUsed.length > 3" class="more-agents">+{{query.agentsUsed.length - 3}}</span>
        </div>
            </div>
          </mat-list-item>
        </mat-list>
        
        <!-- Suggestions -->
        <mat-list *ngIf="activeTab === 'suggestions'">
          <mat-list-item 
            *ngFor="let suggestion of suggestions"
            class="history-item suggestion-item"
            (click)="selectQuery(suggestion)">
            <div class="query-content-wrapper">
              <div class="query-text">{{suggestion}}</div>
            </div>
          </mat-list-item>
        </mat-list>
        
        <div *ngIf="filteredHistory.length === 0 && activeTab !== 'suggestions'" class="empty-state">
          <mat-icon>{{activeTab === 'bookmarked' ? 'bookmark_border' : 'history'}}</mat-icon>
          <p>{{getEmptyStateMessage()}}</p>
        </div>
        
        <div *ngIf="suggestions.length === 0 && activeTab === 'suggestions'" class="empty-state">
          <mat-icon>lightbulb</mat-icon>
          <p>No suggestions available</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: white;
      color: #333;
    }
    
    .history-tabs {
      display: flex;
      padding: 16px 16px 0 16px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .history-tabs button {
      color: #666;
      border-bottom: 2px solid transparent;
      font-size: 12px;
      font-weight: 500;
      margin-right: 8px;
      border-radius: 0 !important;
      background: none !important;
      box-shadow: none !important;
    }
    
    .history-tabs button.active {
      color: #2640e8;
      border-bottom: 2px solid #2640e8;
    }
    
    .history-tabs button:hover {
      background: rgba(38, 64, 232, 0.05) !important;
    }
    
    .search-box {
      padding: 16px;
    }
    
    .history-list {
      flex: 1;
      overflow-y: auto;
      padding: 0 16px 16px 16px;
    }
    
    .history-item {
      background-color: #f8f9fa;
      margin-bottom: 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      min-height: 60px !important;
      border: 1px solid #e9ecef;
      padding: 0 !important; /* Remove default padding */
    }
    
    .history-item:hover {
      background-color: #e3f2fd;
      border-color: #2640e8;
    }
    
    .suggestion-item {
      background-color: #f0f8ff;
      border-color: #b3d9ff;
    }
    
    .suggestion-item:hover {
      background-color: #e0f2ff;
    }
    
    /* UPDATED: New layout structure */
    .query-item-layout {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 12px 16px;
      gap: 12px;
    }
    
    .query-content-wrapper {
      flex: 1;
      min-width: 0; /* Allows text to wrap properly */
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .query-text {
      font-size: 14px;
      line-height: 1.3;
      color: #333;
      font-weight: 400;
      
      /* UPDATED: Single line with ellipsis for longer text */
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    
    .query-timestamp {
      font-size: 11px;
      color: #666;
      font-weight: 400;
      white-space: nowrap;
    }
    
    /* UPDATED: Centered bookmark button */
    .bookmark-wrapper {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .bookmark-button {
      color: #666;
      width: 32px !important;
      height: 32px !important;
      transition: all 0.2s ease;
    }
    
    .bookmark-button:hover {
      color: #ffc107 !important;
      background-color: rgba(255, 193, 7, 0.1) !important;
      transform: scale(1.1);
    }
    
    .bookmark-button.bookmarked {
      color: #ffc107 !important;
    }
    
    .bookmark-button.bookmarked:hover {
      color: #ff8f00 !important;
      background-color: rgba(255, 193, 7, 0.15) !important;
    }
    
    .bookmark-button mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      color: #666;
      text-align: center;
    }
    
    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }
    
    .full-width {
      width: 100%;
    }
    
    /* Override Material List Item styles */
    ::ng-deep .mat-mdc-list-item .mdc-list-item__content {
      padding: 0 !important;
    }
    
    ::ng-deep .mat-mdc-list-item {
      height: auto !important;
      min-height: auto !important;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .query-item-layout {
        padding: 10px 12px;
        gap: 8px;
      }
      
      .query-text {
        font-size: 13px;
        /* Keep single line with ellipsis on mobile too */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .query-timestamp {
        font-size: 10px;
      }
      
      .bookmark-button {
        width: 28px !important;
        height: 28px !important;
      }
      
      .bookmark-button mat-icon {
        font-size: 16px !important;
        width: 16px !important;
        height: 16px !important;
      }
    }
    
    /* Improve hover states */
    .history-item:hover .query-text {
      color: #2640e8;
    }
    
    .history-item:hover .bookmark-button {
      opacity: 1;
    }
    
    /* Subtle animation for bookmark state changes */
    .bookmark-button mat-icon {
      transition: all 0.2s ease;
    }
    
    .bookmark-button.bookmarked mat-icon {
      animation: bookmarkPulse 0.3s ease-out;
    }
    
    @keyframes bookmarkPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    /* Agent indicators styling */
.agent-indicators {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.agent-icon {
  font-size: 14px !important;
  width: 14px !important;
  height: 14px !important;
  opacity: 0.7;
}

.agent-query { color: #2196f3; }
.agent-risk-advisor { color: #f44336; }
.agent-knowledge { color: #9c27b0; }
.agent-visualization { color: #ff9800; }
.agent-search { color: #4caf50; }
.agent-web { color: #607d8b; }

.more-agents {
  font-size: 10px;
  color: #666;
  background: #e0e0e0;
  padding: 2px 4px;
  border-radius: 8px;
}

/* Enhanced tab styling for agents */
.history-tabs button.active {
  color: #2640e8;
  border-bottom: 2px solid #2640e8;
  background: linear-gradient(135deg, rgba(38, 64, 232, 0.1) 0%, rgba(38, 64, 232, 0.05) 100%);
}
  `]
})
export class QueryHistoryComponent implements OnInit, OnDestroy {
  @Output() querySelected = new EventEmitter<string>();
  
  queryHistory: QueryHistory[] = [];
  filteredHistory: QueryHistory[] = [];
  suggestions: string[] = [];
  activeTab: 'all' | 'bookmarked' | 'suggestions' | "agents" = 'all';
  searchQuery = '';
  Math = Math; // Expose Math to template
  agentQueriesCount = 0;
  
  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private apiService: ApiService
  ) {}

ngOnInit(): void {
  this.chatService.queryHistory$
    .pipe(takeUntil(this.destroy$))
    .subscribe(history => {
      this.queryHistory = history.slice(0, 20); // Limit to last 20
      this.agentQueriesCount = history.filter(q => q.responseType === 'agentic_response').length;
      this.filterHistory();
    });
    
  this.loadSuggestions();
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSuggestions(): void {
    // Sample suggestions - you can customize these
    this.suggestions = [
      "What is the total insured value by state?",
      "Show me properties with high earthquake risk",
      "List all buildings built after 2000",
      "Properties in flood zones",
      "Average TIV by construction type",
      "Buildings without sprinkler systems",
      "Revenue distribution by business unit",
      "Properties with basement flood risk",
      "Construction quality analysis by region",
      "Show locations on map"
    ];
  }

  trackByQuery(index: number, query: QueryHistory): string {
    return query.id;
  }

  toggleBookmark(query: QueryHistory): void {
    this.chatService.toggleBookmark(query.id);
  }

  selectQuery(queryText: string): void {
    this.querySelected.emit(queryText);
  }

filterHistory(): void {
  if (this.activeTab === 'suggestions') return;
  
  let filtered = this.queryHistory;
  
  if (this.activeTab === 'bookmarked') {
    filtered = filtered.filter(q => q.isBookmarked);
  } else if (this.activeTab === 'agents') {
    filtered = filtered.filter(q => q.responseType === 'agentic_response');
  }
  
  if (this.searchQuery.trim()) {
    const searchTerm = this.searchQuery.toLowerCase();
    filtered = filtered.filter(q => 
      q.query.toLowerCase().includes(searchTerm)
    );
  }
  
  this.filteredHistory = filtered;
}

  get allQueriesCount(): number {
    return this.queryHistory.length;
  }

  get bookmarkedCount(): number {
    return this.queryHistory.filter(q => q.isBookmarked).length;
  }

  getEmptyStateMessage(): string {
    if (this.activeTab === 'bookmarked') {
      return 'No bookmarked queries yet';
    }
    if (this.searchQuery.trim()) {
      return 'No queries match your search';
    }
    return 'No queries found';
  }

  refreshHistory(): void {
  this.chatService.refreshHistory();
}

setActiveTab(tab: 'all' | 'bookmarked' | 'suggestions' | 'agents'): void {
  this.activeTab = tab;
  this.filterHistory();
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
    'web': 'public'
  };
  return iconMap[agentName] || 'smart_toy';
}

getAgentIconClass(agentName: string): string {
  return `agent-${agentName.replace('_', '-')}`;
}


}