import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject, signal } from '@angular/core';
import { AdminOrdersService, Order, OrderItemApproval } from 'src/app/core/services/orders/admin-orders.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

type FilterStatus = 'All' | 'Pending' | 'Approved' | 'Rejected';
type OrderWorkflowStatus = Exclude<FilterStatus, 'All'>;
type ViewMode = 'card' | 'table';

interface OrderExtended extends Order {}

@Component({
  standalone: true,
  selector: 'app-admin-orders-approval',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders-approval.html'
})
export class AdminOrdersApprovalComponent implements OnInit, OnDestroy {

  private adminOrdersService = inject(AdminOrdersService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isFetching = false;

  // =========================
  // Reactive Orders State
  // =========================
  private ordersSignal = signal<OrderExtended[]>([]);

  loading = true;
  errorMsg = '';
  successMsg = '';
  isMessageClosing = false;

  // View & Filter
  viewMode: ViewMode = 'table';
  filterStatus: FilterStatus = 'All';
  filterOptions: FilterStatus[] = ['All', 'Pending', 'Approved', 'Rejected'];

  // UI State
  expandedOrderIds = new Set<number>();
  loadingOrders = new Set<number>();
  productKeyMap = new Map<number, string>();

  // Reject Modal
  showRejectModal = false;
  rejectionReason = '';
  orderToReject: number | null = null;

  // =========================
  // INIT
  // =========================
  ngOnInit(): void {
    this.loadPendingOrders(true);
    this.intervalId = setInterval(() => this.loadPendingOrders(false), 5000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================
  // DATA FETCH
  // =========================
  loadPendingOrders(showSpinner = false): void {
    if (this.isFetching) return;

    this.isFetching = true;
    if (showSpinner) {
      this.loading = true;
    }

    this.adminOrdersService.getPendingOrders()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isFetching = false;
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (orders) => {
          const sorted = [...orders].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );

          this.ordersSignal.set(sorted);

          sorted.forEach(order => {
            order.items.forEach(item => {
              if (!this.productKeyMap.has(item.id)) {
                const key = item.productKey || [...Array(4)]
                  .map(() => Math.random().toString(36).substring(2, 6).toUpperCase())
                  .join('-');
                this.productKeyMap.set(item.id, key);
              }
            });
          });
        },
        error: () => {
          this.errorMsg = 'Failed to load orders.';
          this.autoHideMessage();
        }
      });
  }

  // =========================
  // FILTERED DATA
  // =========================
  get filteredOrders(): OrderExtended[] {
    const orders = this.ordersSignal();
    if (this.filterStatus === 'All') return orders;
    return orders.filter(
      (order) => this.normalizeStatus(order.status) === this.filterStatus
    );
  }

  // =========================
  // STATUS HELPERS
  // =========================
  private normalizeStatus(status: Order['status'] | string): OrderWorkflowStatus {
    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s === 'approved') return 'Approved';
      if (s === 'rejected') return 'Rejected';
      return 'Pending';
    }

    if (status === 1) return 'Approved';
    if (status === 2) return 'Rejected';
    return 'Pending';
  }

  getOrderStatus(order: OrderExtended): OrderWorkflowStatus {
    return this.normalizeStatus(order.status);
  }

  isPending(order: OrderExtended): boolean {
    return this.getOrderStatus(order) === 'Pending';
  }

  statusBadgeClass(order: OrderExtended): string {
    const status = this.getOrderStatus(order);
    if (status === 'Approved') return 'bg-green-100 text-green-700';
    if (status === 'Rejected') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  }

  // =========================
  // TRACK BY (IMPORTANT)
  // =========================
  trackByOrderId(index: number, order: OrderExtended): number {
    return order.id;
  }

  // =========================
  // VIEW & FILTER
  // =========================
  setView(mode: ViewMode): void {
    this.viewMode = mode;
  }

  setFilter(status: FilterStatus): void {
    this.filterStatus = status;
  }

  // =========================
  // EXPAND
  // =========================
  toggleExpand(orderId: number): void {
    if (this.expandedOrderIds.has(orderId)) {
      this.expandedOrderIds.delete(orderId);
    } else {
      this.expandedOrderIds.add(orderId);
    }
  }

  isExpanded(orderId: number): boolean {
    return this.expandedOrderIds.has(orderId);
  }

  // =========================
  // PRODUCT KEYS
  // =========================
  generateProductKey(orderItemId: number): void {
    const key = [...Array(4)]
      .map(() => Math.random().toString(36).substring(2, 6).toUpperCase())
      .join('-');

    this.productKeyMap.set(orderItemId, key);
  }

  getProductKey(orderItemId: number): string {
    return this.productKeyMap.get(orderItemId) || '';
  }

  setProductKey(orderItemId: number, value: string): void {
    this.productKeyMap.set(orderItemId, value);
  }

  // =========================
  // ACTION LOADING
  // =========================
  isActionLoading(orderId: number): boolean {
    return this.loadingOrders.has(orderId);
  }

  // =========================
  // APPROVE
  // =========================
  approveOrder(order: OrderExtended): void {
    const items: OrderItemApproval[] = order.items.map(item => ({
      orderItemId: item.id,
      productKey: this.productKeyMap.get(item.id) || ''
    }));

    if (items.some(i => !i.productKey)) {
      this.errorMsg = 'Please fill in product keys before approving.';
      this.autoHideMessage();
      return;
    }

    this.loadingOrders.add(order.id);

    this.adminOrdersService.approveOrder(order.id, items).subscribe({
      next: () => {
        const productSummary = this.getOrderProductSummary(order);
        this.successMsg = `${productSummary} approved successfully.`;
        this.loadingOrders.delete(order.id);
        this.loadPendingOrders(false);
        this.autoHideMessage();
      },
      error: () => {
        this.errorMsg = 'Failed to approve order.';
        this.loadingOrders.delete(order.id);
        this.autoHideMessage();
      }
    });
  }

  private getOrderProductSummary(order: OrderExtended): string {
    const productNames = (order.items ?? [])
      .map(item => (item as any).gameTitle || (item as any).digitalProductName || '')
      .map(name => String(name).trim())
      .filter(Boolean);

    if (productNames.length === 0) return 'Product';
    if (productNames.length === 1) return productNames[0];
    return `${productNames[0]} (+${productNames.length - 1} more)`;
  }

  // =========================
  // REJECT
  // =========================
  rejectOrder(orderId: number): void {
    this.orderToReject = orderId;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.orderToReject) return;

    const id = this.orderToReject;
    this.loadingOrders.add(id);

    this.adminOrdersService.rejectOrder(id, this.rejectionReason).subscribe({
      next: () => {
        this.successMsg = `Order #${id} rejected successfully.`;
        this.loadingOrders.delete(id);
        this.closeRejectModal();
        this.loadPendingOrders(false);
        this.autoHideMessage();
      },
      error: () => {
        this.errorMsg = 'Failed to reject order.';
        this.loadingOrders.delete(id);
        this.closeRejectModal();
        this.autoHideMessage();
      }
    });
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.orderToReject = null;
    this.rejectionReason = '';
  }

  // =========================
  // TOAST
  // =========================
  dismissMessage(): void {
    this.isMessageClosing = true;

    setTimeout(() => {
      this.successMsg = '';
      this.errorMsg = '';
      this.isMessageClosing = false;
    }, 300);
  }

  private autoHideMessage(): void {
    setTimeout(() => {
      if (this.successMsg || this.errorMsg) {
        this.dismissMessage();
      }
    }, 5000);
  }
}
