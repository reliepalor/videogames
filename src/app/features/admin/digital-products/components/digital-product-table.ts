import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DigitalProduct } from 'src/app/core/models/digital-products/digital-product.model';
import { DigitalProductType } from 'src/app/core/models/digital-products/enums/digital-product-type.enum';
import { LicenseDuration } from 'src/app/core/models/digital-products/enums/license-duration.enum';

@Component({
  standalone: true,
  selector: 'app-digital-product-table',
  imports: [CommonModule],
  templateUrl: './digital-product-table.html'
})
export class DigitalProductTable {

  @Input() products: DigitalProduct[] = [];

  @Output() edit = new EventEmitter<DigitalProduct>();
  @Output() archive = new EventEmitter<DigitalProduct>();
  @Output() restore = new EventEmitter<DigitalProduct>();

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

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.API_URL}${normalized}`;
  }
}
