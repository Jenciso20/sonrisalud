import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { MenuComponent } from './pages/menu/menu.component';
import { PacientesComponent } from './pages/pacientes/pacientes.component';
import { OdontologosComponent } from './pages/odontologos/odontologos.component';
import { AdministradorComponent } from './pages/administrador/administrador.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'menu', component: MenuComponent, canActivate: [authGuard] },
  { path: 'pacientes', component: PacientesComponent, canActivate: [authGuard] },
  { path: 'odontologos', component: OdontologosComponent, canActivate: [roleGuard], data: { roles: ['odontologo','admin'] } },
  { path: 'administrador', component: AdministradorComponent, canActivate: [roleGuard], data: { roles: ['admin'] } },
  { path: '**', redirectTo: '' },
];
