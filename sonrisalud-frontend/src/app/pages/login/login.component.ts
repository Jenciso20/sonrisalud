import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  // Si quieres ocultar el registro y mostrar solo login, deja esto en false
  allowRegister = true;
  isLogin = true;
  // Define window.__sonriSaludInstitutionDomain = '@unajma.edu.pe' para forzar dominio; si es null, permite cualquier correo.
  requiredDomain: string | null = (window as any).__sonriSaludInstitutionDomain || null;

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

  showModal = false;
  recoverEmail = '';
  recoverMessage = '';
  isSubmitting = false;
  isRecovering = false;
  private returnUrl = '/menu';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/menu';
    // Permitir registro desde la misma pantalla
    this.allowRegister = true;
    this.isLogin = true;

    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  goRegister(): void {
    if (!this.allowRegister) return;
    this.resetAlerts();
    this.isLogin = false;
  }

  goLogin(): void {
    this.resetAlerts();
    this.isLogin = true;
  }

  onLogin() {
    this.resetAlerts();
    this.isSubmitting = true;

    const payload = { correo: this.correo, password: this.password };
    this.authService.login(payload).subscribe({
      next: (res: any) => {
        this.successMsg = res.mensaje || 'Inicio de sesion exitoso.';
        if (res.token) {
          this.authService.setToken(res.token);
          // Redirigir segun rol
          const role = this.authService.getRole();
          const dest = role === 'admin'
            ? '/administrador'
            : role === 'odontologo'
            ? '/odontologos'
            : this.returnUrl || '/menu';
          this.router.navigate([dest]);
        }
        this.isSubmitting = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.mensaje || 'Error al iniciar sesion.';
        this.isSubmitting = false;
      },
      complete: () => {}
    });
  }

  onRegister() {
    this.resetAlerts();

    const correoLower = (this.correo || '').toLowerCase();
    if (this.requiredDomain && !correoLower.endsWith(this.requiredDomain)) {
      this.errorMsg = `Usa tu correo institucional ${this.requiredDomain}`;
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Las contrasenas no coinciden.';
      return;
    }

    this.isSubmitting = true;
    const payload = {
      nombre: (this.nombre || '').trim(),
      apellidos: (this.apellidos || '').trim() || undefined,
      correo: this.correo,
      password: this.password,
      telefono: this.telefono || undefined,
      dni: this.dni || undefined,
      codigoUniversitario: this.codigoUniversitario || undefined
    };

    this.authService.register(payload).subscribe({
      next: (res: any) => {
        this.successMsg = res.mensaje || 'Cuenta creada correctamente. Ahora puedes iniciar sesion.';
        this.isLogin = true;
        this.clearForm();
        this.isSubmitting = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.mensaje || 'Error al crear la cuenta.';
        this.isSubmitting = false;
      },
      complete: () => {}
    });
  }

  clearForm() {
    this.nombre = '';
    this.apellidos = '';
    this.correo = '';
    this.telefono = '';
    this.dni = '';
    this.codigoUniversitario = '';
    this.password = '';
    this.confirmPassword = '';
  }

  resetAlerts() {
    this.errorMsg = '';
    this.successMsg = '';
  }

  openRecoveryModal() {
    this.resetAlerts();
    this.showModal = true;
    this.recoverMessage = '';
  }

  closeModal() {
    this.showModal = false;
    this.recoverEmail = '';
    this.recoverMessage = '';
    this.isRecovering = false;
  }

  sendRecovery() {
    this.recoverMessage = '';

    if (!this.recoverEmail) {
      this.recoverMessage = 'Por favor ingresa tu correo.';
      return;
    }

    this.isRecovering = true;
    this.authService.recoverPassword(this.recoverEmail).subscribe({
      next: (res: any) => {
        this.recoverMessage = res.mensaje || 'Si el correo existe recibiras un mensaje con instrucciones.';
        this.isRecovering = false;
      },
      error: (err) => {
        this.recoverMessage = err?.error?.mensaje || 'No se pudo enviar el correo de recuperacion.';
        this.isRecovering = false;
      },
      complete: () => {}
    });
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    this.openRecoveryModal();
  }
}
