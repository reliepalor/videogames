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

@Component({
  standalone: true,
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.html',
  imports: [RouterModule, CommonModule],
  styles: [`
    ::-webkit-scrollbar { display: none; }
    * { scrollbar-width: none; -ms-overflow-style: none; }

    .reveal {
      opacity: 0;
      transform: translateY(24px) scale(0.98);
      transition: opacity 0.7s ease, transform 0.7s ease;
      will-change: opacity, transform;
    }

    .reveal.animate-in {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    @media (prefers-reduced-motion: reduce) {
      .reveal {
        transition: none;
      }
    }

    .mask-image-gradient {
      mask-image: linear-gradient(
        to top,
        rgba(0,0,0,1) 0%,
        rgba(0,0,0,0.9) 40%,
        rgba(0,0,0,0) 100%
      );
    }
  `]
})
export class UserDashboardComponent
  implements OnInit, AfterViewInit, OnDestroy {

  /* ================= VIEW REFERENCES ================= */
  @ViewChild('backgroundVideo', { static: true })
  backgroundVideo!: ElementRef<HTMLVideoElement>;

  @ViewChild('scrollContainer', { static: true })
  scrollContainer!: ElementRef<HTMLDivElement>;

  @ViewChild('auroraContainer', { static: false })
  auroraContainer!: ElementRef<HTMLDivElement>;

  /* ================= SERVICES ================= */
  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  private themeSubscription?: Subscription;
  private carouselInterval!: any;

  /* ================= STATE ================= */
  isDarkMode = false;
  videoSrc = 'assets/videos/dark.mp4';
  isVisible = true;

  /* ================= SPHERE ================= */
  slices = Array(12).fill(0);
  sliceTransforms: string[] = [];

  /* ================= CAROUSEL ================= */
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

  /* ================= LIFECYCLE ================= */

  ngOnInit() {
    this.themeSubscription = this.themeService.isDarkMode$
      .subscribe(isDark => {
        this.isDarkMode = isDark;
        this.videoSrc = 'assets/videos/dark.mp4';
        this.cdr.markForCheck();
      });

    this.generateSphereLayers();
    this.staggerIn();
    this.startCarousel();
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    /* ===== VIDEO AUTOPLAY SAFETY ===== */
    const video = this.backgroundVideo?.nativeElement;
    if (video) {
      video.muted = true;
      const tryPlay = () => {
        video.play().catch(() => {
          document.addEventListener(
            'click',
            () => video.play().catch(() => {}),
            { once: true }
          );
        });
      };

      video.addEventListener('loadeddata', tryPlay);
      video.addEventListener('canplay', tryPlay);
      requestAnimationFrame(tryPlay);

      setTimeout(() => {
        if (video.paused) {
          tryPlay();
        }
      }, 800);
    }

    /* ===== SCROLL REVEAL ===== */
    const rootEl = this.scrollContainer?.nativeElement ?? null;
    const root =
      rootEl && rootEl.scrollHeight > rootEl.clientHeight + 1 ? rootEl : null;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, root, rootMargin: '0px 0px -10% 0px' }
    );

    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>('.reveal')
    );

    // Animate anything already in view on load (after first paint).
    const rootHeight = root?.clientHeight ?? window.innerHeight;
    const rootTop = root?.getBoundingClientRect().top ?? 0;
    requestAnimationFrame(() => {
      setTimeout(() => {
        revealElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const top = rect.top - rootTop;
          const bottom = top + rect.height;
          if (bottom > 0 && top < rootHeight) {
            el.classList.add('animate-in');
          }
        });
      }, 50);
    });

    revealElements.forEach(el => observer.observe(el));

    /* ===== INITIAL VISIBILITY ===== */
    setTimeout(() => {
      this.isVisible = true;
      this.cdr.markForCheck();
    }, 500);
  }

  ngOnDestroy() {
    this.themeSubscription?.unsubscribe();
    clearInterval(this.carouselInterval);
  }

  /* ================= LOGIC ================= */

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
    if (!isPlatformBrowser(this.platformId)) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
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
    if (!isPlatformBrowser(this.platformId)) return;

    const sphere = document.getElementById('sphere');
    if (!sphere) return;

    const x = (event.clientX / window.innerWidth - 0.5) * 30;
    const y = (event.clientY / window.innerHeight - 0.5) * -30;
    sphere.style.transform = `rotateX(${y}deg) rotateY(${x}deg)`;
  }

  togglePreview(video: HTMLVideoElement) {
    video.paused ? video.play() : video.pause();
  }
}
