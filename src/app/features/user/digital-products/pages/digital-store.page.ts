import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DigitalProduct } from 'src/app/core/models/digital-products/digital-product.model';
import { DigitalProductService } from 'src/app/core/services/digital-products/digital-product.service';
import { DigitalOrderService } from 'src/app/core/services/digital-products/digital-order.service';
import { SkeletonBoxComponent } from 'src/app/shared/skeleton/skeleton-box.component';

@Component({
  standalone: true,
  selector: 'app-digital-store.page',
  imports: [CommonModule, FormsModule, SkeletonBoxComponent],
  templateUrl: './digital-store.page.html'
})
export class DigitalStorePage implements OnInit {

  // ================= TAB STATE =================
  activeTab = signal<'products' | 'orders'>('products');

  // ================= PRODUCTS STATE =================
  products = signal<DigitalProduct[]>([]);
  productsLoading = signal(false);
  productsError = signal<string | null>(null);

  // ================= ORDERS STATE =================
  orders = signal<any[]>([]);
  ordersLoading = signal(false);
  ordersError = signal<string | null>(null);

  // ================= FILTERS & SEARCH =================
  searchTerm = '';
  filterStatus = 'all';
  filterPrice = 'any';
  filtersOpen = false;

  // ================= FILTERED PRODUCTS =================
  filteredProducts = computed(() => {
    let result = this.products();

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.platform?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    if (this.filterStatus === 'available') {
      result = result.filter(p => p.availableKeys > 0);
    } else if (this.filterStatus === 'out-of-stock') {
      result = result.filter(p => p.availableKeys === 0);
    }

    if (this.filterPrice === 'under-500') {
      result = result.filter(p => p.price < 500);
    } else if (this.filterPrice === '500-1000') {
      result = result.filter(p => p.price >= 500 && p.price <= 1000);
    } else if (this.filterPrice === 'over-1000') {
      result = result.filter(p => p.price > 1000);
    }

    return result;
  });

  // ================= PURCHASE MODAL STATE =================
  showPurchaseModal = signal(false);
  selectedProduct = signal<DigitalProduct | null>(null);
  purchaseQuantity = signal(1);
  purchaseLoading = signal(false);
  purchaseError = signal<string | null>(null);

  // ================= TOAST STATE =================
  showSuccessModal = false;
  successMessage = '';
  isFadingOut = false;

  // ================= COMPUTED =================
  totalPrice = computed(() => {
    const product = this.selectedProduct();
    if (!product) return 0;
    return this.purchaseQuantity() * product.price;
  });

  private messageTimeout?: any;

  constructor(
    private digitalProductService: DigitalProductService,
    private digitalOrderService: DigitalOrderService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadOrders();
  }

  // ================= PRODUCTS METHODS =================

  loadProducts(): void {
    this.productsLoading.set(true);
    this.productsError.set(null);

    this.digitalProductService.getActiveProducts().subscribe({
      next: (products) => {
        this.products.set(products ?? []);
        this.productsLoading.set(false);
      },
      error: () => {
        this.productsError.set('Failed to load products.');
        this.productsLoading.set(false);
      }
    });
  }

  // ================= ORDERS METHODS =================

  loadOrders(): void {
    this.ordersLoading.set(true);
    this.ordersError.set(null);

    this.digitalOrderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.ordersLoading.set(false);
      },
      error: () => {
        this.ordersError.set('Failed to load orders.');
        this.ordersLoading.set(false);
      }
    });
  }

  // ================= FILTER METHODS =================

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  onSearchChange(): void {
    this.products.set([...this.products()]);
  }

  onFilterChange(): void {
    this.products.set([...this.products()]);
  }

  // ================= PURCHASE MODAL METHODS =================

  openPurchaseModal(product: DigitalProduct): void {
    if (product.availableKeys === 0) return;

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
        this.showSuccessMessage('Purchase successful! Order pending approval.');

        this.loadProducts();
        this.loadOrders();
        this.activeTab.set('orders');
      },
      error: (err) => {
        this.purchaseLoading.set(false);
        this.purchaseError.set(
          err?.error?.message || 'Failed to complete purchase.'
        );
      }
    });
  }

  // ================= TOAST NOTIFICATION =================

  private showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.isFadingOut = false;
    this.showSuccessModal = true;

    clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.isFadingOut = true;
      setTimeout(() => {
        this.showSuccessModal = false;
        this.isFadingOut = false;
      }, 300);
    }, 2000);
  }
}
