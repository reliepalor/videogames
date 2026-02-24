import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from 'src/app/core/services/reports.service';
import { SidebarService } from 'src/app/core/services/sidebar.service';
import { VideoGameSales } from 'src/app/shared/models/videogame-sales';

import { DigitalProductSales } from 'src/app/core/models/analytics/digital-product-sales';
import { DashboardSummary } from 'src/app/core/models/analytics/dashboard-summary';
import { MonthlyRevenue } from 'src/app/core/models/analytics/monthly-revenue';
import { TopProduct } from 'src/app/core/models/analytics/top-product';

import { Observable, map, BehaviorSubject, combineLatest } from 'rxjs';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

export type DashboardView = 'videogames' | 'digital' | 'combined';

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

  /* ===== View Toggle ===== */
  activeView$ = new BehaviorSubject<DashboardView>('videogames');

  setView(view: DashboardView) {
    this.activeView$.next(view);
  }

  /* ===== VIDEO GAME SALES ===== */
  sales$: Observable<VideoGameSales[]> = this.reportsService.getVideoGameSales();
  sortedSalesByPurchaseRate$: Observable<VideoGameSales[]> = this.sales$.pipe(
    map((sales) => [...sales].sort((a, b) => b.totalRevenue - a.totalRevenue))
  );

  totalRevenue$ = this.sales$.pipe(
    map(s => s.reduce((sum, g) => sum + g.totalRevenue, 0))
  );
  totalNumbers$ = this.sales$.pipe(
    map(s => s.reduce((sum, g) => sum + g.totalNumbers, 0))
  );
  totalQuantity$ = this.sales$.pipe(
    map(s => s.reduce((sum, g) => sum + g.totalQuantity, 0))
  );

  /* ===== DIGITAL PRODUCT SALES ===== */
  digitalSales$: Observable<DigitalProductSales[]> = this.reportsService.getDigitalProductSales();
  sortedDigitalSales$: Observable<DigitalProductSales[]> = this.digitalSales$.pipe(
    map(s => [...s].sort((a, b) => b.totalRevenue - a.totalRevenue))
  );

  digitalTotalRevenue$ = this.digitalSales$.pipe(
    map(s => s.reduce((sum, g) => sum + g.totalRevenue, 0))
  );
  digitalTotalOrders$ = this.digitalSales$.pipe(
    map(s => s.reduce((sum, g) => sum + g.totalOrders, 0))
  );
  digitalTotalQuantity$ = this.digitalSales$.pipe(
    map(s => s.reduce((sum, g) => sum + g.totalQuantity, 0))
  );

  /* ===== COMBINED / DASHBOARD SUMMARY ===== */
  dashboardSummary$: Observable<DashboardSummary> = this.reportsService.getDashboardSummary();
  monthlyRevenue$: Observable<MonthlyRevenue[]> = this.reportsService.getMonthlyRevenue();
  topProducts$: Observable<TopProduct[]> = this.reportsService.getTopProducts();

  combinedTotalRevenue$ = this.dashboardSummary$.pipe(
    map(s => s.totalVideoGameRevenue + s.totalDigitalRevenue)
  );

  /* ===== Games with percents (Video Games) ===== */
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

  /* ===== Digital Products with percents ===== */
  showAllDigital$ = new BehaviorSubject<boolean>(false);

  allDigitalWithPercent$: Observable<{title: string, percent: number}[]> = this.digitalSales$.pipe(
    map(s => {
      const total = s.reduce((sum, x) => sum + x.totalRevenue, 0);
      if (!total) return [];
      const sorted = [...s].sort((a,b)=>b.totalRevenue - a.totalRevenue);
      return sorted.map(g => ({
        title: g.name,
        percent: parseFloat(((g.totalRevenue / total) * 100).toFixed(1))
      }));
    })
  );

  topDigitalProducts$: Observable<{title: string, percent: number}[]> = this.allDigitalWithPercent$.pipe(
    map(games => games.slice(0,5))
  );

  displayedDigitalProducts$ = combineLatest([this.allDigitalWithPercent$, this.showAllDigital$]).pipe(
    map(([games, showAll]) => showAll ? games : games.slice(0,5))
  );

  toggleShowAllDigital() {
    this.showAllDigital$.next(!this.showAllDigital$.value);
  }

  donutDigitalCenterText$ = this.topDigitalProducts$.pipe(
    map(games => games.reduce((sum, g) => sum + g.percent, 0).toFixed(1) + '%')
  );

  /* ===== Top Products with percents (Combined) ===== */
  topProductsWithPercent$: Observable<{title: string, type: string, percent: number, revenue: number}[]> = this.topProducts$.pipe(
    map(products => {
      const total = products.reduce((sum, p) => sum + p.totalRevenue, 0);
      if (!total) return [];
      return products.map(p => ({
        title: p.productName,
        type: p.productType,
        revenue: p.totalRevenue,
        percent: parseFloat(((p.totalRevenue / total) * 100).toFixed(1))
      }));
    })
  );

  getColor(index: number): string {
    const colors = [
      '#0f172a', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6',
    ];
    return colors[index] || '#64748b';
  }

  getTypeColor(type: string): string {
    return type === 'VideoGame' ? '#0f172a' : '#3b82f6';
  }

  /* ===== LINE CHART (Video Games) ===== */
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
        titleFont: { size: 13, weight: 600 },
        bodyFont: { size: 14, weight: 700 },
        cornerRadius: 12,
        callbacks: {
          label: function(context) {
            return '₱' + (context.parsed.y ?? 0).toLocaleString('en-US', {
              minimumFractionDigits: 0, maximumFractionDigits: 0
            });
          }
        }
      },
    },
    elements: {
      line: { tension: 0.4, borderColor: '#0f172a', borderWidth: 3, backgroundColor: 'transparent' },
      point: {
        radius: 5, hoverRadius: 7, backgroundColor: '#0f172a', borderColor: '#fff',
        borderWidth: 3, hoverBackgroundColor: '#0f172a', hoverBorderColor: '#fff', hoverBorderWidth: 4,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#64748b', font: { size: 12, weight: 500 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        border: { display: false, dash: [5, 5] },
        ticks: {
          color: '#64748b',
          font: { size: 12, weight: 500 },
          callback: function(value) { return '₱' + value.toLocaleString(); }
        }
      }
    },
    interaction: { intersect: false, mode: 'index' }
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

  /* ===== LINE CHART (Digital Products) ===== */
  digitalLineChartOptions: ChartConfiguration<'line'>['options'] = {
    ...this.lineChartOptions,
    elements: {
      line: { tension: 0.4, borderColor: '#3b82f6', borderWidth: 3, backgroundColor: 'transparent' },
      point: {
        radius: 5, hoverRadius: 7, backgroundColor: '#3b82f6', borderColor: '#fff',
        borderWidth: 3, hoverBackgroundColor: '#3b82f6', hoverBorderColor: '#fff', hoverBorderWidth: 4,
      }
    },
  };

  digitalLineChartData$: Observable<ChartData<'line'>> = this.digitalSales$.pipe(
    map(sales => ({
      labels: sales.map(s => s.name),
      datasets: [{
        data: sales.map(s => s.totalRevenue),
        fill: false
      }]
    }))
  );

  /* ===== BAR CHART (Monthly Revenue - Combined) ===== */
  barChartType: 'bar' = 'bar';

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: '#64748b', font: { size: 12, weight: 500 }, usePointStyle: true, pointStyleWidth: 8 }
      },
      tooltip: {
        padding: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        cornerRadius: 12,
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ₱' + (context.parsed.y ?? 0).toLocaleString('en-US', {
              minimumFractionDigits: 0, maximumFractionDigits: 0
            });
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#64748b', font: { size: 12, weight: 500 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        border: { display: false },
        ticks: {
          color: '#64748b',
          font: { size: 12, weight: 500 },
          callback: function(value) { return '₱' + value.toLocaleString(); }
        }
      }
    },
    interaction: { intersect: false, mode: 'index' }
  };

  monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  monthlyBarChartData$: Observable<ChartData<'bar'>> = this.monthlyRevenue$.pipe(
    map(data => ({
      labels: data.map(d => `${this.monthNames[d.month - 1]} ${d.year}`),
      datasets: [
        {
          label: 'Video Games',
          data: data.map(d => d.videoGameRevenue),
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Digital Products',
          data: data.map(d => d.digitalRevenue),
          backgroundColor: 'rgba(59, 130, 246, 0.85)',
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    }))
  );

  /* ===== Donut Charts ===== */
  donutChartType: 'doughnut' = 'doughnut';

  donutChartData$: Observable<ChartData<'doughnut'>> = this.topGames$.pipe(
    map(games => ({
      labels: games.map(g => g.title),
      datasets: [{
        data: games.map(g => g.percent),
        backgroundColor: ['#0f172a','#3b82f6','#f59e0b','#10b981','#8b5cf6'],
        borderWidth: 4,
        borderColor: '#fff',
        hoverBorderWidth: 6,
        hoverBorderColor: '#fff',
        cutout: '75%',
      }]
    }))
  );

  donutDigitalChartData$: Observable<ChartData<'doughnut'>> = this.topDigitalProducts$.pipe(
    map(games => ({
      labels: games.map(g => g.title),
      datasets: [{
        data: games.map(g => g.percent),
        backgroundColor: ['#3b82f6','#0f172a','#f59e0b','#10b981','#8b5cf6'],
        borderWidth: 4,
        borderColor: '#fff',
        hoverBorderWidth: 6,
        hoverBorderColor: '#fff',
        cutout: '75%',
      }]
    }))
  );

  donutTopProductsData$: Observable<ChartData<'doughnut'>> = this.topProductsWithPercent$.pipe(
    map(products => ({
      labels: products.map(p => p.title),
      datasets: [{
        data: products.map(p => p.percent),
        backgroundColor: ['#0f172a','#3b82f6','#f59e0b','#10b981','#8b5cf6'],
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
        boxWidth: 12, boxHeight: 12,
        cornerRadius: 8,
        titleFont: { size: 12, weight: 600 },
        bodyFont: { size: 13, weight: 700 },
        callbacks: {
          label: function(context) { return context.parsed.toFixed(1) + '%'; }
        }
      }
    },
    cutout: '75%',
  };

  donutCenterText$ = this.topGames$.pipe(
    map(games => games.reduce((sum, g) => sum + g.percent, 0).toFixed(1) + '%')
  );

  topProductsCenterText$ = this.topProductsWithPercent$.pipe(
    map(products => products.reduce((sum, p) => sum + p.percent, 0).toFixed(1) + '%')
  );
}