import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { OdontologosService } from '../../services/odontologos.service';
import { CitasService } from '../../services/citas.service';

type Rol = 'admin' | 'odontologo' | 'paciente';

@Component({
  selector: 'app-filtros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filtros.component.html',
  styleUrls: ['./filtros.component.css']
})
export class FiltrosComponent implements OnInit {
  rol: Rol = 'paciente';
  estados = ['pendiente', 'confirmada', 'atendida', 'cancelada'];
  odontologos: any[] = [];
  pacientes: any[] = [];

  filtroEstado: string | null = null;
  filtroPacienteId: number | null = null;
  filtroOdontologoId: number | null = null;
  filtroDesde = '';
  filtroHasta = '';

  resultados: any[] = [];
  cargando = false;
  error = '';

  constructor(
    private auth: AuthService,
    private adminService: AdminService,
    private odService: OdontologosService,
    private citasService: CitasService,
  ) {}

  ngOnInit(): void {
    this.rol = (this.auth.getRole?.() as Rol) || 'paciente';
    this.cargarListas();
    this.buscar();
  }

  cargarListas(): void {
    if (this.rol === 'admin') {
      this.adminService.listarPacientes().subscribe({
        next: (p) => (this.pacientes = p || []),
        error: () => {},
      });
      this.odService.obtenerOdontologos().subscribe({
        next: (o) => (this.odontologos = o || []),
        error: () => {},
      });
    } else if (this.rol === 'odontologo') {
      this.odService.obtenerOdontologos().subscribe({
        next: (o) => (this.odontologos = o || []),
        error: () => {},
      });
    }
  }

  todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  reset(): void {
    this.filtroEstado = null;
    this.filtroPacienteId = null;
    this.filtroOdontologoId = null;
    this.filtroDesde = '';
    this.filtroHasta = '';
    this.buscar();
  }

  buscar(): void {
    this.error = '';
    this.cargando = true;

    if (this.rol === 'admin') {
      this.adminService.listarCitas({
        estado: this.filtroEstado,
        pacienteId: this.filtroPacienteId,
        odontologoId: this.filtroOdontologoId,
        desde: this.filtroDesde || null,
        hasta: this.filtroHasta || null,
      }).subscribe({
        next: (res) => { this.resultados = res || []; this.cargando = false; },
        error: (err) => { this.error = err?.error?.mensaje || 'Error al buscar'; this.cargando = false; },
      });
      return;
    }

    if (this.rol === 'odontologo') {
      const base = this.filtroDesde || this.todayISO();
      const { desde, hasta } = this.rangoSemana(base);
      this.odService.agenda(this.filtroOdontologoId || this.obtenerOdPropio(), desde, hasta, {
        estado: this.filtroEstado || undefined,
        pacienteId: this.filtroPacienteId || undefined,
      }).subscribe({
        next: (res) => { this.resultados = res || []; this.cargando = false; },
        error: (err) => { this.error = err?.error?.mensaje || 'Error al buscar'; this.cargando = false; },
      });
      return;
    }

    // Paciente
    const desde = this.filtroDesde || undefined;
    const hasta = this.filtroHasta || undefined;
    const obs = (desde && hasta)
      ? this.citasService.obtenerCitasPacienteRango(desde, hasta)
      : this.citasService.obtenerCitasPaciente();
    obs.subscribe({
      next: (res) => {
        let data = res || [];
        if (this.filtroEstado) {
          data = data.filter((c: any) => (c.estado || '').toLowerCase() === this.filtroEstado);
        }
        this.resultados = data;
        this.cargando = false;
      },
      error: (err) => { this.error = err?.error?.mensaje || 'Error al buscar'; this.cargando = false; },
    });
  }

  rangoSemana(d: string): { desde: string; hasta: string } {
    const date = new Date(d + 'T00:00:00');
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const start = new Date(date);
    start.setDate(date.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { desde: start.toISOString(), hasta: end.toISOString() };
  }

  obtenerOdPropio(): number {
    const correo = this.auth.getUser()?.correo;
    const od = correo ? this.odontologos.find(o => o?.correo === correo) : null;
    return od?.id || this.odontologos[0]?.id;
  }
}
