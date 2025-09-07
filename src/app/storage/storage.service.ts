// src/app/services/storage.service.ts
import { Injectable, inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class StorageService {
  // use inject() in class fields
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // in-memory fallback store when not running in browser (SSR / tests)
  private readonly memory = new Map<string, string>();

  getItem(key: string): string | null {
    if (!this.isBrowser) {
      return this.memory.has(key) ? this.memory.get(key)! : null;
    }
    try {
      return localStorage.getItem(key);
    } catch (err) {
      console.warn('localStorage.getItem failed', err);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!this.isBrowser) {
      this.memory.set(key, value);
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.warn('localStorage.setItem failed', err);
    }
  }

  removeItem(key: string): void {
    if (!this.isBrowser) {
      this.memory.delete(key);
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn('localStorage.removeItem failed', err);
    }
  }
}
