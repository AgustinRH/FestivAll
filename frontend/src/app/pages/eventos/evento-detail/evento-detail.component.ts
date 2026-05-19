import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { EventosService } from '../../../core/services/eventos.service';
import { ComprasService } from '../../../core/services/compras.service';
import { Evento, Compra } from '../../../core/models';

@Component({
  selector: 'app-evento-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, NavbarComponent, CurrencyPipe, DatePipe],
  templateUrl: './evento-detail.component.html',
  styleUrl: './evento-detail.component.scss',
})
export class EventoDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private comprasService = inject(ComprasService);

  evento?: Evento;
  compraExitosa?: Compra;
  error = '';
  loading = false;

  form = this.fb.group({
    cantidad: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.eventosService.getById(id).subscribe((e) => (this.evento = e));
  }

  get imagenUrl(): string {
    const principal = this.evento?.imagenes?.find((i) => i.esPrincipal);
    return principal?.url || this.evento?.imagenes?.[0]?.url || '';
  }

  comprar() {
    if (!this.evento || this.form.invalid) return;
    const cantidad = this.form.get('cantidad')!.value!;
    if (cantidad > this.evento.stock) {
      this.error = 'No hay suficiente stock';
      return;
    }
    this.loading = true;
    this.error = '';
    this.comprasService.comprar(this.evento.id, cantidad).subscribe({
      next: (compra) => {
        this.compraExitosa = compra;
        this.evento!.stock -= cantidad;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al comprar';
        this.loading = false;
      },
    });
  }
}
