import { Component, effect, signal } from '@angular/core';
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
export class AdminDigitalProductsPage {

  // Product list signals
  products = signal<DigitalProduct[]>([]);
  loading = signal(false);
  includeInactive = signal(false);

  // Product form modal signals
  showProductModal = signal(false);
  selectedProduct = signal<DigitalProduct | null>(null);
  
  // Toast notification signals
  successMessage = signal('');
  errorMessage = signal('');
  isMessageClosing = false;

  // Confirmation modal signals
  confirmAction = signal<'archive' | 'restore' | null>(null);
  confirmProduct = signal<DigitalProduct | null>(null);
  confirmProductName = signal('');
  confirmLoading = signal(false);
  isConfirmClosing = false;

  private messageTimeout?: any;

  constructor(private digitalProductService: DigitalProductService) {

    // auto fetch when includeInactive changes
    effect(() => {
      this.fetchProducts(this.includeInactive());
    });
  }

  private refreshProducts(): void {
    this.fetchProducts(this.includeInactive());
  }

  private fetchProducts(includeInactive: boolean): void {
    this.loading.set(true);

    this.digitalProductService
      .getAdminProducts(includeInactive)
      .subscribe({
        next: products => {
          this.products.set(products);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.showErrorMessage('Failed to load products. Please try again.');
        }
      });
  }

  toggleIncludeInactive(): void {
    this.includeInactive.update(v => !v);
  }

  openCreateModal(): void {
    this.selectedProduct.set(null);
    this.showProductModal.set(true);
  }

  openEditModal(product: DigitalProduct): void {
    this.selectedProduct.set(product);
    this.showProductModal.set(true);
  }

  closeProductModal(): void {
    this.showProductModal.set(false);
    this.selectedProduct.set(null);
  }

  onProductSaved(message: string): void {
    this.showSuccessMessage(message);
    this.closeProductModal();

    this.refreshProducts();
  }

  // ============= CONFIRMATION MODAL METHODS =============

  confirmArchive(product: DigitalProduct): void {
    this.confirmProduct.set(product);
    this.confirmProductName.set(product.name);
    this.confirmAction.set('archive');
    this.isConfirmClosing = false;
  }

  confirmRestore(product: DigitalProduct): void {
    this.confirmProduct.set(product);
    this.confirmProductName.set(product.name);
    this.confirmAction.set('restore');
    this.isConfirmClosing = false;
  }

  executeConfirm(): void {
    const action = this.confirmAction();
    const product = this.confirmProduct();

    if (!action || !product) return;

    this.confirmLoading.set(true);

    if (action === 'archive') {
      this.digitalProductService.archiveProduct(product.id).subscribe({
        next: () => {
          this.confirmLoading.set(false);
          this.cancelConfirm();
          this.showSuccessMessage('Product archived successfully.');
          this.refreshProducts();
        },
        error: () => {
          this.confirmLoading.set(false);
          this.cancelConfirm();
          this.showErrorMessage('Failed to archive product. Please try again.');
        }
      });
    } else if (action === 'restore') {
      this.digitalProductService.restoreProduct(product.id).subscribe({
        next: () => {
          this.confirmLoading.set(false);
          this.cancelConfirm();
          this.showSuccessMessage('Product restored successfully.');
          this.refreshProducts();
        },
        error: () => {
          this.confirmLoading.set(false);
          this.cancelConfirm();
          this.showErrorMessage('Failed to restore product. Please try again.');
        }
      });
    }
  }

  cancelConfirm(): void {
    this.isConfirmClosing = true;
    
    // Wait for animation to complete before clearing
    setTimeout(() => {
      this.confirmAction.set(null);
      this.confirmProduct.set(null);
      this.confirmProductName.set('');
      this.confirmLoading.set(false);
      this.isConfirmClosing = false;
    }, 200); // Match animation duration
  }

  // ============= TOAST NOTIFICATION METHODS =============

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

  dismissMessage(): void {
    this.isMessageClosing = true;
    clearTimeout(this.messageTimeout);
    
    // Wait for animation to complete before clearing
    setTimeout(() => {
      this.successMessage.set('');
      this.errorMessage.set('');
      this.isMessageClosing = false;
    }, 300); // Match animation duration
  }

  private autoClearMessage(): void {
    clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.dismissMessage();
    }, 3000); // 3 seconds
  }

  private clearMessages(): void {
    clearTimeout(this.messageTimeout);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.isMessageClosing = false;
  }
}
