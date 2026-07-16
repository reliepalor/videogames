import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  initialize(): void {
    // Only run analytics in the browser environment
    if (isPlatformBrowser(this.platformId)) {
      // Dynamically import and inject Vercel Analytics
      import('@vercel/analytics').then((analytics) => {
        analytics.inject();
      }).catch((error) => {
        console.error('Failed to load Vercel Analytics:', error);
      });
    }
  }
}
