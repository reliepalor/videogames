import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
    const filtered =
      this.filterStatus() === 'All'
        ? this.orders()
        : this.orders().filter(o => o.status === this.filterStatus());

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateA !== dateB) {
        return dateB - dateA;
      }

      return b.id - a.id;
    });
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
      error: (error: unknown) => {
        this.setActionLoading(order.id, false);
        this.closeConfirm();
        this.showErrorMessage(this.getActionErrorMessage(action, order, error));
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

  private getActionErrorMessage(
    action: 'approve' | 'reject',
    order: DigitalOrder,
    error: unknown
  ): string {
    const productName = order.digitalProductName?.trim() || 'this product';
    const httpError = error instanceof HttpErrorResponse ? error : null;
    if (httpError?.status === 404) {
      return action === 'approve'
        ? `Cannot approve order #${order.id} for "${productName}" because the order was not found.`
        : `Cannot reject order #${order.id} for "${productName}" because the order was not found.`;
    }

    const backendMessage = this.extractBackendErrorMessage(error);
    const normalized = backendMessage.toLowerCase();

    if (
      action === 'approve' &&
      (normalized.includes('insufficient stock') ||
        normalized.includes('not enough product keys'))
    ) {
      return 'Cannot approve order: no stock/product keys available.';
    }

    if (backendMessage) {
      return backendMessage;
    }

    return action === 'approve'
      ? 'Failed to approve order. Please try again.'
      : 'Failed to reject order. Please try again.';
  }

  private extractBackendErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as unknown;

      if (typeof payload === 'string' && payload.trim()) {
        return payload.trim();
      }

      if (
        payload &&
        typeof payload === 'object' &&
        'message' in payload &&
        typeof (payload as { message?: unknown }).message === 'string'
      ) {
        const message = (payload as { message: string }).message.trim();
        if (message) return message;
      }

      if (
        typeof error.message === 'string' &&
        error.message.trim() &&
        !error.message.startsWith('Http failure response for ')
      ) {
        return error.message.trim();
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return '';
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

    if (path.startsWith('/assets/') || path.startsWith('assets/')) {
      return path.startsWith('/') ? path : `/${path}`;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.API_URL}${normalized}`;
  }
}
