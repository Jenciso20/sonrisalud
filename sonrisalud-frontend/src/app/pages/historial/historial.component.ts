import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { OdontologosService } from '../../services/odontologos.service';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.css'],
})
export class HistorialComponent implements OnInit {
  registros: any[] = [];
  loading = false;
  error = '';
  role: string | null = null;

  constructor(
    private auth: AuthService,
    private odService: OdontologosService,
    private adminService: AdminService,
  ) {}

  ngOnInit(): void {
    this.role = (this.auth.getRole?.() || '').toLowerCase() || null;
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = '';
    const role = (this.role || this.auth.getRole() || '').toLowerCase();

    if (role === 'admin') {
      this.adminService.listarCitas({
        pacienteId: null,
        odontologoId: null,
        estado: null,
        desde: null,
        hasta: null,
      }).subscribe({
        next: (c) => { this.registros = Array.isArray(c) ? c : []; this.loading = false; },
        error: (err) => {
          // Si falla como admin, mostramos el mensaje y no dejamos la pantalla vacía
          this.error = err?.error?.mensaje || 'Error al obtener historial (admin)';
          this.registros = [];
          this.loading = false;
        },
      });
      return;
    }

    // Odontologo: historial propio
    this.odService.historialPropio(100).subscribe({
      next: (h) => { this.registros = Array.isArray(h) ? h : []; this.loading = false; },
      error: (err) => { this.error = err?.error?.mensaje || 'Error al obtener historial'; this.loading = false; },
    });
  }
}
