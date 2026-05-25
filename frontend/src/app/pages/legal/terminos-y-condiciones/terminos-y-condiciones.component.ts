import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';

@Component({
  selector: 'app-terminos-y-condiciones',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './terminos-y-condiciones.component.html',
  styleUrl: '../_legal-page.scss',
})
export class TerminosYCondicionesComponent {}
