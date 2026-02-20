import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DigitalProduct } from 'src/app/core/models/digital-products/digital-product.model';
import { DigitalProductService } from 'src/app/core/services/digital-products/digital-product.service';
import { DigitalOrderService } from 'src/app/core/services/digital-products/digital-order.service';

@Component({
  standalone: true,
  selector: 'app-digital-store.page',
  imports: [CommonModule, FormsModule],
  templateUrl: './digital-store.page.html',
  styleUrl: './digital-store.page.css'
})
export class DigitalStorePage implements OnInit {
  private readonly API_URL = 'http://localhost:5019';

  //  TAB STATE 
  activeTab = signal<'products' | 'orders'>('products');

  //  PRODUCTS STATE 
  products = signal<DigitalProduct[]>([]);
  productsLoading = signal(false);
  productsError = signal<string | null>(null);

  //  ORDERS STATE 
  orders = signal<any[]>([]);
  ordersLoading = signal(false);
  ordersError = signal<string | null>(null);

  //  FILTERS & SEARCH 
  searchTerm = '';
  filterStatus = 'all';
  filterPrice = 'any';
  filtersOpen = false;

  //  PAGINATION STATE 
  currentPage = 1;
  itemsPerPage = 9;
  paginatedProducts: DigitalProduct[] = [];
  totalPages = 0;

  //  FILTERED PRODUCTS 
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

    // Update pagination when filters change
    this.updatePagination(result);

    return result;
  });

  //  PAGINATION HELPERS 
  get shouldShowFirstPage(): boolean {
    return this.visiblePages[0] > 1;
  }
  
  get shouldShowLastPage(): boolean {
    return this.visiblePages[this.visiblePages.length - 1] < this.totalPages;
  }
  
  get shouldShowLeftEllipsis(): boolean {
    return this.visiblePages[0] > 2;
  }
  
  get shouldShowRightEllipsis(): boolean {
    return this.visiblePages[this.visiblePages.length - 1] < this.totalPages - 1;
  }
  
  get visiblePages(): number[] {
    const delta = 2; // Number of pages to show on each side of current page
    const range: number[] = [];
    
    for (
      let i = Math.max(2, this.currentPage - delta);
      i <= Math.min(this.totalPages - 1, this.currentPage + delta);
      i++
    ) {
      range.push(i);
    }
    
    return range;
  }

  //  PURCHASE MODAL STATE 
  showPurchaseModal = signal(false);
  selectedProduct = signal<DigitalProduct | null>(null);
  purchaseQuantity = signal(1);
  purchaseLoading = signal(false);
  purchaseError = signal<string | null>(null);

  //  TOAST STATE 
  showSuccessModal = false;
  successMessage = '';
  isFadingOut = false;

  //  COMPUTED 
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

  //  PRODUCTS METHODS 

  loadProducts(): void {
    const startTime = Date.now();
    const minSkeletonMs = 6000;
    this.productsLoading.set(true);
    this.productsError.set(null);

    this.digitalProductService.getActiveProducts().subscribe({
      next: (products) => {
        this.products.set(products ?? []);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(minSkeletonMs - elapsed, 0);
        setTimeout(() => {
          this.productsLoading.set(false);
        }, remaining);
      },
      error: () => {
        this.productsError.set('Failed to load products.');
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(minSkeletonMs - elapsed, 0);
        setTimeout(() => {
          this.productsLoading.set(false);
        }, remaining);
      }
    });
  }

  // ================= ORDERS METHODS =================

  loadOrders(): void {
    const startTime = Date.now();
    const minSkeletonMs = 6000;
    this.ordersLoading.set(true);
    this.ordersError.set(null);

    this.digitalOrderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(minSkeletonMs - elapsed, 0);
        setTimeout(() => {
          this.ordersLoading.set(false);
        }, remaining);
      },
      error: () => {
        this.ordersError.set('Failed to load orders.');
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(minSkeletonMs - elapsed, 0);
        setTimeout(() => {
          this.ordersLoading.set(false);
        }, remaining);
      }
    });
  }

  // ================= PAGINATION METHODS =================

  updatePagination(products: DigitalProduct[]): void {
    this.totalPages = Math.ceil(products.length / this.itemsPerPage);
    
    // Ensure current page is within bounds
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProducts = products.slice(startIndex, endIndex);
    
    // Scroll to top smoothly when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination(this.filteredProducts());
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1; // Reset to first page when changing items per page
    this.updatePagination(this.filteredProducts());
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  getEndIndex(): number {
    return Math.min(this.getStartIndex() + this.itemsPerPage, this.paginatedProducts.length + this.getStartIndex());
  }

  // ================= FILTER METHODS =================

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  onSearchChange(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.products.set([...this.products()]);
  }

  onFilterChange(): void {
    this.currentPage = 1; // Reset to first page when filtering
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

  getOrderProductImageUrl(order: any): string | null {
    const path =
      order?.digitalProductImagePath?.trim?.() ||
      order?.imagePath?.trim?.() ||
      order?.digitalProduct?.imagePath?.trim?.();

    if (!path) return null;

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.API_URL}${normalized}`;
  }
}
