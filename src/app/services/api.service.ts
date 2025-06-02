import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, of, forkJoin } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { QueryRequest, QueryResponse, ChatHistory, BookmarkRequest, FeedbackRequest } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}

  processQuery(queryRequest: QueryRequest): Observable<QueryResponse> {
    return this.http.post<QueryResponse>(`${this.baseUrl}/query`, queryRequest, {
  
    });
  }

  getSchema(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/schema`, {
  
    });
  }

 getChatHistory(): Observable<ChatHistory[]> {
  return this.http.get<ChatHistory[]>(`${this.baseUrl}/history`, {

  }).pipe(
    retry(2), // Retry failed requests twice
    catchError((error) => {
      console.error('Error fetching chat history:', error);
      return of([]); // Return empty array on error
    })
  );
}

  getQuerySuggestions(query: string, limit: number = 5): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/suggestions`, {
      params: { q: query, limit: limit.toString() },
    });
  }

  bookmarkQuery(request: BookmarkRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/bookmark`, request, {
    });
  }

  getBookmarks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/bookmarks`, {
    });
  }

  removeBookmark(queryId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bookmark/${queryId}`, {
    });
  }

  getUserStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats`, {
    });
  }

  submitFeedback(feedback: FeedbackRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/feedback`, feedback, {
    });
  }

  // Add these new methods to your existing ApiService class:

// Agent management endpoints
getAgentStatus(): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/agents/status`);
}

// Document search endpoints  
searchDocuments(query: string, collection: string = 'general', maxResults: number = 5): Observable<any> {
  return this.http.post<any>(`${this.baseUrl}/documents/search`, null, {
    params: {
      query: query,
      collection_name: collection,
      max_results: maxResults.toString()
    }
  });
}

vectorizeDocument(filePath: string, collection: string = 'general', metadata?: any): Observable<any> {
  return this.http.post<any>(`${this.baseUrl}/documents/vectorize`, null, {
    params: {
      file_path: filePath,
      collection_name: collection,
      metadata: metadata ? JSON.stringify(metadata) : ''
    }
  });
}

listDocumentCollections(): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/documents/collections`);
}

deleteDocument(docId: string, collection: string = 'general'): Observable<any> {
  return this.http.delete(`${this.baseUrl}/documents/${docId}`, {
    params: { collection_name: collection }
  });
}

// Enhanced query processing with retry logic
processQueryWithRetry(queryRequest: QueryRequest, maxRetries: number = 3): Observable<QueryResponse> {
  return this.processQuery(queryRequest).pipe(
    retry(maxRetries),
    catchError((error) => {
      console.error('Query processing failed after retries:', error);
      
      // Return a fallback response
      const fallbackResponse: QueryResponse = {
        query_id: this.generateId(),
        question: queryRequest.question,
        explanation: 'The AI agents encountered an issue processing your request. Please try rephrasing your question or contact support if the issue persists.',
        summary: 'Processing error - please try again',
        timestamp: new Date().toISOString(),
        response_type: 'processing_error'
      };
      
      return of(fallbackResponse);
    })
  );
}

// Batch query processing for multiple questions
processBatchQueries(queries: string[]): Observable<QueryResponse[]> {
  const requests = queries.map(query => this.processQuery({ question: query }));
  return forkJoin(requests);
}

// Query analytics
getQueryAnalytics(timeframe: string = '7d'): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/analytics/queries`, {
    params: { timeframe }
  });
}

private generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}


  
}
