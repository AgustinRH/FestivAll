import { Component, OnInit, inject, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ValoracionesService } from '../../../core/services/valoraciones.service';
import { ValoracionAdmin } from '../../../core/models';

@Component({
  selector: 'app-admin-valoraciones',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './admin-valoraciones.component.html',
  styleUrl: './admin-valoraciones.component.scss',
})
export class AdminValoracionesComponent implements OnInit {
  moderada = output<void>();
  private valoracionesService = inject(ValoracionesService);

  pendientes: ValoracionAdmin[] = [];
  loading = false;
  msg = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.valoracionesService.getPendientesAdmin().subscribe({
      next: (list) => {
        this.pendientes = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.msg = 'No se pudieron cargar las valoraciones pendientes.';
      },
    });
  }

  moderar(v: ValoracionAdmin, estado: 'aprobado' | 'rechazado'): void {
    const accion = estado === 'aprobado' ? 'aprobar' : 'rechazar';
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} esta valoración?`)) return;
    this.valoracionesService.moderar(v.id, estado).subscribe({
      next: (res) => {
        this.msg = res.message;
        this.load();
        this.moderada.emit();
      },
      error: (err) => {
        alert(err.error?.message || 'Error al moderar');
      },
    });
  }
}
