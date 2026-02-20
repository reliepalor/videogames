import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from 'src/app/core/services/reports.service';
import { SidebarService } from 'src/app/core/services/sidebar.service';
import { VideoGameSales } from 'src/app/shared/models/videogame-sales';

import { Observable, map, BehaviorSubject, combineLatest } from 'rxjs';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './dashboard.component.html',
})
export class AdminDashboardComponent {

  private reportsService = inject(ReportsService);
  private sidebarService = inject(SidebarService);

  isSidebarMinimized$ = this.sidebarService.isMinimized$;
  currentDate = new Date();

  sales$: Observable<VideoGameSales[]> = this.reportsService.getVideoGameSales();
  sortedSalesByPurchaseRate$: Observable<VideoGameSales[]> = this.sales$.pipe(
    map((sales) => [...sales].sort((a, b) => b.totalRevenue - a.totalRevenue))
  );

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
      '#0f172a', // slate-900
      '#3b82f6', // blue-500
      '#f59e0b', // amber-500
      '#10b981', // green-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#14b8a6', // teal-500
    ];
    return colors[index] || '#64748b';
  }

  /* ===== LINE CHART ===== */

  lineChartType: 'line' = 'line';

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        padding: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        displayColors: false,
        titleFont: {
          size: 13,
          weight: 600
        },
        bodyFont: {
          size: 14,
          weight: 700
        },
        cornerRadius: 12,
        callbacks: {
          label: function(context) {
            return '₱' + (context.parsed.y ?? 0).toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            });
          }
        }
      },
    },
    elements: {
      line: {
        tension: 0.4,
        borderColor: '#0f172a',
        borderWidth: 3,
        backgroundColor: 'transparent',
      },
      point: {
        radius: 5,
        hoverRadius: 7,
        backgroundColor: '#0f172a',
        borderColor: '#fff',
        borderWidth: 3,
        hoverBackgroundColor: '#0f172a',
        hoverBorderColor: '#fff',
        hoverBorderWidth: 4,
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
            weight: 500
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        border: {
          display: false,
          dash: [5, 5]
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
            weight: 500
          },
          callback: function(value) {
            return '₱' + value.toLocaleString();
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  lineChartData$: Observable<ChartData<'line'>> = this.sales$.pipe(
    map(sales => ({
      labels: sales.map(s => s.title),
      datasets: [{
        data: sales.map(s => s.totalRevenue),
        fill: false
      }]
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
          '#0f172a', // slate-900
          '#3b82f6', // blue-500
          '#f59e0b', // amber-500
          '#10b981', // green-500
          '#8b5cf6', // violet-500
        ],
        borderWidth: 4,
        borderColor: '#fff',
        hoverBorderWidth: 6,
        hoverBorderColor: '#fff',
        cutout: '75%',
      }]
    }))
  );

  donutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        padding: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        displayColors: true,
        boxWidth: 12,
        boxHeight: 12,
        cornerRadius: 8,
        titleFont: {
          size: 12,
          weight: 600
        },
        bodyFont: {
          size: 13,
          weight: 700
        },
        callbacks: {
          label: function(context) {
            return context.parsed.toFixed(1) + '%';
          }
        }
      }
    },
    cutout: '75%',
  };

  donutCenterText$ = this.topGames$.pipe(
    map(games => games.reduce((sum, g) => sum + g.percent, 0).toFixed(1) + '%')
  );

}

