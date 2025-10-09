import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { OdontologosService } from '../../services/odontologos.service';

interface SlotDisponible { inicio: string; fin: string; etiqueta: string; }

@Component({
  selector: 'app-administrador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './administrador.component.html',
  styleUrls: ['./administrador.component.css']
})
export class AdministradorComponent implements OnInit {
  pacientes: any[] = [];
  odontologos: any[] = [];
  citas: any[] = [];
  usuarios: any[] = [];

  filtroPacienteId: number | null = null;
  filtroOdontologoId: number | null = null;
  filtroDesde = '';
  filtroHasta = '';
  filtroEstado = '';

  pacienteId: number | null = null;
  odontologoId: number | null = null;
  fecha = '';
  motivo = '';
  slots: SlotDisponible[] = [];
  slotSel: SlotDisponible | null = null;
  duracion = 0;

  loading = false;
  buscando = false;
  creando = false;
  error = '';
  ok = '';

  constructor(
    private adminService: AdminService,
    private odontologosService: OdontologosService
  ) {}

  ngOnInit(): void {
    this.cargarCat();
    this.buscarCitas();
  }

  cargarCat(): void {
    this.adminService.listarPacientes().subscribe({
      next: (p) => (this.pacientes = p || []),
    });
    this.odontologosService.obtenerOdontologos().subscribe({
      next: (o) => (this.odontologos = o || []),
    });
    this.adminService.listarUsuarios().subscribe({
      next: (u) => (this.usuarios = u || []),
    });
  }

  refrescarPacientes(): void {
    this.adminService.listarPacientes().subscribe({
      next: (p) => (this.pacientes = p || []),
      error: () => (this.error = 'No se pudo refrescar pacientes'),
    });
  }

  refrescarOdontologos(): void {
    this.odontologosService.obtenerOdontologos().subscribe({
      next: (o) => (this.odontologos = o || []),
      error: () => (this.error = 'No se pudo refrescar odontologos'),
    });
  }

  buscarCitas(): void {
    this.loading = true;
    this.error = '';
    this.ok = '';
    this.adminService
      .listarCitas({
        pacienteId: this.filtroPacienteId,
        odontologoId: this.filtroOdontologoId,
        desde: this.filtroDesde || null,
        hasta: this.filtroHasta || null,
        estado: this.filtroEstado || null,
      })
      .subscribe({
        next: (c) => {
          this.citas = Array.isArray(c) ? c : [];
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.mensaje || 'Error al listar citas';
          this.loading = false;
        },
      });
  }

  limpiarDisponibilidad(): void {
    this.slots = [];
    this.slotSel = null;
    this.duracion = 0;
  }

  verDisponibilidad(): void {
    if (!this.odontologoId || !this.fecha) {
      this.error = 'Selecciona odontologo y fecha';
      return;
    }
    this.error = '';
    this.ok = '';
    this.buscando = true;
    this.adminService
      .obtenerDisponibilidad(this.odontologoId, this.fecha)
      .subscribe({
        next: (r) => {
          this.slots = r?.slots || [];
          this.duracion = r?.duracion || 30;
          if (!this.slots.length) this.error = 'Sin horarios para la fecha elegida';
          this.buscando = false;
        },
        error: (err) => {
          this.error = err?.error?.mensaje || 'No se pudo obtener disponibilidad';
          this.buscando = false;
        },
      });
  }

  seleccionarSlot(s: SlotDisponible): void {
    this.slotSel = s;
    this.ok = '';
    this.error = '';
  }

  crearCita(): void {
    if (!this.pacienteId || !this.odontologoId || !this.slotSel) {
      this.error = 'Completa paciente, odontologo y horario';
      return;
    }
    this.creando = true;
    this.adminService
      .crearCita({
        pacienteId: this.pacienteId,
        odontologoId: this.odontologoId,
        inicio: this.slotSel.inicio,
        motivo: this.motivo || undefined,
      })
      .subscribe({
        next: () => {
          this.ok = 'Cita creada correctamente';
          this.creando = false;
          this.motivo = '';
          this.limpiarDisponibilidad();
          this.buscarCitas();
        },
        error: (err) => {
          this.error = err?.error?.mensaje || 'No se pudo crear la cita';
          this.creando = false;
        },
      });
  }

  cancelar(id: number): void {
    if (!confirm('Cancelar esta cita?')) return;
    this.adminService.cancelarCita(id).subscribe({
      next: () => {
        this.ok = 'Cita cancelada';
        this.buscarCitas();
      },
      error: (err) => (this.error = err?.error?.mensaje || 'Error al cancelar'),
    });
  }

  actualizar(id: number, estado: string, motivo: string): void {
    this.adminService.actualizarCita(id, { estado, motivo }).subscribe({
      next: () => {
        this.ok = 'Cita actualizada';
        this.buscarCitas();
      },
      error: (err) => (this.error = err?.error?.mensaje || 'Error al actualizar'),
    });
  }

  // Gestion de pacientes
  guardarPaciente(p: any): void {
    const payload = {
      nombre: p.nombre,
      correo: p.correo,
      telefono: p.telefono,
    };
    this.adminService.actualizarPaciente(p.id, payload).subscribe({
      next: () => (this.ok = 'Paciente actualizado'),
      error: (err) => (this.error = err?.error?.mensaje || 'No se pudo actualizar el paciente'),
    });
  }

  borrarPaciente(p: any): void {
    if (!confirm('Eliminar paciente?')) return;
    this.adminService.eliminarPaciente(p.id).subscribe({
      next: () => {
        this.ok = 'Paciente eliminado';
        this.pacientes = this.pacientes.filter((x) => x.id !== p.id);
      },
      error: (err) => (this.error = err?.error?.mensaje || 'No se pudo eliminar el paciente'),
    });
  }

  // Gestion de odontologos
  guardarOdontologo(o: any): void {
    const payload = {
      nombre: o.nombre,
      correo: o.correo,
      especialidad: o.especialidad,
      telefono: o.telefono,
      duracionConsulta: Number(o.duracionConsulta) || undefined,
      activo: !!o.activo,
    };
    this.adminService.actualizarOdontologo(o.id, payload).subscribe({
      next: () => (this.ok = 'Odontologo actualizado'),
      error: (err) => (this.error = err?.error?.mensaje || 'No se pudo actualizar el odontologo'),
    });
  }

  borrarOdontologo(o: any): void {
    if (!confirm('Eliminar odontologo?')) return;
    this.adminService.eliminarOdontologo(o.id).subscribe({
      next: () => {
        this.ok = 'Odontologo eliminado';
        this.odontologos = this.odontologos.filter((x) => x.id !== o.id);
      },
      error: (err) => (this.error = err?.error?.mensaje || 'No se pudo eliminar el odontologo'),
    });
  }

  // Usuarios: roles
  refrescarUsuarios(): void {
    this.adminService.listarUsuarios().subscribe({
      next: (u) => (this.usuarios = u || []),
      error: () => (this.error = 'No se pudo refrescar usuarios'),
    });
  }

  guardarRol(u: any): void {
    if (!u?.id || !u?.rol) return;
    this.adminService.actualizarRolUsuario(u.id, u.rol).subscribe({
      next: () => (this.ok = 'Rol actualizado'),
      error: (err) => (this.error = err?.error?.mensaje || 'No se pudo actualizar rol'),
    });
  }
}
