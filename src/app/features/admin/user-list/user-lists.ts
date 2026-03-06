import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from 'src/app/core/services/user.service';
import { User } from 'src/app/core/models/user/user.model';

@Component({
  standalone: true,
  selector: 'app-users',
  imports: [CommonModule],
  templateUrl: './user-lists.html',
})
export class UsersComponent implements OnInit {
  users = signal<User[]>([]);
  loading = signal<boolean>(false);
  error = signal<string>('');
  success = signal<string>('');
  deletingUserIds = signal<number[]>([]);
  pendingDeleteUser = signal<User | null>(null);
  private successTimerId?: number;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  private fetchUsers(): void {
    this.loading.set(true);
    this.error.set('');

    this.userService.getNonAdminUsers().subscribe({
      next: (data) => {
        this.users.set(data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        const status = err?.status ? ` (${err.status})` : '';
        const message = err?.message ? `: ${err.message}` : '';
        this.error.set(`Failed to load users${status}${message}`);
        this.success.set('');
        console.error('getNonAdminUsers failed:', err);
        this.loading.set(false);
      },
    });
  }

  onDeleteUser(user: User): void {
    this.pendingDeleteUser.set(user);
  }

  closeDeleteModal(): void {
    this.pendingDeleteUser.set(null);
  }

  confirmDeleteUser(): void {
    const user = this.pendingDeleteUser();
    if (!user) return;
    this.pendingDeleteUser.set(null);
    this.deleteUser(user);
  }

  private deleteUser(user: User): void {
    const userId = Number(user.id);
    if (!Number.isFinite(userId) || userId <= 0) return;
    if (this.deletingUserIds().includes(userId)) return;
    this.deletingUserIds.set([...this.deletingUserIds(), userId]);

    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.deletingUserIds.set(this.deletingUserIds().filter((id) => id !== userId));
        this.error.set('');
        this.showSuccess(`User "${user.username}" deleted successfully.`);
        this.fetchUsers();
      },
      error: (err) => {
        const status = err?.status ? ` (${err.status})` : '';
        const message = err?.message ? `: ${err.message}` : '';
        this.error.set(`Failed to delete user${status}${message}`);
        this.success.set('');
        this.deletingUserIds.set(this.deletingUserIds().filter((id) => id !== userId));
      },
    });
  }

  isDeleting(userId: number): boolean {
    return this.deletingUserIds().includes(userId);
  }

  private showSuccess(message: string): void {
    this.success.set(message);
    if (this.successTimerId) {
      window.clearTimeout(this.successTimerId);
    }
    this.successTimerId = window.setTimeout(() => {
      this.success.set('');
      this.successTimerId = undefined;
    }, 3000);
  }
}
