import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-legal-primera-capa',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal-primera-capa.component.html',
  styleUrl: './legal-primera-capa.component.scss',
})
export class LegalPrimeraCapaComponent {
  /** `compra`: modal de entradas; `registro`: alta de cuenta */
  contexto = input<'compra' | 'registro'>('compra');
}
