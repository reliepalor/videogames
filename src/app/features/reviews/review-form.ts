import { Component, Input, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../core/services/review.service';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-form.html'
})
export class ReviewFormComponent {
  @Input() videoGameId!: number;
  @Output() reviewSubmitted = new EventEmitter<void>();

  private reviewService = inject(ReviewService);
  private orderService = inject(OrderService);

  rating = 5;
  comment = '';
  submitting = false;
  success = '';

  submit(): void {
    if (!this.comment.trim()) {
      alert('Please enter a comment for your review');
      return;
    }
    if (this.rating < 1 || this.rating > 5) {
      alert('Please select a rating between 1 and 5 stars');
      return;
    }
    this.submitting = true;
    // Find the approved order that contains this game
    this.orderService.getMyOrders().subscribe({
      next: orders => {
        const approvedOrder = orders.find(o => o.status == 1 && o.items.some(i => i.videoGameId == this.videoGameId));
        if (!approvedOrder) {
          alert('You must have an approved purchase of this game to review it.');
          this.submitting = false;
          return;
        }
        this.reviewService.createReview({
          videoGameId: this.videoGameId,
          rating: this.rating,
          comment: this.comment.trim(),
          orderId: approvedOrder.id
        }).subscribe({
          next: () => {
            this.success = 'Review submitted successfully';
            this.comment = '';
            this.rating = 5;
            this.submitting = false;
            this.reviewSubmitted.emit();
          },
          error: err => {
            let message = 'Failed to submit review';
            if (err.status === 401) {
              message = 'Please log in to submit a review';
            } else if (err.status === 400) {
              if (err.error?.includes('already reviewed')) {
                message = 'You have already reviewed this game';
              } else if (err.error?.includes('Order not found') || err.error?.includes('not approved') || err.error?.includes('doest not contain')) {
                message = 'You must have an approved purchase of this game to review it.';
              } else {
                message = err.error || 'Invalid review data';
              }
            }
            alert(message);
            this.submitting = false;
          }
        });
      },
      error: () => {
        alert('Failed to load orders. Please try again.');
        this.submitting = false;
      }
    });
  }
}
