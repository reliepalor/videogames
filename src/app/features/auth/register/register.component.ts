import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { AuthService, RegisterRequest } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  isLoading = false;

  registerForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  submit(): void {
    if (this.registerForm.invalid || this.isLoading) {
      this.registerForm.markAllAsTouched();
      this.toastr.warning('Please enter valid information', 'Invalid Form');
      return;
    }

    this.isLoading = true;

    const payload: RegisterRequest = this.registerForm.getRawValue();

    this.authService.register(payload)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Account created successfully!', 'Success');
          const redirect = this.authService.getRedirectUrlAfterLogin();
          this.router.navigate([redirect]);
        },
        error: (err) => {
          this.handleError(err);
        }
      });
  }

  private handleError(err: any): void {
    const status = err?.status;

    if (status === 409) {
      this.toastr.error('Email already registered', 'Already Exists');
    } 
    else if (status === 400) {
      this.toastr.error('Invalid registration data', 'Invalid');
    } 
    else {
      this.toastr.error('Registration failed. Try again.', 'Error');
    }
  }
}
