import {
  Component,
  HostListener,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  inject,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { Subscription } from 'rxjs';
import { Aurora } from 'src/app/shared/components/background/aurora';

@Component({
  standalone: true,
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.html',
  imports: [RouterModule, CommonModule],
  styles: [`
    ::-webkit-scrollbar { display: none; }
    * { scrollbar-width: none; -ms-overflow-style: none; }

    .animate-in {
      opacity: 1 !important;
      transform: translateY(0) scale(1) !important;
    }
  `]
})
export class UserDashboardComponent
  implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('backgroundVideo', { static: true })
  backgroundVideo!: ElementRef<HTMLVideoElement>;

  @ViewChild('auroraContainer', { static: false })
  auroraContainer!: ElementRef<HTMLDivElement>;

  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);
  private themeSubscription?: Subscription;
  private platformId = inject(PLATFORM_ID);

  private aurora?: Aurora;

  isDarkMode = false;
  videoSrc = '/assets/videos/dark.mp4';
  isVisible = true;

  /* ================== SPHERE ================== */
  slices = Array(12).fill(0);
  sliceTransforms: string[] = [];

  /* ================== CAROUSEL ================== */
  cards = [
    { title: 'Fast Transactions', desc: 'Lightning-fast transaction processing with instant confirmations.', icon: 'zap', type: 'large' },
    { title: 'Secure Wallet', desc: 'Bank-level security with multi-signature protection.', icon: 'shield', type: 'wide' },
    { title: 'Buy & Sell Instantly', desc: 'Trade cryptocurrencies 24/7 with real-time market data.', icon: 'repeat', type: 'tall' },
    { title: 'Multi-Currency Support', desc: 'Support for 100+ cryptocurrencies and fiat currencies.', icon: 'coins', type: 'normal' },
    { title: 'AI Price Forecast', desc: 'Advanced AI algorithms predict market trends.', icon: 'activity', type: 'normal' },
    { title: '24/7 Support', desc: 'Get help anytime with our dedicated support team.', icon: 'help', type: 'normal' },
    { title: 'Low Fees', desc: 'Enjoy competitive fees on all transactions.', icon: 'dollar', type: 'wide' }
  ];

  offset = 0;
  cardWidth = 340;
  carouselInterval!: any;

  ngOnInit() {
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
      this.videoSrc = '/assets/videos/dark.mp4';
      this.cdr.markForCheck();
    });

    this.generateSphereLayers();
    this.staggerIn();
    this.startCarousel();
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const video = this.backgroundVideo.nativeElement;

      video.addEventListener('loadeddata', () => {
        video.play().catch(() => {
          document.addEventListener('click', () => video.play(), { once: true });
        });
      });

      setTimeout(() => {
        if (video.paused) video.play().catch(() => {});
      }, 800);

      // INIT AURORA
      this.aurora = new Aurora(this.auroraContainer.nativeElement, {
        colorStops: ['#de66ff', '#B19EEF', '#5227FF'],
        amplitude: 0.8,
        blend: 0.6,
        speed: 2.5
      });

      // Trigger bento grid animation
      setTimeout(() => {
        this.isVisible = true;
        this.cdr.markForCheck();
      }, 500);
    }
  }

  ngOnDestroy() {
    this.themeSubscription?.unsubscribe();
    clearInterval(this.carouselInterval);
    this.aurora?.destroy();
  }

  generateSphereLayers() {
    const layers = 12;
    const depth = 60;

    this.sliceTransforms = Array.from({ length: layers }).map((_, i) => {
      const offset = i - layers / 2;
      return `translateZ(${offset * (depth / layers)}px)`;
    });
  }

  staggerIn() {
    setTimeout(() => this.fadeIn('heroText'), 100);
    setTimeout(() => this.fadeIn('sphereWrapper'), 400);
    setTimeout(() => this.fadeIn('heroButtons'), 700);
  }

  fadeIn(id: string) {
    if (isPlatformBrowser(this.platformId)) {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }
  }

  startCarousel() {
    this.carouselInterval = setInterval(() => {
      this.offset -= this.cardWidth;
      if (Math.abs(this.offset) >= this.cards.length * this.cardWidth) {
        this.offset = 0;
      }
    }, 2200);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (isPlatformBrowser(this.platformId)) {
      const sphere = document.getElementById('sphere');
      if (!sphere) return;

      const x = (event.clientX / window.innerWidth - 0.5) * 30;
      const y = (event.clientY / window.innerHeight - 0.5) * -30;
      sphere.style.transform = `rotateX(${y}deg) rotateY(${x}deg)`;
    }
  }

  togglePreview(video: HTMLVideoElement) {
    video.paused ? video.play() : video.pause();
  }
}
