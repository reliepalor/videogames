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
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./conversations/admin-conversation-list/admin-conversation-list')
            .then(m => m.AdminConversationListComponent)
      },
      {
        path: ':id',
        loadComponent: () => 
          import('./conversations/admin-conversation-details/admin-conversation-detail')
            .then(m => m.AdminConversationDetailComponent)
      }
    ]
  }
];
