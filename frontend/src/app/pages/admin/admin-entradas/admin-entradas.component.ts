import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComprasService } from '../../../core/services/compras.service';
import { EventosService } from '../../../core/services/eventos.service';
import { UsuariosAdminService } from '../../../core/services/usuarios-admin.service';
import { EntradaAdmin, Evento, AdminUser } from '../../../core/models';

@Component({
  selector: 'app-admin-entradas',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './admin-entradas.component.html',
  styleUrl: './admin-entradas.component.scss',
})
export class AdminEntradasComponent implements OnInit {
  private compras = inject(ComprasService);
  private eventos = inject(EventosService);
  private usuarios = inject(UsuariosAdminService);

  eventosList: Evento[] = [];
  usuariosList: AdminUser[] = [];
  eventoId: number | null = null;
  entradas: EntradaAdmin[] = [];
  loadingEventos = false;
  loadingEntradas = false;
  msg = '';

  reasignarId: number | null = null;
  nuevoUsuarioId: number | null = null;

  ngOnInit() {
    this.loadingEventos = true;
    this.eventos.getAll().subscribe({
      next: (e) => {
        this.eventosList = e;
        this.loadingEventos = false;
      },
      error: () => {
        this.loadingEventos = false;
        this.msg = 'No se pudieron cargar los eventos';
      },
    });
    this.usuarios.getAll().subscribe({
      next: (u) => (this.usuariosList = u),
      error: () => {},
    });
  }

  cargarEntradas() {
    if (!this.eventoId) {
      this.entradas = [];
      return;
    }
    this.loadingEntradas = true;
    this.msg = '';
    this.compras.getEntradasAdmin(this.eventoId).subscribe({
      next: (rows) => {
        this.entradas = rows;
        this.loadingEntradas = false;
      },
      error: (err) => {
        this.loadingEntradas = false;
        this.msg = err.error?.message || 'Error al cargar entradas';
      },
    });
  }

  abrirReasignar(row: EntradaAdmin) {
    this.reasignarId = row.id;
    this.nuevoUsuarioId = row.idUsuario;
  }

  cerrarReasignar() {
    this.reasignarId = null;
    this.nuevoUsuarioId = null;
  }

  confirmarReasignar() {
    if (!this.reasignarId || !this.nuevoUsuarioId) return;
    this.compras.reasignarEntradaAdmin(this.reasignarId, this.nuevoUsuarioId).subscribe({
      next: () => {
        this.msg = 'Entrada reasignada';
        this.cerrarReasignar();
        this.cargarEntradas();
      },
      error: (err) => alert(err.error?.message || 'Error al reasignar'),
    });
  }

  marcarAsistida(row: EntradaAdmin) {
    this.compras.marcarAsistidaAdmin(row.id).subscribe({
      next: (res: { message: string }) => {
        this.msg = res.message;
        this.cargarEntradas();
      },
      error: (err: { error?: { message?: string } }) =>
        alert(err.error?.message || 'Error al marcar asistencia'),
    });
  }

  eliminar(row: EntradaAdmin) {
    if (!confirm(`¿Eliminar la entrada ${row.codigoAcceso}? Se devolverá 1 al stock del evento.`)) return;
    this.compras.deleteEntradaAdmin(row.id).subscribe({
      next: () => {
        this.msg = 'Entrada eliminada';
        this.cargarEntradas();
      },
      error: (err) => alert(err.error?.message || 'Error al eliminar'),
    });
  }

  tituloEvento(id: number): string {
    return this.eventosList.find((e) => e.id === id)?.titulo ?? `#${id}`;
  }
}
