import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { DigitalProduct } from 'src/app/core/models/digital-products/digital-product.model';
import { DigitalProductService } from 'src/app/core/services/digital-products/digital-product.service';
import { DigitalProductType } from 'src/app/core/models/digital-products/enums/digital-product-type.enum';
import { LicenseDuration } from 'src/app/core/models/digital-products/enums/license-duration.enum';

@Component({
  standalone: true,
  selector: 'app-digital-product-form-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './digital-product-form.modal.html'
})
export class DigitalProductFormModal implements OnInit {

  @Input() product: DigitalProduct | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<string>();

  form!: FormGroup;
  loading = false;
  isClosing = false;
  submitError = '';

  imagePreview: string | null = null;
  selectedImage?: File;

  productTypeOptions = [
    { label: 'OneTime', value: DigitalProductType.OneTime },
    { label: 'Subscription', value: DigitalProductType.Subscription }
  ];
  licenseDurationOptions = [
    { label: 'None', value: LicenseDuration.None },
    { label: 'Monthly', value: LicenseDuration.Monthly },
    { label: 'Quarterly', value: LicenseDuration.Quarterly },
    { label: 'Yearly', value: LicenseDuration.Yearly }
  ];

  constructor(
    private fb: FormBuilder,
    private digitalProductService: DigitalProductService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      brand: [''],
      platform: [''],
      productType: [DigitalProductType.OneTime, Validators.required],
      licenseDuration: [LicenseDuration.None, Validators.required],
      price: [0, [Validators.required, Validators.min(0.01)]],
      description: [''],
      isActive: [true]
    });

    if (this.product) {
      this.form.patchValue(this.product);
      this.imagePreview = this.product.imagePath ?? null;
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.selectedImage = input.files[0];

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(this.selectedImage);
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    this.submitError = '';
    const formValue = this.form.getRawValue();

    const dto = {
      ...formValue,
      name: String(formValue.name ?? '').trim(),
      brand: String(formValue.brand ?? '').trim(),
      platform: String(formValue.platform ?? '').trim(),
      description: String(formValue.description ?? '').trim(),
      productType: Number(formValue.productType) as DigitalProductType,
      licenseDuration: Number(formValue.licenseDuration) as LicenseDuration,
      price: Number(formValue.price),
      isActive: Boolean(formValue.isActive),
      image: this.selectedImage
    };

    if (this.product) {
      // UPDATE
      this.digitalProductService
        .updateProduct(this.product.id, dto)
        .subscribe({
          next: () => {
            this.loading = false;
            this.saved.emit('Product updated successfully.');
            this.close();
          },
          error: (error) => {
            this.loading = false;
            this.submitError = this.extractApiErrorMessage(error);
          }
        });
    } else {
      // CREATE
      this.digitalProductService
        .createProduct(dto)
        .subscribe({
          next: () => {
            this.loading = false;
            this.saved.emit('Product created successfully.');
            this.close();
          },
          error: (error) => {
            this.loading = false;
            this.submitError = this.extractApiErrorMessage(error);
          }
        });
    }
  }

  private extractApiErrorMessage(error?: HttpErrorResponse): string {
    if (error?.error?.errors && typeof error.error.errors === 'object') {
      const messages = Object.values(error.error.errors)
        .flat()
        .filter(Boolean)
        .map(v => String(v));

      if (messages.length > 0) {
        return messages.join(' ');
      }
    }

    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error?.error?.message) {
      return String(error.error.message);
    }

    return 'Failed to save product. Please check required fields and try again.';
  }

  close(): void {
    this.isClosing = true;
    // Wait for animation to complete before emitting close
    setTimeout(() => {
      this.closed.emit();
    }, 200); // Match the animation duration
  }

  onOverlayClick(event: MouseEvent): void {
    // Close modal when clicking overlay (background)
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
