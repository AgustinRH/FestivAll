import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/** Redirige al perfil (entradas). Mantiene compatibilidad con enlaces antiguos de Stripe. */
@Component({
  selector: 'app-compra-exito',
  standalone: true,
  template: '',
})
export class CompraExitoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    void this.router.navigate(['/perfil'], {
      queryParams: sessionId ? { session_id: sessionId } : {},
      fragment: 'entradas',
      replaceUrl: true,
    });
  }
}
