import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DigitalProduct } from 'src/app/core/models/digital-products/digital-product.model';
import { DigitalProductService } from 'src/app/core/services/digital-products/digital-product.service';
import { DigitalProductTable } from './components/digital-product-table';
import { DigitalProductFormModal } from './components/digital-product-form.modal';


@Component({
  standalone: true,
  selector: 'app-admin-digital-products',
  imports: [CommonModule, DigitalProductTable, DigitalProductFormModal],
  templateUrl: './admin-digital-products.page.html'
})
export class AdminDigitalProductsPage implements OnInit {

  products: DigitalProduct[] = [];
  loading = false;
  includeInactive = false;

  // modal state
  showProductModal = false;
  selectedProduct: DigitalProduct | null = null;

  // simple success message
  successMessage = '';

  constructor(
    private digitalProductService: DigitalProductService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;

    this.digitalProductService
      .getAdminProducts(this.includeInactive)
      .subscribe({
        next: products => {
          this.ngZone.run(() => {
            this.products = products;
            this.loading = false;
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.loading = false;
          });
        }
      });
  }

  toggleIncludeInactive(): void {
    this.includeInactive = !this.includeInactive;
    this.loadProducts();
  }

  // MODAL CONTROL

  openCreateModal(): void {
    this.selectedProduct = null;
    this.showProductModal = true;
  }

  openEditModal(product: DigitalProduct): void {
    this.selectedProduct = product;
    this.showProductModal = true;
  }

  closeProductModal(): void {
    this.showProductModal = false;
    this.selectedProduct = null;
  }

  onProductSaved(message: string): void {
    this.successMessage = message;
    this.closeProductModal();
    this.loadProducts();

    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  // ARCHIVE / RESTORE

  archiveProduct(product: DigitalProduct): void {
    if (!confirm('Archive this product?')) return;

    this.digitalProductService.archiveProduct(product.id).subscribe(() => {
      this.ngZone.run(() => {
        this.successMessage = 'Product archived successfully.';
        this.loadProducts();
        this.autoClearMessage();
      });
    });
  }

  restoreProduct(product: DigitalProduct): void {
    if (!confirm('Restore this product?')) return;

    this.digitalProductService.restoreProduct(product.id).subscribe(() => {
      this.ngZone.run(() => {
        this.successMessage = 'Product restored successfully.';
        this.loadProducts();
        this.autoClearMessage();
      });
    });
  }

  private autoClearMessage(): void {
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }
}
