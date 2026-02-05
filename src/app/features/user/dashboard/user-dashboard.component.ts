import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  BestSeller,
  ReportsService,
} from 'src/app/core/services/bestseller/reports.service';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

@Component({
  standalone: true,
  selector: 'app-user-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './user-dashboard.html',
  styleUrls: ['./user-dashboardd.css'],
  encapsulation: ViewEncapsulation.None,
})
export class UserDashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('particleCanvas', { static: false })
  particleCanvas?: ElementRef<HTMLCanvasElement>;

  cartCount = 0;

  private platformId = inject(PLATFORM_ID);
  private reportsService = inject(ReportsService);
  private gsapContext?: gsap.Context;
  private navTrigger?: ScrollTrigger;
  private particles: Particle[] = [];
  private particleCtx?: CanvasRenderingContext2D;
  private animationFrameId?: number;
  private refreshTimeoutId?: number;
  apiUrl = environment.apiUrl;

  bestSellers$: Observable<Array<BestSeller & { percent: number }> | null> =
    this.reportsService.getBestSellers().pipe(
    map((sales) => {
      if (!sales || sales.length === 0) return null;
      const total = sales.reduce((sum, item) => sum + item.totalRevenue, 0);
      return [...sales]
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 6)
        .map((item) => ({
          ...item,
          percent: total ? parseFloat(((item.totalRevenue / total) * 100).toFixed(1)) : 0,
        }));
    }),
    catchError(() => of(null)),
    tap(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.deferVisualRefresh();
      }
    })
  );

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    this.setupNavTrigger();
    this.setupAnimations();
    this.setupParticles();
    this.updateScrollProgress();
    this.deferVisualRefresh();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.navTrigger?.kill();
    this.gsapContext?.revert();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
    }
  }

  onAddToCart(): void {
    this.cartCount++;
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.updateScrollProgress();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.resizeCanvas();
    }
  }

  private setupNavTrigger(): void {
    const nav = document.getElementById('navbar');
    if (!nav) return;

    this.navTrigger = ScrollTrigger.create({
      start: 'top -80',
      onEnter: () => nav.classList.add('nav-solid'),
      onLeaveBack: () => nav.classList.remove('nav-solid'),
    });
  }

  private setupAnimations(): void {
    this.gsapContext = gsap.context(() => {
      gsap.from('#heroText span', {
        opacity: 0,
        y: 40,
        rotateX: -90,
        stagger: 0.08,
        duration: 1.2,
        ease: 'expo.out',
      });

      gsap.utils.toArray<HTMLElement>('.product-card').forEach((card) => {
        gsap.fromTo(
          card,
          { rotateY: 16, y: 30, opacity: 0 },
          {
            rotateY: 0,
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              end: 'bottom 20%',
              toggleActions: 'play reverse play reverse',
            },
          }
        );
      });
    });
  }

  private updateScrollProgress(): void {
    const progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;

    const maxScroll = document.body.scrollHeight - innerHeight;
    const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    gsap.to(progressBar, { width: `${progress * 100}%`, duration: 0.1 });
  }

  private setupParticles(): void {
    const canvas = this.particleCanvas?.nativeElement;
    if (!canvas) return;

    this.particleCtx = canvas.getContext('2d') ?? undefined;
    if (!this.particleCtx) return;

    this.resizeCanvas();

    if (this.particles.length === 0) {
      this.particles = Array.from({ length: 30 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.random() - 0.5,
        vy: Math.random() - 0.5,
        r: Math.random() * 3 + 1,
      }));
    }

    if (!this.animationFrameId) {
      this.animateParticles();
    }
  }

  private resizeCanvas(): void {
    const canvas = this.particleCanvas?.nativeElement;
    if (!canvas) return;

    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }

  private animateParticles(): void {
    const ctx = this.particleCtx;
    const canvas = this.particleCanvas?.nativeElement;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
    }

    this.animationFrameId = requestAnimationFrame(() => this.animateParticles());
  }

  private deferVisualRefresh(): void {
    requestAnimationFrame(() => {
      this.resizeCanvas();
      this.setupParticles();
      ScrollTrigger.refresh();
    });

    this.refreshTimeoutId = window.setTimeout(() => {
      this.resizeCanvas();
      this.setupParticles();
      ScrollTrigger.refresh();
    }, 200);
  }
}
