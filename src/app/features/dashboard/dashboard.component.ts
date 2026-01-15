import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoGameService } from '../../core/services/videogame.service';
import { AuthService } from '../../core/services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, filter, switchMap, startWith } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private videoGameService = inject(VideoGameService);
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.getUserClaims();

  /**
   * 🔥 Reload games every time /dashboard becomes active
   */
  games$: Observable<any[]> = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    filter(() => this.router.url === '/dashboard'),
    startWith(null), // initial load
    switchMap(() => this.videoGameService.getAll())
  );

  /**
   * Derived stats (pure & clean)
   */
  completedGames(games: any[]): number {
    return games.filter(g => g.status === 'Completed').length;
  }

  inProgressGames(games: any[]): number {
    return games.filter(g => g.status === 'In Progress').length;
  }
}
