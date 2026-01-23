import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { Profile } from '../../../core/models/UserProfile.model';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-profile',
  imports: [CommonModule],
  template: `
   <h2 class="text-xl font-semibold mb-6">Profile</h2>

   <div *ngIf="user$ | async as user" class="bg-white p-6 rounded-lg shadow">
     <p><strong>Username:</strong> {{ user.username }}</p>
     <p class="mt-2"><strong>Email:</strong> {{ user.email }}</p>
   </div>
 `
})
export class ProfileComponent implements OnInit {

  private userService = inject(UserService);
  user$!: Observable<Profile>;

  ngOnInit(): void {
    this.user$ = this.userService.Profile;
  }
}
