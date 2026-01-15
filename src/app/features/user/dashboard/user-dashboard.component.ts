import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-user-dashboard',
  imports: [CommonModule],
  template: `
    <h1 class="text-2xl font-semibold mb-4">
      Welcome 🎮 user
    </h1>

    <p class="text-gray-600">
      Manage your games, profile, and settings.
    </p>
  `
})
export class UserDashboardComponent {}
