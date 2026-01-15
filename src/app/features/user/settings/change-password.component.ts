import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-change-password',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <h2 class="text-xl font-semibold mb-6">Change Password</h2>

    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="max-w-md bg-white p-6 rounded-lg shadow space-y-4"
    >
      <input
        type="password"
        placeholder="New password"
        formControlName="password"
        class="w-full p-2 border rounded"
      />

      <button
        class="bg-black text-white px-4 py-2 rounded"
        [disabled]="form.invalid"
      >
        Update Password
      </button>

      <p *ngIf="success" class="text-green-600 text-sm">
        Password updated successfully
      </p>
    </form>
  `
})
export class ChangePasswordComponent {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  success = false;

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  submit(): void {
    if (this.form.invalid) return;

    this.authService.updatePassword(
      this.form.value.password!
    ).subscribe(() => {
      this.success = true;
      this.form.reset();
    });
  }
}
