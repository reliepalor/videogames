import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewEncapsulation, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserOrdersService, UserOrder, UserOrderItem } from 'src/app/core/services/user-orders.service';
import { DigitalOrderService } from 'src/app/core/services/digital-products/digital-order.service';
import { DigitalOrder } from 'src/app/core/models/digital-orders/digital-order.model';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewService } from '../../../core/services/review.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-user-orders',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-orders.html',
  styleUrls: ['./user-orders.css'],
  encapsulation: ViewEncapsulation.None,
})
export class UserOrdersComponent implements OnInit, OnDestroy {
  private userOrdersService = inject(UserOrdersService);
  private digitalOrderService = inject(DigitalOrderService);
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private reviewService = inject(ReviewService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  orders: UserOrder[] = [];
  digitalOrders: DigitalOrder[] = [];
  loading = false;
  errorMsg = '';
  searchTerm = '';
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  orderType: 'games' | 'digital' = 'games';

  // toggles between card and table view
  viewMode: 'card' | 'table' = 'card';

  currentPage = 1;
  pageSize = 5; 
  totalPages = 0;

  // Review properties
  reviewingItem: UserOrderItem | null = null;

  showSuccessModal = false;
  successMessage = '';
  successTimeout?: any;
  isFadingOut = false;

  isDarkMode = signal(false);
  private themeSub?: Subscription;

  ngOnInit() {
    this.isDarkMode.set(this.themeService.isDarkMode);
    this.themeSub = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode.set(isDark);
    });

    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  loadOrders() {
    this.loading = true;
    this.errorMsg = '';

    forkJoin({
      gameOrders: this.userOrdersService.getMyOrders(),
      digitalOrders: this.digitalOrderService.getMyOrders()
    }).subscribe({
      next: ({ gameOrders, digitalOrders }) => {
        this.orders = gameOrders.map(order => ({
          ...order,
          showItems: false
        })).sort((a, b) => b.id - a.id);

        this.digitalOrders = [...(digitalOrders ?? [])].sort((a, b) => b.id - a.id);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.errorMsg = 'Failed to load your orders.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getStatusLabel(status: number) {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Approved';
      case 2: return 'Rejected';
      default: return 'Unknown';
    }
  }

  getDigitalStatusLabel(status: string | null | undefined): 'Pending' | 'Approved' | 'Rejected' | 'Unknown' {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'rejected') return 'Rejected';
    return 'Unknown';
  }

  private mapGameStatusToKey(status: number): 'pending' | 'approved' | 'rejected' | 'unknown' {
    if (status === 0) return 'pending';
    if (status === 1) return 'approved';
    if (status === 2) return 'rejected';
    return 'unknown';
  }

  private mapDigitalStatusToKey(status: string | null | undefined): 'pending' | 'approved' | 'rejected' | 'unknown' {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'pending') return 'pending';
    if (normalized === 'approved') return 'approved';
    if (normalized === 'rejected') return 'rejected';
    return 'unknown';
  }

  get filteredGameOrders() {
    let filtered = this.orders;

    // Filter by status
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(order => this.mapGameStatusToKey(order.status) === this.statusFilter);
    }

    // Filter by search term
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(order =>
        order.items.some(item =>
          item.gameTitle.toLowerCase().includes(term)
        )
      );
    }

    return filtered;
  }

  get filteredDigitalOrders() {
    let filtered = this.digitalOrders;

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(order => this.mapDigitalStatusToKey(order.status) === this.statusFilter);
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(order =>
        (order.digitalProductName || '').toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  get paginatedGameOrders() {
    const filtered = this.filteredGameOrders;
    this.totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  get paginatedDigitalOrders() {
    const filtered = this.filteredDigitalOrders;
    this.totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  get selectedTotalPages(): number {
    const total = this.orderType === 'games'
      ? this.filteredGameOrders.length
      : this.filteredDigitalOrders.length;

    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get hasOrdersInSelectedType(): boolean {
    return this.orderType === 'games'
      ? this.filteredGameOrders.length > 0
      : this.filteredDigitalOrders.length > 0;
  }

  get currentDisplayOrdersCount(): number {
    return this.orderType === 'games'
      ? this.paginatedGameOrders.length
      : this.paginatedDigitalOrders.length;
  }

  get activeSearchPlaceholder(): string {
    return this.orderType === 'games'
      ? 'Search by game title...'
      : 'Search by digital product...';
  }

  get paginatedOrders() {
    const filtered = this.orderType === 'games' ? this.filteredGameOrders : this.filteredDigitalOrders;
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  toggleItemView(order: UserOrder) {
    order.showItems = !order.showItems;
  }

  // Pagination methods
  nextPage() {
    if (this.currentPage < this.selectedTotalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pages(): number[] {
    const pages = [];
    for (let i = 1; i <= this.selectedTotalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  onSearchChange() {
    this.currentPage = 1; // Reset to first page when searching
  }

  onStatusFilterChange() {
    this.currentPage = 1; // Reset to first page when filtering
  }

  onOrderTypeChange(type: 'games' | 'digital') {
    this.orderType = type;
    this.currentPage = 1;
    this.searchTerm = '';
    this.statusFilter = 'all';
  }

  startReview(item: UserOrderItem) {
    const gameId = item.videoGameId;
    if (!gameId) {
      this.errorMsg = 'Game review page is unavailable for this item.';
      return;
    }

    this.router.navigate(['/games', gameId, 'reviews']);
  }

  onReviewSubmitted() {
    this.showSuccessMessage('Review submitted successfully!');
    this.cancelReview();
  }

  cancelReview() {
    this.reviewingItem = null;
  }

  showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.showSuccessModal = true;
    this.isFadingOut = false;
    this.cdr.detectChanges();

    // remove old timeout
    if (this.successTimeout) clearTimeout(this.successTimeout);

    // fade out animation start
    this.successTimeout = setTimeout(() => {
      this.isFadingOut = true;
      this.cdr.detectChanges();

      // remove modal after animation
      setTimeout(() => {
        this.showSuccessModal = false;
        this.isFadingOut = false;
        this.cdr.detectChanges();
      }, 300);
    }, 1800);
  }

  getOrderProductImageUrl(order: DigitalOrder): string | null {
    const path =
      order.digitalProductImagePath?.trim() ||
      order.imagePath?.trim() ||
      order.digitalProduct?.imagePath?.trim();

    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `http://localhost:5019${normalized}`;
  }
}
