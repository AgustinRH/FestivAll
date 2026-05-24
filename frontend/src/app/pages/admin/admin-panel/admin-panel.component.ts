import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventosService } from '../../../core/services/eventos.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { AuthService } from '../../../core/services/auth.service';
import { Evento, Categoria } from '../../../core/models';
import { AdminUsuariosComponent } from '../admin-usuarios/admin-usuarios.component';

type AdminSection = 'eventos' | 'usuarios';
type AdminView = 'list' | 'form';
type MsgType = 'success' | 'error';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, AdminUsuariosComponent],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss',
})
export class AdminPanelComponent implements OnInit {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private catalogoService = inject(CatalogoService);
  private auth = inject(AuthService);
  private router = inject(Router);

  @ViewChild(AdminUsuariosComponent) adminUsuarios?: AdminUsuariosComponent;

  section: AdminSection = 'eventos';
  eventos: Evento[] = [];
  categorias: Categoria[] = [];
  editingId: number | null = null;
  view: AdminView = 'list';
  loading = false;
  saving = false;
  search = '';
  filterDestacados: 'all' | 'destacados' = 'all';
  filterCategoria = '';
  msg = '';
  msgType: MsgType = 'success';
  sidebarOpen = false;
  private msgTimer?: ReturnType<typeof setTimeout>;

  form = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: [''],
    idCategoria: ['', Validators.required],
    direccionCompleta: ['', [Validators.required, Validators.minLength(5)]],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    horaInicio: [''],
    horaFin: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    imagenUrl: [''],
    destacado: [false],
  });

  readonly user = this.auth.currentUser;

  ngOnInit() {
    this.load();
    this.catalogoService.getCategorias().subscribe((c) => (this.categorias = c));
  }

  get filteredEventos(): Evento[] {
    const q = this.search.trim().toLowerCase();
    return this.eventos.filter((e) => {
      if (this.filterDestacados === 'destacados' && !e.destacado) return false;
      if (this.filterCategoria && String(e.idCategoria) !== this.filterCategoria) return false;
      if (!q) return true;
      const dir = this.getDireccion(e).toLowerCase();
      const cat = e.categoria?.nombreCategoria?.toLowerCase() ?? '';
      return e.titulo.toLowerCase().includes(q) || dir.includes(q) || cat.includes(q);
    });
  }

  get destacadosCount(): number {
    return this.eventos.filter((e) => e.destacado).length;
  }

  get lowStockCount(): number {
    return this.eventos.filter((e) => e.stock <= 10).length;
  }

  get previewImage(): string {
    return this.form.get('imagenUrl')?.value?.trim() || '';
  }

  load() {
    this.loading = true;
    this.eventosService.getAll().subscribe({
      next: (e) => {
        this.eventos = e;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notify('No se pudieron cargar los eventos', 'error');
      },
    });
  }

  getDireccion(evento: Evento): string {
    return evento.ubicacion?.direccion || '—';
  }

  getImageUrl(evento: Evento): string | null {
    return evento.imagenes?.find((i) => i.esPrincipal)?.url || evento.imagenes?.[0]?.url || null;
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatRango(evento: Evento): string {
    const ini = this.formatFecha(evento.fechaInicio);
    if (evento.fechaFin && evento.fechaFin !== evento.fechaInicio) {
      return `${ini} – ${this.formatFecha(evento.fechaFin)}`;
    }
    return ini;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  selectEventos() {
    this.section = 'eventos';
    this.closeSidebar();
    this.closeForm();
  }

  selectUsuarios() {
    this.section = 'usuarios';
    this.closeSidebar();
    this.adminUsuarios?.closeForm();
  }

  openNewUsuario() {
    this.section = 'usuarios';
    this.closeSidebar();
    setTimeout(() => this.adminUsuarios?.openCreate(), 0);
  }

  get pageTitle(): string {
    if (this.section === 'usuarios') {
      const u = this.adminUsuarios;
      if (u?.view === 'form') {
        return u.editingId ? 'Editar usuario' : 'Crear usuario';
      }
      return 'Gestión de usuarios';
    }
    return this.view === 'form'
      ? this.editingId
        ? 'Editar evento'
        : 'Crear evento'
      : 'Gestión de eventos';
  }

  get pageSubtitle(): string {
    if (this.section === 'usuarios') {
      const u = this.adminUsuarios;
      if (u?.view === 'form') {
        return 'Completa los datos y guarda el usuario en FestivAll';
      }
      return 'Añade, edita o elimina cuentas de clientes y administradores';
    }
    if (this.view === 'list') {
      return 'Administra festivales, entradas y eventos destacados del inicio';
    }
    return 'Completa los datos y guarda para publicar en FestivAll';
  }

  openCreate() {
    this.section = 'eventos';
    this.closeSidebar();
    this.cancelEdit();
    this.view = 'form';
  }

  openEdit(evento: Evento) {
    this.section = 'eventos';
    this.closeSidebar();
    this.edit(evento);
    this.view = 'form';
  }

  closeForm() {
    this.closeSidebar();
    this.cancelEdit();
    this.view = 'list';
  }

  edit(evento: Evento) {
    this.editingId = evento.id;
    const img = this.getImageUrl(evento) || '';
    this.form.patchValue({
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      idCategoria: String(evento.idCategoria),
      direccionCompleta: this.getDireccion(evento),
      fechaInicio: evento.fechaInicio,
      fechaFin: evento.fechaFin || '',
      horaInicio: evento.horaInicio || '',
      horaFin: evento.horaFin || '',
      precio: evento.precio,
      stock: evento.stock,
      imagenUrl: img,
      destacado: evento.destacado ?? false,
    });
  }

  cancelEdit() {
    this.editingId = null;
    this.form.reset({ precio: 0, stock: 0, destacado: false });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify('Revisa los campos obligatorios del formulario', 'error');
      return;
    }
    const raw = this.form.getRawValue();
    const data = {
      titulo: raw.titulo!,
      descripcion: raw.descripcion || undefined,
      idCategoria: +raw.idCategoria!,
      direccionCompleta: raw.direccionCompleta!.trim(),
      fechaInicio: raw.fechaInicio!,
      fechaFin: raw.fechaFin || undefined,
      horaInicio: raw.horaInicio || undefined,
      horaFin: raw.horaFin || undefined,
      precio: +raw.precio!,
      stock: +raw.stock!,
      imagenUrl: raw.imagenUrl || undefined,
      destacado: !!raw.destacado,
    };

    this.saving = true;
    const req = this.editingId
      ? this.eventosService.update(this.editingId, data)
      : this.eventosService.create(data);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.notify(this.editingId ? 'Evento actualizado correctamente' : 'Evento creado correctamente');
        this.closeForm();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.notify(err.error?.message || 'Error al guardar el evento', 'error');
      },
    });
  }

  toggleDestacado(evento: Evento, ev?: Event) {
    ev?.stopPropagation();
    this.eventosService.toggleDestacado(evento.id).subscribe({
      next: (actualizado) => {
        evento.destacado = actualizado.destacado;
        this.notify(
          actualizado.destacado
            ? `«${evento.titulo}» ahora aparece en el inicio`
            : `«${evento.titulo}» ya no está en destacados`,
        );
      },
      error: (err) => this.notify(err.error?.message || 'Error al cambiar destacado', 'error'),
    });
  }

  delete(id: number, titulo: string, ev?: Event) {
    ev?.stopPropagation();
    if (!confirm(`¿Eliminar «${titulo}»? Esta acción no se puede deshacer.`)) return;
    this.eventosService.delete(id).subscribe({
      next: () => {
        this.notify('Evento eliminado');
        if (this.editingId === id) this.closeForm();
        this.load();
      },
      error: (err) => this.notify(err.error?.message || 'Error al eliminar', 'error'),
    });
  }

  clearFilters() {
    this.search = '';
    this.filterDestacados = 'all';
    this.filterCategoria = '';
  }

  notify(text: string, type: MsgType = 'success') {
    this.msg = text;
    this.msgType = type;
    if (this.msgTimer) clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => this.dismissMsg(), 5000);
  }

  dismissMsg() {
    this.msg = '';
    if (this.msgTimer) clearTimeout(this.msgTimer);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/festivall-admin']);
  }

  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }
}
