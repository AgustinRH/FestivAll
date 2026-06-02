import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

const MOBILE_MAX_WIDTH = '(max-width: 768px)';
const SCROLL_DELTA = 8;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  menuOpen = false;
  explorarOpen = false;
  explorarMobileOpen = false;
  navVisible = true;

  private lastScrollY = 0;
  private mobileQuery?: MediaQueryList;
  private readonly onScroll = () => this.updateNavVisibility();

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.lastScrollY = window.scrollY;
    this.mobileQuery = window.matchMedia(MOBILE_MAX_WIDTH);
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  ngOnDestroy() {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('scroll', this.onScroll);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) {
      this.navVisible = true;
    }
  }

  closeMenu() {
    this.menuOpen = false;
    this.explorarOpen = false;
    this.explorarMobileOpen = false;
  }

  get explorarMenuActive(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/eventos' || url.startsWith('/eventos/') || url === '/mapa';
  }

  toggleExplorarDesktop(event: Event) {
    event.stopPropagation();
    this.explorarOpen = !this.explorarOpen;
  }

  toggleExplorarMobile() {
    this.explorarMobileOpen = !this.explorarMobileOpen;
  }

  @HostListener('document:click')
  closeExplorarDropdown() {
    this.explorarOpen = false;
  }

  logout() {
    this.closeMenu();
    this.auth.logout();
  }

  /** Enlace al perfil con saludo personalizado cuando hay sesión. */
  get saludoPerfil(): string {
    const u = this.auth.currentUser();
    if (!u?.nombre?.trim()) return 'Mi cuenta';
    const nombre =
      u.nombre.trim().charAt(0).toUpperCase() + u.nombre.trim().slice(1).toLowerCase();
    return `Bienvenido, ${nombre}`;
  }

  private updateNavVisibility() {
    if (!this.mobileQuery?.matches || this.menuOpen) {
      this.navVisible = true;
      return;
    }

    const y = window.scrollY;
    if (y <= 0) {
      this.navVisible = true;
    } else if (y > this.lastScrollY + SCROLL_DELTA) {
      this.navVisible = false;
    } else if (y < this.lastScrollY - SCROLL_DELTA) {
      this.navVisible = true;
    }
    this.lastScrollY = y;
  }
}
