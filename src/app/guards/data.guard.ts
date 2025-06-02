import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ChatService } from '../services/chat.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataGuard implements CanActivate {
  constructor(
    private chatService: ChatService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.chatService.messages$.pipe(
      map(messages => {
        const hasData = messages.some(m => m.data && m.data.length > 0);
        if (!hasData) {
          // Could redirect to help or instructions page
          return true; // Allow access anyway
        }
        return true;
      })
    );
  }
}