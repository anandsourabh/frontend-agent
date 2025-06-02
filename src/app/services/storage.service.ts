import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storageSubject = new BehaviorSubject<any>(null);

  setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.storageSubject.next({ key, value });
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
      this.storageSubject.next({ key, value: null });
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
      this.storageSubject.next({ cleared: true });
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  watchStorage(): Observable<any> {
    return this.storageSubject.asObservable();
  }
}
