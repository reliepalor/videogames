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
      import('./conversations/admin-conversation-page')
        .then(m => m.AdminConversationsPageComponent)
  },
  {
    path: 'digital-products',
    loadComponent: () =>
      import('./digital-products/admin-digital-products.page')
        .then(m => m.AdminDigitalProductsPage)
  },
  {
    path: 'digital-orders',
    loadComponent: () =>
      import('./digital-orders/pages/admin-digital-orders.page')
        .then(m => m.AdminDigitalOrdersPage)
  },
  {
    path: 'user-lists',
    loadComponent: () =>
      import('./user-list/user-lists')
        .then(m => m.UsersComponent)
  }
];
