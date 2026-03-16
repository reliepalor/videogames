import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DigitalProduct } from 'src/app/core/models/digital-products/digital-product.model';
import { DigitalOrderService } from 'src/app/core/services/digital-products/digital-order.service';

@Component({
  standalone: true,
  selector: 'app-digital-orders-page',
  imports: [CommonModule],
  templateUrl: './digital-order.page.html'
})
export class DigitalOrdersPage implements OnInit {
  private readonly API_URL = 'http://localhost:5019';

  // ================= ORDER LIST STATE =================
  orders = signal<any[]>([]);
  loading = signal(false);
  successMessage = signal<string | null>(null);

  // ================= PURCHASE MODAL STATE =================
  showPurchaseModal = signal(false);
  selectedProduct = signal<DigitalProduct | null>(null);
  purchaseQuantity = signal(1);
  purchaseLoading = signal(false);
  purchaseError = signal<string | null>(null);

  // ================= COMPUTED =================
  totalPrice = computed(() => {
    const product = this.selectedProduct();
    if (!product) return 0;
    return this.purchaseQuantity() * product.price;
  });

  private messageTimeout?: any;

  constructor(private digitalOrderService: DigitalOrderService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  // ================= ORDER LIST METHODS =================

  loadOrders(): void {
    this.loading.set(true);

    this.digitalOrderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showSuccessMessage('Failed to load orders');
      }
    });
  }

  // ================= PURCHASE MODAL METHODS =================

  openPurchaseModal(product: DigitalProduct): void {
    this.selectedProduct.set(product);
    this.purchaseQuantity.set(1);
    this.purchaseError.set(null);
    this.showPurchaseModal.set(true);
  }

  closePurchaseModal(): void {
    this.showPurchaseModal.set(false);
    this.selectedProduct.set(null);
    this.purchaseQuantity.set(1);
    this.purchaseError.set(null);
  }

  increaseQuantity(): void {
    const product = this.selectedProduct();
    if (!product) return;

    if (this.purchaseQuantity() < product.availableKeys) {
      this.purchaseQuantity.update(v => v + 1);
    }
  }

  decreaseQuantity(): void {
    if (this.purchaseQuantity() > 1) {
      this.purchaseQuantity.update(v => v - 1);
    }
  }

  confirmPurchase(): void {
    const product = this.selectedProduct();
    if (!product) return;

    this.purchaseLoading.set(true);
    this.purchaseError.set(null);

    this.digitalOrderService.purchase({
      digitalProductId: product.id,
      quantity: this.purchaseQuantity()
    }).subscribe({
      next: () => {
        this.purchaseLoading.set(false);
        this.closePurchaseModal();
        this.showSuccessMessage('Purchase successful! Your order is pending approval.');
        this.loadOrders();
      },
      error: (err) => {
        this.purchaseLoading.set(false);
        this.purchaseError.set(
          err?.error?.message || 'Failed to complete purchase. Please try again.'
        );
      }
    });
  }

  // ================= TOAST NOTIFICATION =================

  private showSuccessMessage(message: string): void {
    clearTimeout(this.messageTimeout);
    this.successMessage.set(message);

    this.messageTimeout = setTimeout(() => {
      this.successMessage.set(null);
    }, 3000);
  }

  getOrderProductImageUrl(order: any): string | null {
    const path =
      order?.digitalProductImagePath?.trim?.() ||
      order?.imagePath?.trim?.() ||
      order?.digitalProduct?.imagePath?.trim?.();

    if (!path) return null;

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
