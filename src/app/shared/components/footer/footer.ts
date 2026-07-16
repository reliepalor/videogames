import { AfterViewInit, Component, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss'],
})
export class FooterComponent implements OnInit, AfterViewInit {
  currentYear = new Date().getFullYear();

  products = ['Office 365', 'Adobe Creative', 'Windows 11', 'Antivirus'];

  support = ['Live Chat', 'Email Support', 'FAQ', 'Track Order'];

  social = [
    {
      label: 'Facebook',
      icon: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
    },
    {
      label: 'Instagram',
      icon: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>`,
    },
    {
      label: 'X / Twitter',
      icon: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4l16 16M4 20L20 4"/></svg>`,
    },
  ];

  constructor(private el: ElementRef) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.observeFooter();
  }

  private observeFooter(): void {
    const footer = this.el.nativeElement.querySelector('.footer-root');
    const cols = this.el.nativeElement.querySelectorAll('.footer-col');
    const bottom = this.el.nativeElement.querySelector('.footer-bottom');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            footer.classList.add('footer-visible');

            cols.forEach((col: HTMLElement, i: number) => {
              setTimeout(() => {
                col.classList.add('col-visible');
              }, i * 80);
            });

            setTimeout(() => {
              bottom?.classList.add('bottom-visible');
            }, 400);

            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(footer);
  }
}