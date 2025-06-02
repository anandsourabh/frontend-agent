import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { Message, QueryRequest, QueryResponse, ChatHistory, BookmarkRequest } from '../models/chat.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly API_BASE_URL = environment.apiUrl || 'http://localhost:8000/api';
  
  // State management
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private historySubject = new BehaviorSubject<ChatHistory[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  // Public observables
  public messages$ = this.messagesSubject.asObservable();
  public history$ = this.historySubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  
  // Local cache for UI responsiveness
  private messagesCache: Message[] = [];
  private historyCache: ChatHistory[] = [];
  
  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  // ================================
  // MAIN QUERY PROCESSING
  // ================================

  /**
   * Send query to backend - automatically saves to database
   */
  sendQuery(request: QueryRequest): Observable<QueryResponse> {
    this.setLoading(true);
    
    // Add user message to UI immediately
    const userMessage: Message = {
      id: this.generateId(),
      content: request.question,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };
    this.addMessageToUI(userMessage);
    
    const headers = this.getHeaders();
    
    return this.http.post<QueryResponse>(`${this.API_BASE_URL}/query`, request, { headers })
      .pipe(
        tap(response => {
          // Add assistant response to UI
          const assistantMessage = this.convertResponseToMessage(response, userMessage.id);
          this.addMessageToUI(assistantMessage);
          
          // Backend automatically saves to database
          console.log('Query processed and saved to database');
        }),
        catchError(error => {
          // Add error message to UI
          const errorMessage: Message = {
            id: this.generateId(),
            content: this.getErrorMessage(error),
            isUser: false,
            timestamp: new Date(),
            type: 'error',
            confidence: 0,
            responseType: 'error',
            relatedMessageId: userMessage.id
          };
          this.addMessageToUI(errorMessage);
          
          return this.handleError('Send Query', error);
        }),
        tap(() => this.setLoading(false))
      );
  }

  // ================================
  // MESSAGE MANAGEMENT
  // ================================

  /**
   * Load messages from database
   */
  loadMessages(limit: number = 50): Observable<ChatHistory[]> {
    const headers = this.getHeaders();
    const params = { limit: limit.toString() };

    return this.http.get<ChatHistory[]>(`${this.API_BASE_URL}/history`, { headers, params })
      .pipe(
        tap(history => {
          // Convert history to messages and update UI
          const messages = this.convertHistoryToMessages(history);
          this.messagesCache = messages;
          this.messagesSubject.next([...this.messagesCache]);
        }),
        catchError(error => this.handleError('Load Messages', error))
      );
  }

  /**
   * Clear conversation
   */
  clearConversation(): Observable<any> {
    const headers = this.getHeaders();

    return this.http.delete(`${this.API_BASE_URL}/conversation`, { headers })
      .pipe(
        tap(() => {
          this.messagesCache = [];
          this.messagesSubject.next([]);
          this.historyCache = [];
          this.historySubject.next([]);
        }),
        catchError(error => this.handleError('Clear Conversation', error))
      );
  }

  /**
   * Add message to local UI cache
   */
  addMessage(message: Message): void {
    this.addMessageToUI(message);
  }

  // ================================
  // CHAT HISTORY
  // ================================

  /**
   * Load chat history from database
   */
  loadChatHistory(limit: number = 50): Observable<ChatHistory[]> {
    const headers = this.getHeaders();
    const params = { limit: limit.toString() };

    return this.http.get<ChatHistory[]>(`${this.API_BASE_URL}/history`, { headers, params })
      .pipe(
        tap(history => {
          this.historyCache = history;
          this.historySubject.next([...this.historyCache]);
        }),
        catchError(error => this.handleError('Load History', error))
      );
  }

  /**
   * Search chat history
   */
  searchHistory(searchTerm: string): ChatHistory[] {
    if (!searchTerm.trim()) {
      return this.historyCache;
    }

    const term = searchTerm.toLowerCase();
    return this.historyCache.filter(item => 
      item.query.toLowerCase().includes(term) ||
      item.responseType.toLowerCase().includes(term)
    );
  }

  // ================================
  // BOOKMARKS
  // ================================

  /**
   * Bookmark a query
   */
  bookmarkQuery(queryId: string, title?: string, notes?: string): Observable<any> {
    const headers = this.getHeaders();
    const request: BookmarkRequest = {
      query_id: queryId,
      title: title,
      notes: notes
    };

    return this.http.post(`${this.API_BASE_URL}/bookmarks`, request, { headers })
      .pipe(
        tap(() => {
          this.updateBookmarkStatus(queryId, true);
        }),
        catchError(error => this.handleError('Bookmark Query', error))
      );
  }

  /**
   * Remove bookmark
   */
  removeBookmark(queryId: string): Observable<any> {
    const headers = this.getHeaders();

    return this.http.delete(`${this.API_BASE_URL}/bookmarks/${queryId}`, { headers })
      .pipe(
        tap(() => {
          this.updateBookmarkStatus(queryId, false);
        }),
        catchError(error => this.handleError('Remove Bookmark', error))
      );
  }

  /**
   * Get bookmarks
   */
  getBookmarks(): Observable<any[]> {
    const headers = this.getHeaders();

    return this.http.get<any[]>(`${this.API_BASE_URL}/bookmarks`, { headers })
      .pipe(
        catchError(error => this.handleError('Get Bookmarks', error))
      );
  }

  // ================================
  // DOCUMENT SEARCH
  // ================================

  /**
   * Search documents
   */
  searchDocuments(query: string, collection: string = 'general'): Observable<any> {
    const headers = this.getHeaders();
    const request = {
      query: query,
      collection_name: collection,
      max_results: 5
    };

    return this.http.post(`${this.API_BASE_URL}/documents/search`, request, { headers })
      .pipe(
        catchError(error => this.handleError('Search Documents', error))
      );
  }

  /**
   * Get document collections
   */
  getDocumentCollections(): Observable<any> {
    const headers = this.getHeaders();

    return this.http.get(`${this.API_BASE_URL}/documents/collections`, { headers })
      .pipe(
        catchError(error => this.handleError('Get Collections', error))
      );
  }

  // ================================
  // ANALYTICS
  // ================================

  /**
   * Get user insights
   */
  getUserInsights(): Observable<any> {
    const headers = this.getHeaders();

    return this.http.get(`${this.API_BASE_URL}/analytics/insights`, { headers })
      .pipe(
        catchError(error => this.handleError('Get Insights', error))
      );
  }

  /**
   * Export conversation
   */
  exportConversation(): Observable<any> {
    const headers = this.getHeaders();

    return this.http.get(`${this.API_BASE_URL}/conversation/export`, { 
      headers, 
      responseType: 'blob' 
    })
      .pipe(
        catchError(error => this.handleError('Export Conversation', error))
      );
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Get current messages
   */
  getCurrentMessages(): Message[] {
    return [...this.messagesCache];
  }

  /**
   * Get current history
   */
  getCurrentHistory(): ChatHistory[] {
    return [...this.historyCache];
  }

  /**
   * Refresh data from database
   */
  refreshData(): void {
    this.loadMessages().subscribe({
      next: () => console.log('Data refreshed'),
      error: (error) => console.warn('Refresh failed:', error)
    });
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  private addMessageToUI(message: Message): void {
    this.messagesCache.push(message);
    this.messagesSubject.next([...this.messagesCache]);
  }

  private convertResponseToMessage(response: QueryResponse, relatedId?: string): Message {
    return {
      id: response.query_id,
      content: response.explanation || response.summary || 'Response received',
      isUser: false,
      timestamp: new Date(response.timestamp),
      type: this.getMessageType(response),
      confidence: response.confidence_score,
      responseType: response.response_type,
      data: response.data,
      sqlQuery: response.sql_query,
      agentResponses: response.agent_responses,
      visualization: response.visualization,
      suggestions: response.suggestions,
      metadata: response.metadata,
      processingTime: response.processing_time_ms,
      relatedMessageId: relatedId
    };
  }

  private convertHistoryToMessages(history: ChatHistory[]): Message[] {
    const messages: Message[] = [];
    
    history.forEach(item => {
      // User message
      messages.push({
        id: `user_${item.id}`,
        content: item.query,
        isUser: true,
        timestamp: new Date(item.timestamp),
        type: 'text'
      });
      
      // Assistant message
      if (item.summary) {
        messages.push({
          id: item.id,
          content: item.summary,
          isUser: false,
          timestamp: new Date(item.timestamp),
          type: this.getMessageTypeFromResponse(item.responseType),
          confidence: item.confidenceScore,
          responseType: item.responseType,
          sqlQuery: item.sqlQuery,
          processingTime: item.processingTime,
          isBookmarked: item.isBookmarked,
          relatedMessageId: `user_${item.id}`
        });
      }
    });
    
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private getMessageType(response: QueryResponse): 'text' | 'data' | 'chart' | 'error' {
    if (response.response_type === 'error') return 'error';
    if (response.visualization) return 'chart';
    if (response.data) return 'data';
    return 'text';
  }

  private getMessageTypeFromResponse(responseType: string): 'text' | 'data' | 'chart' | 'error' {
    if (responseType === 'error') return 'error';
    if (responseType === 'sql_convertible') return 'data';
    return 'text';
  }

  private updateBookmarkStatus(queryId: string, isBookmarked: boolean): void {
    // Update message cache
    const message = this.messagesCache.find(m => m.id === queryId);
    if (message) {
      message.isBookmarked = isBookmarked;
      this.messagesSubject.next([...this.messagesCache]);
    }

    // Update history cache
    const historyItem = this.historyCache.find(h => h.id === queryId);
    if (historyItem) {
      historyItem.isBookmarked = isBookmarked;
      this.historySubject.next([...this.historyCache]);
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoadingSubject.next(loading);
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'company_number': this.getCompanyNumber(),
      'user_id': this.getUserId()
    });
  }

  private getCompanyNumber(): string {
    return localStorage.getItem('company_number') || 'default_company';
  }

  private getUserId(): string {
    return localStorage.getItem('user_id') || `user_${Date.now()}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getErrorMessage(error: any): string {
    if (error.error?.detail) return error.error.detail;
    if (error.error?.message) return error.error.message;
    if (error.message) return error.message;
    return 'An error occurred while processing your request.';
  }

  private handleError(operation: string, error: any): Observable<never> {
    console.error(`${operation} failed:`, error);
    this.setLoading(false);
    
    return throwError(() => ({
      operation,
      message: this.getErrorMessage(error),
      originalError: error
    }));
  }

  private loadInitialData(): void {
    this.loadMessages().subscribe({
      next: () => console.log('Initial data loaded'),
      error: (error) => console.warn('Failed to load initial data:', error)
    });
  }
}