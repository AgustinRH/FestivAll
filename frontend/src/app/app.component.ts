import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { DevDisclaimerComponent } from './shared/dev-disclaimer/dev-disclaimer.component';

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DevDisclaimerComponent],
  template: `
    <app-dev-disclaimer />
    <router-outlet />
  `,
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private gaInitialized = false;

  ngOnInit(): void {
    this.initGoogleAnalyticsIfConfigured();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.scrollToTopUnlessHash(event.urlAfterRedirects);
        this.trackPageView(event.urlAfterRedirects);
      });
  }

  /** SPA: al cambiar de ruta, mostrar el inicio de la página (móvil y escritorio). */
  private scrollToTopUnlessHash(url: string): void {
    if (url.includes('#')) {
      return;
    }
    const scroll = (): void => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scroll();
    requestAnimationFrame(scroll);
  }

  private initGoogleAnalyticsIfConfigured(): void {
    const measurementId = environment.gaMeasurementId;
    if (!measurementId || this.gaInitialized) {
      return;
    }
    const gtag = this.bootstrapGtag();
    gtag('js', new Date());
    gtag('config', measurementId);
    this.gaInitialized = true;
  }

  private trackPageView(url: string): void {
    const measurementId = environment.gaMeasurementId;
    if (!measurementId) {
      return;
    }
    const gtag = this.bootstrapGtag();
    gtag('config', measurementId, { page_path: url });
  }

  /** Equivalente al bloque inline de GA: define dataLayer antes de que cargue gtag/js. */
  private bootstrapGtag(): (...args: unknown[]) => void {
    const w = window as GtagWindow;
    w.dataLayer = w.dataLayer ?? [];
    if (!w.gtag) {
      w.gtag = (...args: unknown[]) => {
        w.dataLayer!.push(args);
      };
    }
    return w.gtag;
  }
}
