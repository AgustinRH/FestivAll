import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EventosService } from '../../../core/services/eventos.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { AuthService } from '../../../core/services/auth.service';
import { Evento, Categoria, Ubicacion } from '../../../core/models';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss',
})
export class AdminPanelComponent implements OnInit {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private catalogoService = inject(CatalogoService);
  private auth = inject(AuthService);
  private router = inject(Router);

  eventos: Evento[] = [];
  categorias: Categoria[] = [];
  ubicaciones: Ubicacion[] = [];
  editingId: number | null = null;
  msg = '';

  form = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: [''],
    idCategoria: ['', Validators.required],
    idUbicacion: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    horaInicio: [''],
    horaFin: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    imagenUrl: [''],
  });

  ngOnInit() {
    this.load();
    this.catalogoService.getCategorias().subscribe((c) => (this.categorias = c));
    this.catalogoService.getUbicaciones().subscribe((u) => (this.ubicaciones = u));
  }

  load() {
    this.eventosService.getAll().subscribe((e) => (this.eventos = e));
  }

  edit(evento: Evento) {
    this.editingId = evento.id;
    const img = evento.imagenes?.find((i) => i.esPrincipal)?.url || '';
    this.form.patchValue({
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      idCategoria: String(evento.idCategoria),
      idUbicacion: String(evento.idUbicacion),
      fechaInicio: evento.fechaInicio,
      fechaFin: evento.fechaFin || '',
      horaInicio: evento.horaInicio || '',
      horaFin: evento.horaFin || '',
      precio: evento.precio,
      stock: evento.stock,
      imagenUrl: img,
    });
  }

  cancelEdit() {
    this.editingId = null;
    this.form.reset();
  }

  submit() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const data = {
      titulo: raw.titulo!,
      descripcion: raw.descripcion || undefined,
      idCategoria: +raw.idCategoria!,
      idUbicacion: +raw.idUbicacion!,
      fechaInicio: raw.fechaInicio!,
      fechaFin: raw.fechaFin || undefined,
      horaInicio: raw.horaInicio || undefined,
      horaFin: raw.horaFin || undefined,
      precio: +raw.precio!,
      stock: +raw.stock!,
      imagenUrl: raw.imagenUrl || undefined,
    };

    const req = this.editingId
      ? this.eventosService.update(this.editingId, data)
      : this.eventosService.create(data);

    req.subscribe({
      next: () => {
        this.msg = this.editingId ? 'Evento actualizado' : 'Evento creado';
        this.cancelEdit();
        this.load();
      },
      error: (err) => (this.msg = err.error?.message || 'Error'),
    });
  }

  delete(id: number) {
    if (!confirm('¿Eliminar este evento?')) return;
    this.eventosService.delete(id).subscribe(() => {
      this.msg = 'Evento eliminado';
      this.load();
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/festivall-admin']);
  }
}
