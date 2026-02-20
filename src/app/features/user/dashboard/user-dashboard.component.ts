import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  BestSeller,
  ReportsService,
} from 'src/app/core/services/bestseller/reports.service';
import { CartService } from 'src/app/core/services/cart.service';
import { OrderService } from 'src/app/core/services/order.service';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { VideoGameService } from 'src/app/core/services/videogame.service';
import { DigitalProductService } from 'src/app/core/services/digital-products/digital-product.service';
import { VideoGame } from 'src/app/core/models/videogame.model';
import { DigitalProduct } from 'src/app/core/models/digital-products/digital-product.model';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

type RecommendedItem = {
  id: number;
  type: 'game' | 'digital';
  title: string;
  subtitle: string;
  price: number;
  imageUrl: string;
  route: string[];
};

@Component({
  standalone: true,
  selector: 'app-user-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './user-dashboard.html',
  styleUrls: ['./user-dashboardd.css'],
  encapsulation: ViewEncapsulation.None,
})
export class UserDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('particleCanvas', { static: false })
  particleCanvas?: ElementRef<HTMLCanvasElement>;

  isScrolled = false;
  buyingGames = new Set<number>();
  showBuyConfirmModal = false;
  isBuyConfirmClosing = false;
  pendingBuyGame: BestSeller | null = null;
  recommendedItems: RecommendedItem[] = [];
  activeRecommendedIndex = 0;
  recommendedTrackTransition = 'transform 900ms cubic-bezier(0.22, 0.61, 0.36, 1)';
  private recommendedIntervalId?: number;
  private isRecommendedHovered = false;

  private platformId = inject(PLATFORM_ID);
  private reportsService = inject(ReportsService);
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private videoGameService = inject(VideoGameService);
  private digitalProductService = inject(DigitalProductService);
  private gsapContext?: gsap.Context;
  private navTrigger?: ScrollTrigger;
  private particles: Particle[] = [];
  private particleCtx?: CanvasRenderingContext2D;
  private animationFrameId?: number;
  private refreshTimeoutId?: number;
  private productsScroll?: HTMLElement;
  private isDragging = false;
  private startX = 0;
  private scrollLeft = 0;
  private scrollY = 0;
  
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

  ngOnInit(): void {
    this.loadRecommendedItems();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    this.setupNavTrigger();
    this.setupAnimations();
    this.setupParticles();
    this.updateScrollProgress();
    this.setupHorizontalScroll();
    this.setupAdvancedHeroAnimations();
    this.addInteractiveEffects();
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
    if (this.recommendedIntervalId) {
      clearInterval(this.recommendedIntervalId);
    }
    
    this.removeScrollListeners();
  }

  get recommendedLoopItems(): RecommendedItem[] {
    if (!this.recommendedItems.length) return [];
    return [...this.recommendedItems, ...this.recommendedItems];
  }

  get recommendedTrackTransform(): string {
    return `translateX(-${this.activeRecommendedIndex * 100}%)`;
  }

  onRecommendedMouseEnter(): void {
    this.isRecommendedHovered = true;
  }

  onRecommendedMouseLeave(): void {
    this.isRecommendedHovered = false;
  }

  onRecommendedTransitionEnd(): void {
    const total = this.recommendedItems.length;
    if (!total) return;

    // Jump back to first real slide after reaching duplicated first slide.
    if (this.activeRecommendedIndex >= total) {
      this.recommendedTrackTransition = 'none';
      this.activeRecommendedIndex = 0;
      requestAnimationFrame(() => {
        this.recommendedTrackTransition = 'transform 900ms cubic-bezier(0.22, 0.61, 0.36, 1)';
      });
    }
  }

  openBuyConfirm(game: BestSeller, event?: MouseEvent): void {
    event?.stopPropagation();
    const gameId = game.videoGameId;
    if (!gameId || this.buyingGames.has(gameId)) return;

    this.pendingBuyGame = game;
    this.isBuyConfirmClosing = false;
    this.showBuyConfirmModal = true;
  }

  closeBuyConfirm(): void {
    this.isBuyConfirmClosing = true;
    setTimeout(() => {
      this.showBuyConfirmModal = false;
      this.isBuyConfirmClosing = false;
      this.pendingBuyGame = null;
    }, 180);
  }

  confirmBuyNow(): void {
    if (!this.pendingBuyGame) return;
    const game = this.pendingBuyGame;
    this.closeBuyConfirm();
    this.buyNow(game);
  }

  buyNow(game: BestSeller, event?: MouseEvent): void {
    event?.stopPropagation();

    const gameId = game.videoGameId;
    if (!gameId || this.buyingGames.has(gameId)) return;

    this.buyingGames.add(gameId);

    this.cartService.addToCart(gameId, 1).subscribe({
      next: () => {
        this.cartService.getCart().subscribe({
          next: (cart) => {
            const latestCartItem = [...(cart.items ?? [])]
              .filter(i => i.videoGameId === gameId)
              .sort((a, b) => b.cartItemId - a.cartItemId)[0];

            const cartItemId = latestCartItem?.cartItemId;
            if (!cartItemId) {
              this.buyingGames.delete(gameId);
              return;
            }

            this.orderService.checkout([cartItemId]).subscribe({
              next: () => {
                this.buyingGames.delete(gameId);
                this.router.navigate(['/orders']);
              },
              error: () => {
                this.buyingGames.delete(gameId);
              }
            });
          },
          error: () => {
            this.buyingGames.delete(gameId);
          }
        });
      },
      error: () => {
        this.buyingGames.delete(gameId);
      }
    });
  }

  private loadRecommendedItems(): void {
    forkJoin({
      games: this.videoGameService.getAll(),
      digitalProducts: this.digitalProductService.getActiveProducts()
    }).subscribe({
      next: ({ games, digitalProducts }) => {
        const gameRecommendations = this.shuffleArray((games ?? [])
          .filter(g => !!g.id)
        )
          .slice(0, 2)
          .map(g => this.mapGameToRecommended(g));

        const digitalRecommendations = this.shuffleArray((digitalProducts ?? [])
          .filter(p => p.id > 0)
        )
          .slice(0, 2)
          .map(p => this.mapDigitalToRecommended(p));

        this.recommendedItems = this.shuffleArray(
          [...gameRecommendations, ...digitalRecommendations]
        ).slice(0, 4);
        this.activeRecommendedIndex = 0;
        this.startRecommendedAutoCycle();
      },
      error: () => {
        this.recommendedItems = [];
      }
    });
  }

  private mapGameToRecommended(game: VideoGame): RecommendedItem {
    return {
      id: game.id ?? 0,
      type: 'game',
      title: game.title,
      subtitle: game.platform || 'Video Game',
      price: game.price,
      imageUrl: game.imageUrl || 'assets/no-image.png',
      route: ['/games', String(game.id)]
    };
  }

  private mapDigitalToRecommended(product: DigitalProduct): RecommendedItem {
    return {
      id: product.id,
      type: 'digital',
      title: product.name,
      subtitle: product.brand || product.platform || 'Digital Product',
      price: product.price,
      imageUrl: product.imagePath || 'assets/no-image.png',
      route: ['/digital-products']
    };
  }

  private shuffleArray<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private startRecommendedAutoCycle(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.recommendedItems.length <= 1) {
      if (this.recommendedIntervalId) {
        clearInterval(this.recommendedIntervalId);
        this.recommendedIntervalId = undefined;
      }
      return;
    }
    if (this.recommendedIntervalId) {
      clearInterval(this.recommendedIntervalId);
    }

    // Pause -> slide -> pause rhythm.
    this.recommendedIntervalId = window.setInterval(() => {
      if (this.isRecommendedHovered) return;
      this.activeRecommendedIndex += 1;
    }, 3800);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.scrollY = window.scrollY;
      this.updateScrollProgress();
      this.applyParallaxEffect();
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
      // Original hero text animation (if using old hero)
      const heroTextOld = document.querySelector('#heroText.old-hero');
      if (heroTextOld) {
        gsap.from('#heroText.old-hero span', {
          opacity: 0,
          y: 40,
          rotateX: -90,
          stagger: 0.08,
          duration: 1.2,
          ease: 'expo.out',
        });
      }

      // Animate product cards on scroll into view
      gsap.utils.toArray<HTMLElement>('.product-card').forEach((card, index) => {
        gsap.fromTo(
          card,
          { 
            opacity: 0,
            y: 60,
            scale: 0.9,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            delay: index * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '#products',
              start: 'top 70%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    });
  }

  private updateScrollProgress(): void {
    const progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;

    this.isScrolled = window.scrollY > 16;
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
      // Create particles with varied properties
      this.particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 0.5,
      }));
    }

    if (!this.animationFrameId) {
      this.animateParticles();
    }
  }

  private resizeCanvas(): void {
    const canvas = this.particleCanvas?.nativeElement;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    if (this.particleCtx) {
      this.particleCtx.scale(dpr, dpr);
    }
  }

  private animateParticles(): void {
    const ctx = this.particleCtx;
    const canvas = this.particleCanvas?.nativeElement;
    if (!ctx || !canvas) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, height);

    // Draw particles with glow effect
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off edges
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      // Draw particle with subtle glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      
      // Gradient for glow effect
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      gradient.addColorStop(0, 'rgba(167, 139, 250, 0.8)');
      gradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.3)');
      gradient.addColorStop(1, 'rgba(167, 139, 250, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
    }

    // Draw connections between nearby particles
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          ctx.beginPath();
          ctx.moveTo(this.particles[i].x, this.particles[i].y);
          ctx.lineTo(this.particles[j].x, this.particles[j].y);
          ctx.strokeStyle = `rgba(167, 139, 250, ${0.15 * (1 - distance / 150)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.animateParticles());
  }

  private applyParallaxEffect(): void {
    const canvas = this.particleCanvas?.nativeElement;
    if (!canvas) return;

    // Subtle parallax - canvas moves slower than scroll
    const offset = this.scrollY * 0.3;
    canvas.style.transform = `translateY(${offset}px)`;
  }

  private setupAdvancedHeroAnimations(): void {
    this.gsapContext?.add(() => {
      // Eyebrow line animation
      gsap.from('.eyebrow-line', {
        width: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.1,
      });

      // CTA buttons
      gsap.from('button', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        delay: 0.8,
      });

      // Trust indicators with class
      const trustIndicators = document.querySelectorAll('.flex.items-center.gap-2');
      trustIndicators.forEach((el) => {
        el.classList.add('trust-indicator');
      });

      // Stats container
      const statsContainer = document.querySelector('.grid.grid-cols-2');
      if (statsContainer) {
        statsContainer.classList.add('stats-container');
        
        // Add stat-item class to children
        const statItems = statsContainer.querySelectorAll(':scope > div');
        statItems.forEach((item) => {
          item.classList.add('stat-item');
        });
      }
    });
  }

  private addInteractiveEffects(): void {
    // Add magnetic effect to buttons
    const buttons = document.querySelectorAll<HTMLElement>('button');
    
    buttons.forEach((button) => {
      button.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        gsap.to(button, {
          x: x * 0.2,
          y: y * 0.2,
          duration: 0.3,
          ease: 'power2.out',
        });
      });

      button.addEventListener('mouseleave', () => {
        gsap.to(button, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: 'elastic.out(1, 0.5)',
        });
      });
    });

    // Add 3D tilt to product cards in hero
    const heroCards = document.querySelectorAll<HTMLElement>('[id^="productCard"]');
    
    heroCards.forEach((card) => {
      card.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        gsap.to(card, {
          rotateX: rotateX,
          rotateY: rotateY,
          duration: 0.3,
          ease: 'power2.out',
          transformPerspective: 1000,
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.5,
          ease: 'elastic.out(1, 0.5)',
        });
      });
    });

    // Cursor-following glow effect
    this.addCursorGlow();
  }

  private addCursorGlow(): void {
    const heroSection = document.querySelector<HTMLElement>('section');
    if (!heroSection) return;

    let glowElement = document.createElement('div');
    glowElement.className = 'cursor-glow';
    glowElement.style.cssText = `
      position: absolute;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, transparent 70%);
      pointer-events: none;
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 1;
    `;

    heroSection.style.position = 'relative';
    heroSection.insertBefore(glowElement, heroSection.firstChild);

    heroSection.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = heroSection.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      glowElement.style.left = `${x}px`;
      glowElement.style.top = `${y}px`;
      glowElement.style.opacity = '1';
    });

    heroSection.addEventListener('mouseleave', () => {
      glowElement.style.opacity = '0';
    });
  }

  private setupHorizontalScroll(): void {
    this.productsScroll = document.getElementById('products-scroll') ?? undefined;
    const scrollLeftBtn = document.getElementById('scroll-left');
    const scrollRightBtn = document.getElementById('scroll-right');

    if (!this.productsScroll) return;

    // Scroll button controls
    scrollLeftBtn?.addEventListener('click', () => this.scrollProducts(-400));
    scrollRightBtn?.addEventListener('click', () => this.scrollProducts(400));

    // Mouse drag to scroll
    this.productsScroll.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.productsScroll.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.productsScroll.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.productsScroll.addEventListener('mousemove', this.handleMouseMove.bind(this));

    // Prevent card click when dragging
    this.productsScroll.addEventListener('click', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  private scrollProducts(offset: number): void {
    if (!this.productsScroll) return;
    
    gsap.to(this.productsScroll, {
      scrollLeft: this.productsScroll.scrollLeft + offset,
      duration: 0.6,
      ease: 'power2.out',
    });
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.productsScroll) return;
    
    this.isDragging = true;
    this.startX = e.pageX - this.productsScroll.offsetLeft;
    this.scrollLeft = this.productsScroll.scrollLeft;
    this.productsScroll.style.cursor = 'grabbing';
  }

  private handleMouseLeave(): void {
    this.isDragging = false;
    if (this.productsScroll) {
      this.productsScroll.style.cursor = 'grab';
    }
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    if (this.productsScroll) {
      this.productsScroll.style.cursor = 'grab';
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.productsScroll) return;
    
    e.preventDefault();
    const x = e.pageX - this.productsScroll.offsetLeft;
    const walk = (x - this.startX) * 2; // Scroll speed multiplier
    this.productsScroll.scrollLeft = this.scrollLeft - walk;
  }

  private removeScrollListeners(): void {
    if (!this.productsScroll) return;
    
    const scrollLeftBtn = document.getElementById('scroll-left');
    const scrollRightBtn = document.getElementById('scroll-right');
    
    scrollLeftBtn?.removeEventListener('click', () => this.scrollProducts(-400));
    scrollRightBtn?.removeEventListener('click', () => this.scrollProducts(400));
  }

  private deferVisualRefresh(): void {
    requestAnimationFrame(() => {
      this.resizeCanvas();
      this.setupParticles();
      this.setupHorizontalScroll();
      ScrollTrigger.refresh();
    });

    this.refreshTimeoutId = window.setTimeout(() => {
      this.resizeCanvas();
      this.setupParticles();
      this.setupHorizontalScroll();
      ScrollTrigger.refresh();
    }, 200);
  }

  getBestSellerImageUrl(imagePath?: string | null): string | null {
    const path = imagePath?.trim();
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${normalized}`;
  }
}
