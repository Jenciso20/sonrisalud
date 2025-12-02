import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  usuario: any = {};
  loading = false;
  saving = false;
  error = '';
  ok = '';

  // Password change
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = '';
    this.auth.getProfile().subscribe({
      next: (u) => { this.usuario = u || {}; this.loading = false; },
      error: (err) => { this.error = err?.error?.mensaje || 'No se pudo cargar tu perfil'; this.loading = false; }
    });
  }

  guardar(): void {
    this.error = '';
    this.ok = '';
    this.saving = true;
    const payload: any = {
      nombre: (this.usuario.nombre || '').trim(),
      apellidos: (this.usuario.apellidos || '').trim(),
      telefono: this.usuario.telefono || undefined,
      dni: this.usuario.dni || undefined,
      codigoUniversitario: this.usuario.codigoUniversitario || undefined,
    };
    if (this.newPassword || this.confirmPassword || this.currentPassword) {
      if (this.newPassword !== this.confirmPassword) {
        this.error = 'Las contraseñas no coinciden';
        this.saving = false;
        return;
      }
      payload.currentPassword = this.currentPassword;
      payload.newPassword = this.newPassword;
    }

    this.auth.updateProfile(payload).subscribe({
      next: (res) => {
        this.ok = res?.mensaje || 'Perfil actualizado';
        this.saving = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.cargar();
      },
      error: (err) => {
        this.error = err?.error?.mensaje || 'No se pudo actualizar el perfil';
        this.saving = false;
      }
    });
  }
}
