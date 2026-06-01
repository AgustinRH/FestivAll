import { isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventosService } from '../../../core/services/eventos.service';
import { ComprasService, CierreCajaReport } from '../../../core/services/compras.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { ClientesAdminService } from '../../../core/services/clientes-admin.service';
import { UsuariosAdminService } from '../../../core/services/usuarios-admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { Evento, Categoria, Cliente } from '../../../core/models';
import { AdminUsuariosComponent } from '../admin-usuarios/admin-usuarios.component';
import { AdminClientesComponent } from '../admin-clientes/admin-clientes.component';
import { AdminEntradasComponent } from '../admin-entradas/admin-entradas.component';
import { AdminValoracionesComponent } from '../admin-valoraciones/admin-valoraciones.component';
import { AdminUbicacionPickerComponent } from '../admin-ubicacion-picker/admin-ubicacion-picker.component';
import { ValoracionesService } from '../../../core/services/valoraciones.service';

type AdminSection = 'eventos' | 'usuarios' | 'clientes' | 'entradas' | 'valoraciones';
type AdminView = 'list' | 'form';
type MsgType = 'success' | 'error';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    AdminUsuariosComponent,
    AdminClientesComponent,
    AdminEntradasComponent,
    AdminValoracionesComponent,
    AdminUbicacionPickerComponent,
  ],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss',
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);
  private eventosService = inject(EventosService);
  private comprasService = inject(ComprasService);
  private catalogoService = inject(CatalogoService);
  private clientesService = inject(ClientesAdminService);
  private usuariosService = inject(UsuariosAdminService);
  private valoracionesService = inject(ValoracionesService);
  private auth = inject(AuthService);
  private router = inject(Router);

  @ViewChild(AdminUsuariosComponent) adminUsuarios?: AdminUsuariosComponent;

  section: AdminSection = 'eventos';
  eventos: Evento[] = [];
  categorias: Categoria[] = [];
  clientesList: Cliente[] = [];
  usuariosCount = 0;
  valoracionesPendientesCount = 0;
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
  compactNav = false;
  cierreEvento: Evento | null = null;
  private readonly onResize = () => this.updateCompactNav();
  cierreLoading = false;
  cierreData: CierreCajaReport | null = null;
  private msgTimer?: ReturnType<typeof setTimeout>;

  form = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: [''],
    idCategoria: ['', Validators.required],
    direccion: ['', [Validators.required, Validators.minLength(3)]],
    localidad: ['', [Validators.required, Validators.minLength(2)]],
    provincia: ['Almería', [Validators.required, Validators.minLength(2)]],
    latitud: ['' as string | number],
    longitud: ['' as string | number],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    horaInicio: [''],
    horaFin: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    imagenUrl: [''],
    destacado: [false],
    soloMayoresEdad: [false],
    idCliente: ['1', Validators.required],
  });

  readonly user = this.auth.currentUser;

  ngOnInit() {
    this.updateCompactNav();
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('resize', this.onResize);
    }
    this.load();
    this.form.get('fechaInicio')?.valueChanges.subscribe((ini) => {
      if (!ini) return;
      const fin = this.form.get('fechaFin')?.value;
      if (!fin || fin < ini) {
        this.form.patchValue({ fechaFin: ini }, { emitEvent: false });
      }
    });
    this.catalogoService.getCategorias().subscribe((c) => (this.categorias = c));
    this.clientesService.getAll().subscribe({
      next: (list) => (this.clientesList = list),
      error: () => {},
    });
    this.refreshUsuariosCount();
    this.refreshValoracionesPendientesCount();
  }

  refreshValoracionesPendientesCount() {
    this.valoracionesService.getPendientesAdmin().subscribe({
      next: (list) => (this.valoracionesPendientesCount = list.length),
      error: () => {},
    });
  }

  refreshUsuariosCount() {
    this.usuariosService.getAll().subscribe({
      next: (list) => (this.usuariosCount = list.length),
      error: () => {},
    });
  }

  get filteredEventos(): Evento[] {
    const q = this.search.trim().toLowerCase();
    return this.eventos.filter((e) => {
      if (this.filterDestacados === 'destacados' && !e.destacado) return false;
      if (this.filterCategoria && String(e.idCategoria) !== this.filterCategoria) return false;
      if (!q) return true;
      const dir = this.getUbicacionTexto(e).toLowerCase();
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

  getUbicacionTexto(evento: Evento): string {
    const u = evento.ubicacion;
    if (!u) return '—';
    const partes = [u.direccion, u.localidad, u.provincia].filter(Boolean);
    return partes.join(', ') || '—';
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

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.onResize);
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  switchSection(section: AdminSection) {
    switch (section) {
      case 'eventos':
        this.selectEventos();
        break;
      case 'entradas':
        this.selectEntradas();
        break;
      case 'clientes':
        this.selectClientes();
        break;
      case 'valoraciones':
        this.selectValoraciones();
        break;
      case 'usuarios':
        this.selectUsuarios();
        break;
    }
  }

  private updateCompactNav() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.compactNav = window.innerWidth <= 1024;
    if (!this.compactNav) {
      this.sidebarOpen = false;
    }
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

  selectClientes() {
    this.section = 'clientes';
    this.closeSidebar();
    this.closeForm();
  }

  selectEntradas() {
    this.section = 'entradas';
    this.closeSidebar();
    this.closeForm();
  }

  selectValoraciones() {
    this.section = 'valoraciones';
    this.closeSidebar();
    this.closeForm();
    this.refreshValoracionesPendientesCount();
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
    if (this.section === 'clientes') {
      return 'Organizadores (clientes)';
    }
    if (this.section === 'entradas') {
      return 'Entradas vendidas';
    }
    if (this.section === 'valoraciones') {
      return 'Moderar valoraciones';
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
    if (this.section === 'clientes') {
      return 'Empresas y locales que organizan eventos; se asignan al crear cada festival';
    }
    if (this.section === 'entradas') {
      return 'Consulta titular por entrada, reasigna o elimina (devuelve stock)';
    }
    if (this.section === 'valoraciones') {
      return 'Aprueba o rechaza opiniones de asistentes verificados';
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
      direccion: evento.ubicacion?.direccion ?? '',
      localidad: evento.ubicacion?.localidad ?? '',
      provincia: evento.ubicacion?.provincia ?? 'Almería',
      latitud: evento.ubicacion?.latitud ?? '',
      longitud: evento.ubicacion?.longitud ?? '',
      fechaInicio: evento.fechaInicio,
      fechaFin: evento.fechaFin || evento.fechaInicio,
      horaInicio: evento.horaInicio || '',
      horaFin: evento.horaFin || '',
      precio: evento.precio,
      stock: evento.stock,
      imagenUrl: img,
      destacado: evento.destacado ?? false,
      soloMayoresEdad: evento.soloMayoresEdad ?? false,
      idCliente: String(evento.idCliente ?? 1),
    });
  }

  cancelEdit() {
    this.editingId = null;
    this.form.reset({
      precio: 0,
      stock: 0,
      destacado: false,
      soloMayoresEdad: false,
      provincia: 'Almería',
      idCliente: '1',
    });
  }

  private parseCoord(v: string | number | null | undefined): number | undefined {
    if (v === '' || v == null) return undefined;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify('Revisa los campos obligatorios del formulario', 'error');
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.fechaFin! < raw.fechaInicio!) {
      this.notify('La fecha de fin no puede ser anterior a la de inicio', 'error');
      return;
    }
    const data = {
      titulo: raw.titulo!,
      descripcion: raw.descripcion || undefined,
      idCategoria: +raw.idCategoria!,
      direccion: raw.direccion!.trim(),
      localidad: raw.localidad!.trim(),
      provincia: raw.provincia?.trim() || 'Almería',
      latitud: this.parseCoord(raw.latitud),
      longitud: this.parseCoord(raw.longitud),
      fechaInicio: raw.fechaInicio!,
      fechaFin: raw.fechaFin!,
      horaInicio: raw.horaInicio || undefined,
      horaFin: raw.horaFin || undefined,
      precio: +raw.precio!,
      stock: +raw.stock!,
      imagenUrl: raw.imagenUrl || undefined,
      destacado: !!raw.destacado,
      soloMayoresEdad: !!raw.soloMayoresEdad,
      idCliente: +raw.idCliente!,
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

  verCierreCaja(evento: Evento, ev?: Event) {
    ev?.stopPropagation();
    this.cierreEvento = evento;
    this.cierreData = null;
    this.cierreLoading = true;
    this.comprasService.getCierreCaja(evento.id).subscribe({
      next: (data) => {
        this.cierreData = data;
        this.cierreLoading = false;
      },
      error: (err) => {
        this.cierreLoading = false;
        this.notify(err.error?.message || 'No se pudo calcular el cierre de caja', 'error');
        this.cierreEvento = null;
      },
    });
  }

  cerrarCierreCaja() {
    this.cierreEvento = null;
    this.cierreData = null;
    this.cierreLoading = false;
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
