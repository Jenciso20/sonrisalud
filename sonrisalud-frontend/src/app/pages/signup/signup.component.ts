import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  nombre = '';
  apellidos = '';
  correo = '';
  telefono = '';
  dni = '';
  codigoUniversitario = '';
  password = '';
  confirmPassword = '';

  errorMsg = '';
  successMsg = '';
  isSubmitting = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.correo.toLowerCase().endsWith('@unajma.edu.pe')) {
      this.errorMsg = 'Usa tu correo institucional @unajma.edu.pe';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Las contrasenas no coinciden.';
      return;
    }

    this.isSubmitting = true;
    const payload = {
      nombre: (this.nombre + ' ' + this.apellidos).trim(),
      correo: this.correo,
      password: this.password,
      telefono: this.telefono || undefined,
      dni: this.dni || undefined,
      codigoUniversitario: this.codigoUniversitario || undefined
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.successMsg = 'Cuenta creada correctamente. Ahora puedes iniciar sesion.';
        setTimeout(() => this.router.navigate(['/']), 1000);
      },
      error: (err) => {
        this.errorMsg = err?.error?.mensaje || 'Error al crear la cuenta.';
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }
}

