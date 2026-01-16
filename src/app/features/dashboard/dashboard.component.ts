import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from 'src/app/core/services/reports.service';
import { SidebarService } from 'src/app/core/services/sidebar.service';
import { VideoGameSales } from 'src/app/shared/models/videogame-sales';
import { SkeletonBoxComponent } from 'src/app/shared/skeleton/skeleton-box.component';

import { Observable, map, BehaviorSubject, combineLatest } from 'rxjs';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, BaseChartDirective, SkeletonBoxComponent],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './dashboard.component.html',
})
export class AdminDashboardComponent {

  private reportsService = inject(ReportsService);
  private sidebarService = inject(SidebarService);

  isSidebarMinimized$ = this.sidebarService.isMinimized$;

  sales$: Observable<VideoGameSales[]> = this.reportsService.getVideoGameSales();

  /* ===== Top Metrics ===== */

  totalRevenue$ = this.sales$.pipe(
    map(s => s.reduce((sum, g) => sum + g.totalRevenue, 0))
  );

  totalNumbers$ = this.sales$.pipe(
    map(s => s.reduce((sum, g) => sum + g.totalNumbers, 0))
  );

  totalQuantity$ = this.sales$.pipe(
    map(s => s.reduce((sum, g) => sum + g.totalQuantity, 0))
  );

  /* ===== Games with percents ===== */
  showAll$ = new BehaviorSubject<boolean>(false);

  allGamesWithPercent$: Observable<{title: string, percent: number}[]> = this.sales$.pipe(
    map(s => {
      const total = s.reduce((sum, x) => sum + x.totalRevenue, 0);
      if (!total) return [];
      const sorted = [...s].sort((a,b)=>b.totalRevenue - a.totalRevenue);
      return sorted.map(g => ({
        title: g.title,
        percent: parseFloat(((g.totalRevenue / total) * 100).toFixed(1))
      }));
    })
  );

  topGames$: Observable<{title: string, percent: number}[]> = this.allGamesWithPercent$.pipe(
    map(games => games.slice(0,5))
  );

  displayedGames$ = combineLatest([this.allGamesWithPercent$, this.showAll$]).pipe(
    map(([games, showAll]) => showAll ? games : games.slice(0,5))
  );

  toggleShowAll() {
    this.showAll$.next(!this.showAll$.value);
  }

  getColor(index: number): string {
    const colors = [
      'rgba(147,51,234,0.9)',
      '#facc15',
      '#3b82f6',
      '#22c55e',
      '#ef4444'
    ];
    return colors[index] || '#gray';
  }

  /* ===== LINE CHART ===== */

  lineChartType: 'line' = 'line';

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        padding: 10,
        backgroundColor: 'rgba(147, 51, 234, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        displayColors: false
      },
    },
    elements: {
      line: {
        tension: 0.4,
        borderColor: 'rgba(147,51,234,0.7)',
        borderWidth: 2,
      },
      point: {
        radius: 3,
        backgroundColor: 'rgba(147,51,234)'
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true }
    }
  };

  lineChartData$: Observable<ChartData<'line'>> = this.sales$.pipe(
    map(sales => ({
      labels: sales.map(s => s.title),
      datasets: [{ data: sales.map(s => s.totalRevenue) }]
    }))
  );

  /* ===== Donut Chart ===== */

  donutChartType: 'doughnut' = 'doughnut';

  donutChartData$: Observable<ChartData<'doughnut'>> = this.topGames$.pipe(
    map(games => ({
      labels: games.map(g => g.title),
      datasets: [{
        data: games.map(g => g.percent),
        backgroundColor: [
          'rgba(147,51,234,0.9)',
          '#facc15',
          '#3b82f6',
          '#22c55e',
          '#ef4444'
        ],
        borderWidth: 0,
        cutout: '70%',
      }]
    }))
  );

  donutChartOptions = {
    responsive: true,
    plugins: { legend: { display: false } }
  };

  donutCenterText$ = this.topGames$.pipe(
    map(games => games.reduce((sum, g) => sum + g.percent, 0).toFixed(1) + '%')
  );

}
