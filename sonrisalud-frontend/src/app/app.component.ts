import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { UiStateService } from './services/ui-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'sonrisalud-frontend';
  sidebarCollapsed = false;

  constructor(
    public authService: AuthService,
    public ui: UiStateService,
    private router: Router
  ) {}

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  get profileInitials(): string {
    const user = this.authService.getUser();
    const source = user?.correo || 'PF';
    return source.slice(0, 2).toUpperCase();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['']);
  }
}
