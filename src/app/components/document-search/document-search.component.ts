import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { AgentService } from '../../services/agent.service';
import { DocumentSearchResult } from '../../models/message.model';

@Component({
  selector: 'app-document-search',
  template: `
    <div class="document-search-panel">
      <div class="search-header">
        <mat-icon>search</mat-icon>
        <h4>Document Search</h4>
        <button mat-icon-button (click)="toggleExpanded()" class="expand-btn">
          <mat-icon>{{isExpanded ? 'expand_less' : 'expand_more'}}</mat-icon>
        </button>
      </div>
      
      <div class="search-content" *ngIf="isExpanded">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search documents...</mat-label>
          <input matInput [formControl]="searchControl" placeholder="Enter search terms">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="collection-field">
          <mat-label>Collection</mat-label>
          <mat-select [formControl]="collectionControl">
            <mat-option value="general">General</mat-option>
            <mat-option value="risk_engineering_reports">Risk Engineering</mat-option>
            <mat-option value="industry_standards">Industry Standards</mat-option>
            <mat-option value="regulatory_documents">Regulatory Docs</mat-option>
            <mat-option value="best_practices">Best Practices</mat-option>
            <mat-option value="case_studies">Case Studies</mat-option>
          </mat-select>
        </mat-form-field>
        
        <button mat-stroked-button (click)="performSearch()" [disabled]="!searchControl.value || isSearching" class="search-btn">
          <mat-icon>{{isSearching ? 'hourglass_empty' : 'search'}}</mat-icon>
          {{isSearching ? 'Searching...' : 'Search'}}
        </button>
        
        <!-- Search Results -->
        <div class="search-results" *ngIf="searchResults.length > 0 || hasSearched">
          <div class="results-header">
            <span class="results-count">{{searchResults.length}} results found</span>
            <button mat-icon-button (click)="clearResults()" class="clear-btn" *ngIf="searchResults.length > 0">
              <mat-icon>clear</mat-icon>
            </button>
          </div>
          
          <div class="results-list" *ngIf="searchResults.length > 0">
            <div *ngFor="let result of searchResults.slice(0, 5)" class="result-item">
              <div class="result-header">
                <span class="result-source">{{result.source}}</span>
                <span class="result-score">{{(result.similarity_score * 100).toFixed(0)}}%</span>
              </div>
              <div class="result-content">{{result.content | slice:0:150}}{{result.content.length > 150 ? '...' : ''}}</div>
            </div>
          </div>
          
          <div class="no-results" *ngIf="searchResults.length === 0 && hasSearched">
            <mat-icon>search_off</mat-icon>
            <p>No documents found matching your search.</p>
          </div>
        </div>
        
        <!-- Collections Info -->
        <div class="collections-info" *ngIf="!hasSearched">
          <button mat-button (click)="loadCollections()" class="info-btn">
            <mat-icon>folder</mat-icon>
            View Collections
          </button>
          
          <div class="collections-list" *ngIf="collections && Object.keys(collections).length > 0">
            <div *ngFor="let collection of Object.keys(collections)" class="collection-item">
              <span class="collection-name">{{formatCollectionName(collection)}}</span>
              <span class="doc-count">{{collections[collection].document_count}} docs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .document-search-panel {
      background: white;
      border-radius: 12px;
      margin: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .search-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
      cursor: pointer;
    }
    
    .search-header mat-icon {
      color: #4caf50;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    
    .search-header h4 {
      margin: 0;
      flex: 1;
      font-size: 14px;
      font-weight: 600;
    }
    
    .expand-btn {
      width: 24px !important;
      height: 24px !important;
      line-height: 24px;
    }
    
    .expand-btn mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      color: #666 !important;
    }
    
    .search-content {
      padding: 16px;
    }
    
    .search-field, .collection-field {
      width: 100%;
      margin-bottom: 12px;
    }
    
    .search-btn {
      width: 100%;
      color: #4caf50 !important;
      border-color: #4caf50 !important;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
    }
    
    .search-btn:disabled {
      color: #ccc !important;
      border-color: #ccc !important;
    }
    
    .search-results {
      border-top: 1px solid #e0e0e0;
      padding-top: 16px;
    }
    
    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .results-count {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }
    
    .clear-btn {
      width: 24px !important;
      height: 24px !important;
    }
    
    .clear-btn mat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }
    
    .results-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .result-item {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 3px solid #4caf50;
    }
    
    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .result-source {
      font-weight: 500;
      font-size: 12px;
      color: #333;
    }
    
    .result-score {
      background: #4caf50;
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 500;
    }
    
    .result-content {
      font-size: 12px;
      line-height: 1.4;
      color: #666;
    }
    
    .no-results {
      text-align: center;
      padding: 24px;
      color: #666;
    }
    
    .no-results mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
      color: #ccc;
    }
    
    .no-results p {
      margin: 0;
      font-size: 14px;
    }
    
    .collections-info {
      border-top: 1px solid #e0e0e0;
      padding-top: 16px;
    }
    
    .info-btn {
      width: 100%;
      color: #666 !important;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .collections-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .collection-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    
    .collection-name {
      font-size: 12px;
      color: #333;
      font-weight: 500;
    }
    
    .doc-count {
      font-size: 10px;
      color: #666;
      background: #e0e0e0;
      padding: 2px 6px;
      border-radius: 8px;
    }
  `]
})
export class DocumentSearchComponent implements OnInit, OnDestroy {
  searchControl = new FormControl('');
  collectionControl = new FormControl('general');
  isExpanded = false;
  isSearching = false;
  hasSearched = false;
  searchResults: DocumentSearchResult[] = [];
  collections: any = {};
  
  private destroy$ = new Subject<void>();

  constructor(private agentService: AgentService) {}

  ngOnInit(): void {
    // Auto-search on input with debounce
    this.searchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(value => {
        if (value && value.length > 2) {
          this.performSearch();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    
    if (this.isExpanded && Object.keys(this.collections).length === 0) {
      this.loadCollections();
    }
  }

  performSearch(): void {
    const query = this.searchControl.value?.trim();
    if (!query) return;

    this.isSearching = true;
    this.hasSearched = true;

    const searchRequest = {
      query: query,
      collection: this.collectionControl.value || 'general',
      max_results: 5
    };

    this.agentService.searchDocuments(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSearching = false;
          if (response.success && response.data && response.data.results) {
            this.searchResults = response.data.results;
          } else {
            this.searchResults = [];
          }
        },
        error: (error) => {
          this.isSearching = false;
          this.searchResults = [];
          console.error('Document search error:', error);
        }
      });
  }

  clearResults(): void {
    this.searchResults = [];
    this.hasSearched = false;
    this.searchControl.setValue('');
  }

  loadCollections(): void {
    this.agentService.listCollections()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.collections) {
            this.collections = response.collections;
          }
        },
        error: (error) => {
          console.error('Error loading collections:', error);
        }
      });
  }

  formatCollectionName(name: string): string {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}