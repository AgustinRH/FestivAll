import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DevDisclaimerComponent } from './shared/dev-disclaimer/dev-disclaimer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DevDisclaimerComponent],
  template: `
    <app-dev-disclaimer />
    <router-outlet />
  `,
})
export class AppComponent {}
