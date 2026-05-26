import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientesAdminService } from '../../../core/services/clientes-admin.service';
import { Cliente } from '../../../core/models';

type View = 'list' | 'form';

@Component({
  selector: 'app-admin-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-clientes.component.html',
  styleUrl: './admin-clientes.component.scss',
})
export class AdminClientesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clientesService = inject(ClientesAdminService);

  clientes: Cliente[] = [];
  view: View = 'list';
  editingId: number | null = null;
  loading = false;
  saving = false;
  search = '';
  msg = '';

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    nombreFiscal: [''],
    cif: [''],
    emailContacto: [''],
    telefono: [''],
    notas: [''],
    activo: [true],
  });

  ngOnInit() {
    this.load();
  }

  get filtered(): Cliente[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.clientes;
    return this.clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.emailContacto && c.emailContacto.toLowerCase().includes(q)) ||
        (c.cif && c.cif.toLowerCase().includes(q)),
    );
  }

  load() {
    this.loading = true;
    this.clientesService.getAll().subscribe({
      next: (list) => {
        this.clientes = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.msg = 'No se pudieron cargar los organizadores';
      },
    });
  }

  openCreate() {
    this.editingId = null;
    this.form.reset({ nombre: '', nombreFiscal: '', cif: '', emailContacto: '', telefono: '', notas: '', activo: true });
    this.view = 'form';
    this.msg = '';
  }

  openEdit(c: Cliente) {
    this.editingId = c.id;
    this.form.patchValue({
      nombre: c.nombre,
      nombreFiscal: c.nombreFiscal || '',
      cif: c.cif || '',
      emailContacto: c.emailContacto || '',
      telefono: c.telefono || '',
      notas: c.notas || '',
      activo: c.activo,
    });
    this.view = 'form';
    this.msg = '';
  }

  closeForm() {
    this.view = 'list';
    this.editingId = null;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      nombre: v.nombre!.trim(),
      nombreFiscal: v.nombreFiscal?.trim() || undefined,
      cif: v.cif?.trim() || undefined,
      emailContacto: v.emailContacto?.trim() || undefined,
      telefono: v.telefono?.trim() || undefined,
      notas: v.notas?.trim() || undefined,
      activo: !!v.activo,
    };
    this.saving = true;
    const req = this.editingId
      ? this.clientesService.update(this.editingId, body)
      : this.clientesService.create(body);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.msg = this.editingId ? 'Organizador actualizado' : 'Organizador creado';
        this.closeForm();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.msg = err.error?.message || 'Error al guardar';
      },
    });
  }

  remove(c: Cliente, ev?: Event) {
    ev?.stopPropagation();
    if (c.id === 1) {
      alert('No se puede eliminar el organizador por defecto del sistema.');
      return;
    }
    if (!confirm(`¿Eliminar «${c.nombre}»? Solo si no tiene eventos asociados.`)) return;
    this.clientesService.delete(c.id).subscribe({
      next: () => {
        this.msg = 'Eliminado';
        this.load();
      },
      error: (err) => alert(err.error?.message || 'No se pudo eliminar'),
    });
  }
}
