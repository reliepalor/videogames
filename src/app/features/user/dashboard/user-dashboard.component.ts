import { Component, HostListener, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { RouterModule, Router} from '@angular/router';
import { CommonModule } from '@angular/common';
@Component({
  standalone: true,
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.html',
  imports: [RouterModule, CommonModule],
  styles: [`
    ::-webkit-scrollbar {
      display: none;
    }
    scrollbar-width: none;
    -ms-overflow-style: none;
  `]
})
export class UserDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('backgroundVideo', { static: true }) backgroundVideo!: ElementRef<HTMLVideoElement>;

  slices = Array(12).fill(0);     // 12 layered “slices”
  sliceTransforms: string[] = []; // generated transforms

  ngOnInit() {
    this.generateSphereLayers();
    this.staggerIn();
  }

  ngAfterViewInit() {
    // Ensure the video plays, handling browser autoplay policies
    const video = this.backgroundVideo.nativeElement;
    video.play().catch(error => {
      console.log('Autoplay blocked, video will play on user interaction');
      // Optionally, add a click listener to play on first click
      document.addEventListener('click', () => {
        video.play();
      }, { once: true });
    });
  }

  // Creates the vertical stacked layers that form the sphere
  generateSphereLayers() {
    const layers = 12;
    const depth = 60; // px forward/back

    this.sliceTransforms = Array.from({ length: layers }).map((_, i) => {
      const offset = i - layers / 2;
      return `translateZ(${offset * (depth / layers)}px)`;
    });
  }

  // Fade in like Apple section animations
  staggerIn() {
    setTimeout(() => document.getElementById('heroText')!.style.opacity = '1', 100);
    setTimeout(() => document.getElementById('heroText')!.style.transform = 'translateY(0)', 100);

    setTimeout(() => document.getElementById('sphereWrapper')!.style.opacity = '1', 400);
    setTimeout(() => document.getElementById('sphereWrapper')!.style.transform = 'translateY(0)', 400);

    setTimeout(() => document.getElementById('heroButtons')!.style.opacity = '1', 700);
    setTimeout(() => document.getElementById('heroButtons')!.style.transform = 'translateY(0)', 700);
  }

  // Mouse-controlled rotation
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const sphere = document.getElementById('sphere')!;
    const x = (event.clientX / window.innerWidth - 0.5) * 30;
    const y = (event.clientY / window.innerHeight - 0.5) * -30;

    sphere.style.transform = `rotateX(${y}deg) rotateY(${x}deg)`;
  }

  togglePreview(video: HTMLVideoElement) {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

}
