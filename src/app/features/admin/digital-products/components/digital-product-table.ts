import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DigitalProduct } from 'src/app/core/models/digital-products/digital-product.model';
import { DigitalProductType } from 'src/app/core/models/digital-products/enums/digital-product-type.enum';
import { LicenseDuration } from 'src/app/core/models/digital-products/enums/license-duration.enum';


// Import skeleton component - adjust path as needed
import { SkeletonBoxComponent } from 'src/app/shared/skeleton/skeleton-box.component';

@Component({
  standalone: true,
  selector: 'app-digital-product-table',
  imports: [CommonModule, FormsModule, SkeletonBoxComponent],
  templateUrl: './digital-product-table.html'
})
export class DigitalProductTable implements OnChanges {

  @Input() products: DigitalProduct[] = [];
  @Input() isLoading: boolean = false;

  @Output() edit = new EventEmitter<DigitalProduct>();
  @Output() archive = new EventEmitter<DigitalProduct>();
  @Output() restore = new EventEmitter<DigitalProduct>();
  @Output() manageKeys = new EventEmitter<DigitalProduct>();

  // view mode
  viewMode: 'table' | 'card' = 'table';

  toggleView(mode: 'table' | 'card'): void {
    this.viewMode = mode;
  }

  // search products
  searchTerm: string = '';
  filteredProducts: DigitalProduct[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['products']) {
      this.filterProducts();
    }
  }

  onSearchChange(): void {
    this.filterProducts();
  }

  private filterProducts(): void {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredProducts = [...this.products];
      return;
    }

    this.filteredProducts = this.products.filter(product =>
      product.name?.toLowerCase().includes(term) ||
      this.getProductTypeLabel(product).toLowerCase().includes(term) ||
      this.getLicenseDurationLabel(product).toLowerCase().includes(term)
    );
  }

  /* ================= ENUMS & HELPERS ================= */
  DigitalProductType = DigitalProductType;
  LicenseDuration = LicenseDuration;
  private readonly API_URL = 'http://localhost:5019';

  getProductTypeLabel(product: DigitalProduct): string {
    const key = product.productType as unknown as keyof typeof DigitalProductType;
    return String(DigitalProductType[key] ?? product.productType);
  }

  getLicenseDurationLabel(product: DigitalProduct): string {
    const key = product.licenseDuration as unknown as keyof typeof LicenseDuration;
    return String(LicenseDuration[key] ?? product.licenseDuration);
  }

  getImageUrl(product: DigitalProduct): string | null {
    const path = product.imagePath?.trim();
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

  // open manage keys modal (delegate to parent)
  openManageKeys(product: DigitalProduct): void {
    this.manageKeys.emit(product);
  }

}
