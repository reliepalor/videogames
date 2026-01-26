import { Component, HostListener, OnInit, AfterViewInit, ViewChild, ElementRef, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterModule, Router} from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { Subscription } from 'rxjs';
@Component({
  standalone: true,
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.html',
  imports: [RouterModule, CommonModule],
  styles: [`
    ::-webkit-scrollbar {
      display: none;
    }
    * {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
  `]
})
export class UserDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('backgroundVideo', { static: true }) backgroundVideo!: ElementRef<HTMLVideoElement>;

  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);
  private themeSubscription?: Subscription;

  isDarkMode = false;
  videoSrc = '/assets/videos/dark.mp4';

  slices = Array(12).fill(0);     // 12 layered "slices"
  sliceTransforms: string[] = []; // generated transforms

  ngOnInit() {
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      isDark => {
        this.isDarkMode = isDark;
        this.videoSrc = '/assets/videos/dark.mp4';
        this.cdr.markForCheck();
      }
    );

    this.generateSphereLayers();
    this.staggerIn();
  }

  ngAfterViewInit() {
    // Ensure the video plays, handling browser autoplay policies
    const video = this.backgroundVideo.nativeElement;

    // Wait for video to be ready
    video.addEventListener('loadeddata', () => {
      video.play().catch(error => {
        console.log('Autoplay blocked, attempting to play on user interaction');
        // Add a one-time click listener to play the video
        const playOnClick = () => {
          video.play().catch(err => console.log('Failed to play video:', err));
          document.removeEventListener('click', playOnClick);
        };
        document.addEventListener('click', playOnClick, { once: true });
      });
    });

    // Fallback: try playing after a short delay
    setTimeout(() => {
      if (video.paused) {
        video.play().catch(() => {});
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.themeSubscription?.unsubscribe();
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
    setTimeout(() => {
      const heroText = document.getElementById('heroText');
      if (heroText) {
        heroText.style.opacity = '1';
        heroText.style.transform = 'translateY(0)';
      }
    }, 100);

    setTimeout(() => {
      const sphereWrapper = document.getElementById('sphereWrapper');
      if (sphereWrapper) {
        sphereWrapper.style.opacity = '1';
        sphereWrapper.style.transform = 'translateY(0)';
      }
    }, 400);

    setTimeout(() => {
      const heroButtons = document.getElementById('heroButtons');
      if (heroButtons) {
        heroButtons.style.opacity = '1';
        heroButtons.style.transform = 'translateY(0)';
      }
    }, 700);
  }

  // Mouse-controlled rotation
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const sphere = document.getElementById('sphere');
    if (sphere) {
      const x = (event.clientX / window.innerWidth - 0.5) * 30;
      const y = (event.clientY / window.innerHeight - 0.5) * -30;

      sphere.style.transform = `rotateX(${y}deg) rotateY(${x}deg)`;
    }
  }

  togglePreview(video: HTMLVideoElement) {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

}
