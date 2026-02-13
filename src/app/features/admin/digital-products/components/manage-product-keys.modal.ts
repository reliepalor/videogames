import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DigitalProductService } from 'src/app/core/services/digital-products/digital-product.service';
import { DigitalProductKey } from 'src/app/core/models/digital-products/digital-product-key.model';
import { DigitalProduct } from 'src/app/core/models/digital-products/digital-product.model';

@Component({
  standalone: true,
  selector: 'app-manage-product-keys-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-product-keys.modal.html'
})
export class ManageProductKeysModal implements OnInit {

  @Input() product!: DigitalProduct;
  @Input() onClose!: () => void;

  keys = signal<DigitalProductKey[]>([]);
  loading = signal(false);
  availableKeysCount = computed(() => this.keys().filter(key => !key.isUsed).length);
  usedKeysCount = computed(() => this.keys().filter(key => key.isUsed).length);

  // add key
  newKey = '';
  adding = signal(false);

  // key visibility map
  revealedKeys = signal<Record<number, boolean>>({});

  constructor(private digitalProductService: DigitalProductService) {}

  ngOnInit(): void {
    this.loadKeys();
    this.generateKey();
  }

  loadKeys(): void {
    this.loading.set(true);

    this.digitalProductService.getProductKeys(this.product.id)
      .subscribe(keys => {
        this.keys.set(keys);
        this.loading.set(false);
      });
  }

  // ================= KEY VISIBILITY =================

  toggleKeyVisibility(id: number): void {
    this.revealedKeys.update(map => ({
      ...map,
      [id]: !map[id]
    }));
  }

  isRevealed(id: number): boolean {
    return !!this.revealedKeys()[id];
  }

  maskKey(key: string): string {
    if (key.length <= 8) return '****-****';
    const visibleStart = Math.min(4, Math.floor(key.length * 0.25));
    const visibleEnd = Math.min(4, Math.floor(key.length * 0.25));
    return `${key.slice(0, visibleStart)}${'*'.repeat(8)}${key.slice(-visibleEnd)}`;
  }

  // ================= COPY KEY =================

  copyKey(key: string): void {
    navigator.clipboard.writeText(key).then(() => {
      // Optional: Show toast notification
      console.log('Key copied to clipboard');
    });
  }

  // ================= ADD KEY =================

  generateKey(): void {
    // Generate a more readable key format: DG-XXXX-XXXX-XXXX
    const segments = [];
    for (let i = 0; i < 3; i++) {
      segments.push(
        Math.random().toString(36).substring(2, 6).toUpperCase()
      );
    }
    this.newKey = `DG-${segments.join('-')}`;
  }

  addKey(): void {
    if (!this.newKey.trim()) return;

    this.adding.set(true);

    this.digitalProductService.addProductKey({
      digitalProductId: this.product.id,
      productKey: this.newKey.trim()
    }).subscribe({
      next: () => {
        this.adding.set(false);
        this.generateKey();
        this.loadKeys();
      },
      error: () => {
        this.adding.set(false);
        // Handle error - could show toast
      }
    });
  }
}
