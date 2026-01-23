import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { AdminOrdersService, Order, OrderItemApproval } from 'src/app/core/services/admin-orders.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-admin-orders-approval',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders-approval.html'
})
export class AdminOrdersApprovalComponent implements OnInit {
  private adminOrdersService = inject(AdminOrdersService);
  private cdr = inject(ChangeDetectorRef);

  orders: Order[] = [];
  loading = false;
  errorMsg = '';
  successMsg = '';

  viewMode: 'card' | 'table' = 'card';

  productKeyMap = new Map<number, string>();

  showRejectModal = false;
  rejectionReason = '';
  orderToReject: number | null = null;

  ngOnInit() {
    this.loadPendingOrders();
  }

  loadPendingOrders() {
    this.loading = true;
    this.errorMsg = '';

    this.adminOrdersService.getPendingOrders().subscribe({
      next: orders => {
        this.orders = orders.map(o => ({
          ...o,
          showItems: false
        })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        this.productKeyMap.clear();

        orders.forEach(order => {
          order.items.forEach(item => {
            this.productKeyMap.set(item.id, item.productKey || '');
          });
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'Failed to load pending orders.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  generateProductKey(orderItemId: number) {
    const key = [...Array(4)]
      .map(() => Math.random().toString(36).substring(2, 6).toUpperCase())
      .join('-');

    this.productKeyMap.set(orderItemId, key);
    this.cdr.detectChanges();
  }

  approveOrder(order: Order) {
    const items: OrderItemApproval[] = order.items.map(item => ({
      orderItemId: item.id,
      productKey: this.productKeyMap.get(item.id) || ''
    }));

    if (items.some(i => !i.productKey)) {
      alert('Please fill in product keys for all items.');
      return;
    }

    this.adminOrdersService.approveOrder(order.id, items).subscribe({
      next: () => {
        this.successMsg = `Order #${order.id} approved successfully.`;
        this.loadPendingOrders();
      },
      error: () => {
        this.errorMsg = 'Failed to approve order.';
      }
    });
  }

  rejectOrder(orderId: number) {
    this.orderToReject = orderId;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  confirmReject() {
    if (!this.orderToReject) return;

    this.adminOrdersService.rejectOrder(this.orderToReject, this.rejectionReason).subscribe({
      next: () => {
        this.successMsg = `Order #${this.orderToReject} rejected.`;
        this.closeRejectModal();
        this.loadPendingOrders();
      },
      error: () => {
        this.errorMsg = 'Failed to reject order.';
      }
    });
  }

  closeRejectModal() {
    this.showRejectModal = false;
    this.orderToReject = null;
    this.rejectionReason = '';
  }

  getProductKey(orderItemId: number): string {
    return this.productKeyMap.get(orderItemId) || '';
  }

  setProductKey(orderItemId: number, value: string): void {
    this.productKeyMap.set(orderItemId, value);
  }
}
