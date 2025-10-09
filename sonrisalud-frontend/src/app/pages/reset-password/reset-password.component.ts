import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  nuevaPassword = '';
  confirmPassword = '';
  message = '';
  isSubmitting = false;
  isTokenMissing = false;

  constructor(private route: ActivatedRoute, private authService: AuthService) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.isTokenMissing = true;
      this.message = 'El enlace de recuperacion no es valido o ya fue utilizado.';
    }
  }

  onSubmit() {
    if (this.isTokenMissing) {
      return;
    }

    if (this.nuevaPassword !== this.confirmPassword) {
      this.message = 'Las contrasenas no coinciden.';
      return;
    }

    if (!this.nuevaPassword) {
      this.message = 'Ingresa una nueva contrasena.';
      return;
    }

    this.isSubmitting = true;
    this.message = '';

    this.authService.resetPassword(this.token, this.nuevaPassword).subscribe({
      next: (res: any) => {
        this.message = res.mensaje || 'Contrasena actualizada correctamente.';
      },
      error: (err) => {
        this.message = err?.error?.mensaje || 'Error al actualizar la contrasena.';
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }
}
