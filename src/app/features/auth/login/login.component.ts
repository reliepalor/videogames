import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';
import { TokenService } from '../../../core/services/token.service';
import { signInWithPopup } from 'firebase/auth';
import { firebaseAuth, googleProvider } from '../../../core/firebase/firebase';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private router = inject(Router);

  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const redirect = this.authService.isAdmin() ? '/dashboard' : '/user-dashboard';
      this.router.navigate([redirect]);
    }
  }

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit(): void {
  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }


  this.isLoading = true;
  this.errorMessage = '';

  const payload = this.loginForm.value as LoginRequest;

  this.authService.login(payload).subscribe({
   next: (res) => {
     if (!res?.accessToken) {
       this.errorMessage = 'Invalid email or password';
       this.isLoading = false;
       return;
     }

     // Token already saved by AuthService
     const redirect = this.authService.isAdmin() ? '/dashboard' : '/user-dashboard';

     this.isLoading = false;
     this.loginForm.reset();

     this.router.navigate([redirect]);
   },
    error: (err) => {
      this.errorMessage = err?.message || 'Invalid email or password';
      this.isLoading = false;
    }
  });
 }

  loginWithGoogle(): void {
    this.isLoading = true;
    this.errorMessage = '';

    signInWithPopup(firebaseAuth, googleProvider)
      .then((result) => {
        return result.user.getIdToken();
      })
      .then((idToken) => {
        this.authService.loginWithGoogle(idToken).subscribe({
          next: () => {
            console.log('Google login successful, redirecting...');
            const redirect = this.authService.getRedirectUrlAfterLogin();
            console.log('Redirect URL:', redirect);
            this.isLoading = false;
            this.router.navigate([redirect]);
          },
          error: (err) => {
              console.error('Google login error:', err);
              this.errorMessage = err?.message || 'Google sign-in failed';
              this.isLoading = false;
            }
        });
      })
      .catch((error) => {
        console.error('Firebase sign-in error:', error);
        this.errorMessage = 'Google sign-in failed';
        this.isLoading = false;
      });
  }


}
