import { Component, signal, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from './core/services/ui/theme.service';
import { inject } from '@vercel/analytics';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('VideoGame');

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private themeService: ThemeService) {}

  ngOnInit(): void {
    // ThemeService handles loading and applying theme
    
    // Initialize Vercel Analytics only in the browser
    if (isPlatformBrowser(this.platformId)) {
      inject({
        mode: environment.production ? 'production' : 'development'
      });
    }
  }
}
