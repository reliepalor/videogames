import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

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

  imagePreview: string | null = null;
  selectedImage?: File;

  DigitalProductType = DigitalProductType;
  LicenseDuration = LicenseDuration;

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

    const dto = {
      ...this.form.value,
      image: this.selectedImage
    };

    if (this.product) {
      // UPDATE
      this.digitalProductService
        .updateProduct(this.product.id, dto)
        .subscribe(() => {
          this.loading = false;
          this.saved.emit('Product updated successfully.');
        });
    } else {
      // CREATE
      this.digitalProductService
        .createProduct(dto)
        .subscribe(() => {
          this.loading = false;
          this.saved.emit('Product created successfully.');
        });
    }
  }

  close(): void {
    this.closed.emit();
  }
}
