import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosAdminService } from '../../../core/services/usuarios-admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminUser } from '../../../core/models';
import {
  PASSWORD_REQUIREMENTS_HINT,
  strongPasswordValidator,
} from '../../../core/validators/password.validators';

type UserView = 'list' | 'form';
type MsgType = 'success' | 'error';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-usuarios.component.html',
  styleUrl: './admin-usuarios.component.scss',
})
export class AdminUsuariosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usuariosService = inject(UsuariosAdminService);
  private auth = inject(AuthService);

  usuarios: AdminUser[] = [];
  editingId: number | null = null;
  view: UserView = 'list';
  loading = false;
  saving = false;
  search = '';
  filterRol: '' | 'admin' | 'cliente' = '';
  filterVerificado: 'all' | 'si' | 'no' = 'all';
  msg = '';
  msgType: MsgType = 'success';
  private msgTimer?: ReturnType<typeof setTimeout>;

  readonly passwordHint = PASSWORD_REQUIREMENTS_HINT;
  readonly currentUserId = () => this.auth.currentUser()?.id;

  form = this.fb.group({
    nombre: ['', Validators.required],
    apellidos: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    rol: ['cliente' as 'admin' | 'cliente', Validators.required],
    emailVerificado: [false],
  });

  ngOnInit() {
    this.load();
  }

  get filteredUsuarios(): AdminUser[] {
    const q = this.search.trim().toLowerCase();
    return this.usuarios.filter((u) => {
      if (this.filterRol && u.rol !== this.filterRol) return false;
      if (this.filterVerificado === 'si' && !u.emailVerificado) return false;
      if (this.filterVerificado === 'no' && u.emailVerificado) return false;
      if (!q) return true;
      const full = `${u.nombre} ${u.apellidos}`.toLowerCase();
      return full.includes(q) || u.email.toLowerCase().includes(q);
    });
  }

  get adminCount(): number {
    return this.usuarios.filter((u) => u.rol === 'admin').length;
  }

  get unverifiedCount(): number {
    return this.usuarios.filter((u) => !u.emailVerificado).length;
  }

  load() {
    this.loading = true;
    this.usuariosService.getAll().subscribe({
      next: (list) => {
        this.usuarios = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notify('No se pudieron cargar los usuarios', 'error');
      },
    });
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  openCreate() {
    this.cancelEdit();
    this.form.get('password')?.setValidators([Validators.required, strongPasswordValidator()]);
    this.form.get('password')?.updateValueAndValidity();
    this.view = 'form';
  }

  openEdit(user: AdminUser) {
    this.editingId = user.id;
    this.form.patchValue({
      nombre: user.nombre,
      apellidos: user.apellidos,
      email: user.email,
      password: '',
      rol: user.rol,
      emailVerificado: user.emailVerificado,
    });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.setValidators([strongPasswordValidator()]);
    this.form.get('password')?.updateValueAndValidity();
    this.view = 'form';
  }

  closeForm() {
    this.cancelEdit();
    this.view = 'list';
  }

  cancelEdit() {
    this.editingId = null;
    this.form.reset({ rol: 'cliente', emailVerificado: false });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify('Revisa los campos obligatorios del formulario', 'error');
      return;
    }
    const raw = this.form.getRawValue();
    this.saving = true;

    if (this.editingId) {
      const data: Record<string, unknown> = {
        nombre: raw.nombre!,
        apellidos: raw.apellidos!,
        email: raw.email!,
        rol: raw.rol!,
        emailVerificado: !!raw.emailVerificado,
      };
      if (raw.password?.trim()) {
        data['password'] = raw.password;
      }
      this.usuariosService.update(this.editingId, data).subscribe({
        next: () => this.onSaveSuccess('Usuario actualizado correctamente'),
        error: (err) => this.onSaveError(err),
      });
    } else {
      this.usuariosService
        .create({
          nombre: raw.nombre!,
          apellidos: raw.apellidos!,
          email: raw.email!,
          password: raw.password!,
          rol: raw.rol!,
          emailVerificado: !!raw.emailVerificado,
        })
        .subscribe({
          next: () => this.onSaveSuccess('Usuario creado correctamente'),
          error: (err) => this.onSaveError(err),
        });
    }
  }

  private onSaveSuccess(text: string) {
    this.saving = false;
    this.notify(text);
    this.closeForm();
    this.load();
  }

  private onSaveError(err: { error?: { message?: string | string[] } }) {
    this.saving = false;
    const m = err.error?.message;
    const text = Array.isArray(m) ? m.join('. ') : m || 'Error al guardar el usuario';
    this.notify(text, 'error');
  }

  delete(user: AdminUser, ev?: Event) {
    ev?.stopPropagation();
    const label = `${user.nombre} ${user.apellidos}`;
    if (!confirm(`¿Eliminar a «${label}»? Esta acción no se puede deshacer.`)) return;
    this.usuariosService.delete(user.id).subscribe({
      next: () => {
        this.notify('Usuario eliminado');
        if (this.editingId === user.id) this.closeForm();
        this.load();
      },
      error: (err) => this.notify(err.error?.message || 'Error al eliminar', 'error'),
    });
  }

  clearFilters() {
    this.search = '';
    this.filterRol = '';
    this.filterVerificado = 'all';
  }

  isSelf(user: AdminUser): boolean {
    return user.id === this.currentUserId();
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

  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }
}
