import { Routes } from '@angular/router';
import { AdminGuard } from 'src/app/core/guards/admin.guard';

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
  },
  {
    path: 'conversations',
    canActivate: [AdminGuard],
    loadComponent: () =>
      import('./conversations/admin-conversations-page/admin-conversations-page')
        .then(m => m.AdminConversationsPageComponent)
  }
];
