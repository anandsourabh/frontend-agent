import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AgentStatus, DocumentSearchRequest, DocumentSearchResult } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private baseUrl = environment.apiUrl;
  private agentStatusSubject = new BehaviorSubject<{ [key: string]: AgentStatus }>({});
  
  agentStatus$ = this.agentStatusSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Agent status management
  getAgentStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/agents/status`);
  }

  updateAgentStatus(status: { [key: string]: AgentStatus }): void {
    this.agentStatusSubject.next(status);
  }

  // Document management
  searchDocuments(request: DocumentSearchRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/documents/search`, null, {
      params: {
        query: request.query,
        collection_name: request.collection || 'general',
        max_results: (request.max_results || 5).toString()
      }
    });
  }

  vectorizeDocument(filePath: string, collection: string = 'general', metadata?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/documents/vectorize`, null, {
      params: {
        file_path: filePath,
        collection_name: collection,
        metadata: metadata ? JSON.stringify(metadata) : ''
      }
    });
  }

  listCollections(): Observable<any> {
    return this.http.get(`${this.baseUrl}/documents/collections`);
  }

  deleteDocument(docId: string, collection: string = 'general'): Observable<any> {
    return this.http.delete(`${this.baseUrl}/documents/${docId}`, {
      params: { collection_name: collection }
    });
  }
}