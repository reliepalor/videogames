import { Component, signal, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from './core/services/theme.service';
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
  }
}
