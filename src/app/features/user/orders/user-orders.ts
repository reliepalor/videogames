import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewEncapsulation, signal } from '@angular/core';
import { UserOrdersService, UserOrder, UserOrderItem } from 'src/app/core/services/user-orders.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewService } from '../../../core/services/review.service';
import { CommonModule } from '@angular/common';
import { SkeletonBoxComponent } from 'src/app/shared/skeleton/skeleton-box.component';
import { FormsModule } from '@angular/forms';
import { ReviewFormComponent } from '../../reviews/review-form';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-user-orders',
  imports: [CommonModule, FormsModule, SkeletonBoxComponent, ReviewFormComponent],
  templateUrl: './user-orders.html',
  styleUrls: ['./user-orders.css'],
  encapsulation: ViewEncapsulation.None,
})
export class UserOrdersComponent implements OnInit, OnDestroy {
  private userOrdersService = inject(UserOrdersService);
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private reviewService = inject(ReviewService);
  private cdr = inject(ChangeDetectorRef);

  orders: UserOrder[] = [];
  loading = false;
  errorMsg = '';
  searchTerm = '';
  statusFilter: number | null = null; // 0: Pending, 1: Approved, 2: Rejected

  // NEW: toggles between card and table view
  viewMode: 'card' | 'table' = 'card';

  // Pagination properties
  currentPage = 1;
  pageSize = 5; // Show 5 orders per page
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

    this.userOrdersService.getMyOrders().subscribe({
      next: (orders) => {
        // Add showItems property to each order for table expansion
        this.orders = orders.map(order => ({
          ...order,
          showItems: false
        })).sort((a, b) => b.id - a.id); // Sort by id descending to show newest first

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.errorMsg = 'Failed to load your orders.';
        this.loading = false;
        this.cdr.detectChanges();
      },
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

  get filteredOrders() {
    let filtered = this.orders;

    // Filter by status
    if (this.statusFilter !== null) {
      filtered = filtered.filter(order => order.status === this.statusFilter);
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

  get paginatedOrders() {
    const filtered = this.filteredOrders;
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  toggleItemView(order: UserOrder) {
    order.showItems = !order.showItems;
  }

  // Pagination methods
  nextPage() {
    if (this.currentPage < this.totalPages) {
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
    for (let i = 1; i <= this.totalPages; i++) {
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

  startReview(item: UserOrderItem) {
    this.reviewingItem = item;
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
}
