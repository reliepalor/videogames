import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent)
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('./orders/admin-orders-approval')
        .then(m => m.AdminOrdersApprovalComponent)
  }
];
