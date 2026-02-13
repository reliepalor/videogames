import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DigitalOrderService } from 'src/app/core/services/digital-products/digital-order.service';
import { DigitalOrder } from 'src/app/core/models/digital-orders/digital-order.model';

@Component({
  standalone: true,
  selector: 'app-admin-digital-orders',
  imports: [CommonModule],
  templateUrl: './admin-digital-orders.page.html'
})
export class AdminDigitalOrdersPage implements OnInit {
  private readonly API_URL = 'http://localhost:5019';

  // ================= STATE =================

  orders = signal<DigitalOrder[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  viewMode = signal<'table' | 'card'>('table');
  filterStatus = signal<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  expandedRows = signal<Record<number, boolean>>({});
  actionLoading = signal<Record<number, boolean>>({});

  // Confirmation modal
  confirmModalOpen = signal(false);
  selectedOrder = signal<DigitalOrder | null>(null);
  confirmAction = signal<'approve' | 'reject' | null>(null);

  // Toast
  successMessage = signal('');
  errorMessage = signal('');
  isMessageClosing = false;
  private messageTimeout?: any;

  // ================= COMPUTED =================

  filteredOrders = computed(() => {
    if (this.filterStatus() === 'All') return this.orders();
    return this.orders().filter(o => o.status === this.filterStatus());
  });

  constructor(private digitalOrderService: DigitalOrderService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.error.set(null);

    this.digitalOrderService.getAllOrders().subscribe({
      next: (data) => {
        this.orders.set(data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load orders.');
        this.loading.set(false);
      }
    });
  }

  setView(mode: 'table' | 'card') {
    this.viewMode.set(mode);
  }

  setFilter(status: 'All' | 'Pending' | 'Approved' | 'Rejected') {
    this.filterStatus.set(status);
  }

  toggleExpand(id: number) {
    this.expandedRows.update(map => ({
      ...map,
      [id]: !map[id]
    }));
  }

  isExpanded(id: number): boolean {
    return !!this.expandedRows()[id];
  }

  // ================= CONFIRM FLOW =================

  openConfirm(order: DigitalOrder, action: 'approve' | 'reject') {
    this.selectedOrder.set(order);
    this.confirmAction.set(action);
    this.confirmModalOpen.set(true);
  }

  closeConfirm() {
    this.confirmModalOpen.set(false);
    this.selectedOrder.set(null);
    this.confirmAction.set(null);
  }

  confirmExecute() {
    const order = this.selectedOrder();
    const action = this.confirmAction();
    if (!order || !action) return;
    this.executeOrderAction(order, action);
  }

  executeOrderAction(order: DigitalOrder, action: 'approve' | 'reject') {
    if (this.isActionLoading(order.id)) return;

    this.setActionLoading(order.id, true);

    const request =
      action === 'approve'
        ? this.digitalOrderService.approveOrder(order.id)
        : this.digitalOrderService.rejectOrder(order.id);

    request.subscribe({
      next: () => {
        this.setActionLoading(order.id, false);
        this.closeConfirm();
        this.showSuccessMessage(
          action === 'approve'
            ? 'Order approved successfully.'
            : 'Order rejected successfully.'
        );
        this.loadOrders();
      },
      error: () => {
        this.setActionLoading(order.id, false);
        this.closeConfirm();
        this.showErrorMessage(
          action === 'approve'
            ? 'Failed to approve order. Please try again.'
            : 'Failed to reject order. Please try again.'
        );
      }
    });
  }

  setActionLoading(id: number, value: boolean) {
    this.actionLoading.update(map => ({
      ...map,
      [id]: value
    }));
  }

  isActionLoading(id: number): boolean {
    return !!this.actionLoading()[id];
  }

  dismissMessage(): void {
    this.isMessageClosing = true;
    clearTimeout(this.messageTimeout);

    setTimeout(() => {
      this.successMessage.set('');
      this.errorMessage.set('');
      this.isMessageClosing = false;
    }, 300);
  }

  private showSuccessMessage(message: string): void {
    this.clearMessages();
    this.successMessage.set(message);
    this.isMessageClosing = false;
    this.autoClearMessage();
  }

  private showErrorMessage(message: string): void {
    this.clearMessages();
    this.errorMessage.set(message);
    this.isMessageClosing = false;
    this.autoClearMessage();
  }

  private autoClearMessage(): void {
    clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.dismissMessage();
    }, 3000);
  }

  private clearMessages(): void {
    clearTimeout(this.messageTimeout);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.isMessageClosing = false;
  }

  getOrderUserDisplay(order: DigitalOrder): string {
    return (
      order.user?.fullName ||
      order.user?.name ||
      order.user?.userName ||
      order.user?.username ||
      order.fullName ||
      order.name ||
      order.userName ||
      order.username ||
      order.user?.email ||
      order.userEmail ||
      order.email ||
      `User #${order.userId}`
    );
  }

  getOrderProductImageUrl(order: DigitalOrder): string | null {
    const path =
      order.digitalProductImagePath?.trim() ||
      order.imagePath?.trim() ||
      order.digitalProduct?.imagePath?.trim();

    if (!path) {
      return null;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.API_URL}${normalized}`;
  }
}
