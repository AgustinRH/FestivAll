import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'verificar-email', loadComponent: () => import('./pages/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent) },
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'sobre-nosotros',
    loadComponent: () => import('./pages/sobre-nosotros/sobre-nosotros.component').then(m => m.SobreNosotrosComponent),
  },
  {
    path: 'terminos-y-condiciones',
    loadComponent: () =>
      import('./pages/legal/terminos-y-condiciones/terminos-y-condiciones.component').then(
        (m) => m.TerminosYCondicionesComponent,
      ),
  },
  {
    path: 'privacidad',
    loadComponent: () =>
      import('./pages/legal/politica-privacidad/politica-privacidad.component').then(
        (m) => m.PoliticaPrivacidadComponent,
      ),
  },
  {
    path: 'politica-privacidad',
    redirectTo: 'privacidad',
    pathMatch: 'full',
  },
  {
    path: 'aviso-legal',
    loadComponent: () =>
      import('./pages/legal/aviso-legal/aviso-legal.component').then((m) => m.AvisoLegalComponent),
  },
  {
    path: 'eventos',
    loadComponent: () => import('./pages/eventos/eventos-list/eventos-list.component').then(m => m.EventosListComponent),
  },
  {
    path: 'eventos/:id',
    loadComponent: () => import('./pages/eventos/evento-detail/evento-detail.component').then(m => m.EventoDetailComponent),
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/perfil/perfil.component').then(m => m.PerfilComponent),
  },
  {
    path: 'compras/exito',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/compras/compra-exito/compra-exito.component').then(m => m.CompraExitoComponent),
  },
  {
    path: 'festivall-admin',
    loadComponent: () => import('./pages/admin/admin-login/admin-login.component').then(m => m.AdminLoginComponent),
  },
  {
    path: 'festivall-admin/panel',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent),
  },
  { path: '**', redirectTo: '' },
];
