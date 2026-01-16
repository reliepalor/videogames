import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton-box.component.html',
  styleUrls: ['./skeleton-box.component.scss']
})
export class SkeletonBoxComponent {
  @Input() width: string = '100%';
  @Input() height: string = '20px';
  @Input() rounded: string = '8px';
}
