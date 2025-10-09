import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CitasService } from '../../services/citas.service';
import { AuthService } from '../../services/auth.service';
import { OdontologosService } from '../../services/odontologos.service';

interface Cita {
  id: number;
  inicio: string;
  fin: string;
  estado: string;
  motivo?: string;
  odontologoId?: number;
  odontologo?: {
    nombre?: string;
    especialidad?: string;
    telefono?: string;
  };
}

interface SlotDisponible {
  inicio: string;
  fin: string;
  etiqueta: string;
}

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, FormsModule],
  templateUrl: './pacientes.component.html',
  styleUrls: ['./pacientes.component.css']
})
export class PacientesComponent implements OnInit {
  citas: Cita[] = [];
  citasProximas: Cita[] = [];
  citasPasadas: Cita[] = [];
  loading = false;
  errorMsg = '';
  successMsg = '';
  cancelando = new Set<number>();

  odontologos: any[] = [];
  especialidades: string[] = [];
  odontologosFiltrados: any[] = [];
  selectedEspecialidad = '';
  selectedOdontologoId: number | null = null;
  selectedFecha = '';
  slotsDisponibles: SlotDisponible[] = [];
  slotSeleccionado: SlotDisponible | null = null;
  motivo = '';
  buscandoSlots = false;
  creandoCita = false;
  duracionSlot = 0;

  // Reprogramacion
  reprogramandoId: number | null = null;
  reFecha = '';
  reSlots: SlotDisponible[] = [];
  reSlotSel: SlotDisponible | null = null;
  reBuscando = false;
  reGuardando = false;

  constructor(
    private citasService: CitasService,
    private authService: AuthService,
    private odontologosService: OdontologosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarOdontologos();
    this.cargarCitas();
  }

  private cargarOdontologos(): void {
    this.odontologosService.obtenerOdontologos().subscribe({
      next: (lista) => {
        this.odontologos = Array.isArray(lista) ? lista : [];
        this.especialidades = Array.from(
          new Set(
            this.odontologos
              .filter((o) => o.especialidad)
              .map((o) => String(o.especialidad))
          )
        ).sort();
        this.odontologosFiltrados = [...this.odontologos];
      },
      error: () => {
        this.errorMsg =
          'No pudimos cargar el listado de odontologos. Intenta nuevamente mas tarde.';
      }
    });
  }

  cargarCitas(): void {
    this.loading = true;
    this.errorMsg = '';

    this.citasService.obtenerCitasPaciente().subscribe({
      next: (citas) => {
        this.citas = Array.isArray(citas) ? citas : [];
        this.loading = false;
        this.separarCitas();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg =
          err?.error?.mensaje ||
          'No pudimos obtener tus citas. Intenta nuevamente mas tarde.';
      }
    });
  }

  private separarCitas(): void {
    const ahora = new Date();
    const futuras: Cita[] = [];
    const historicas: Cita[] = [];

    this.citas.forEach((cita) => {
      const fechaInicio = new Date(cita.inicio);
      if (fechaInicio >= ahora) {
        futuras.push(cita);
      } else {
        historicas.push(cita);
      }
    });

    this.citasProximas = futuras.sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
    );
    this.citasPasadas = historicas.sort(
      (a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime()
    );
  }

  onSeleccionarEspecialidad(): void {
    if (!this.selectedEspecialidad) {
      this.odontologosFiltrados = [...this.odontologos];
    } else {
      this.odontologosFiltrados = this.odontologos.filter(
        (odontologo) => odontologo.especialidad === this.selectedEspecialidad
      );
    }

    this.selectedOdontologoId = null;
    this.limpiarDisponibilidad();
  }

  onSeleccionarOdontologo(): void {
    this.limpiarDisponibilidad();
  }

  onBuscarSlots(): void {
    if (!this.selectedOdontologoId || !this.selectedFecha) {
      this.errorMsg = 'Selecciona odontologo y fecha para ver horarios disponibles.';
      return;
    }

    this.errorMsg = '';
    this.successMsg = '';
    this.buscandoSlots = true;
    this.slotSeleccionado = null;

    this.citasService
      .obtenerDisponibilidad(this.selectedOdontologoId, this.selectedFecha)
      .subscribe({
        next: (respuesta) => {
          this.duracionSlot = respuesta?.duracion || 30;
          this.slotsDisponibles = Array.isArray(respuesta?.slots)
            ? respuesta.slots
            : [];

          if (!this.slotsDisponibles.length) {
            this.errorMsg =
              'No hay horarios disponibles para la fecha seleccionada. Intenta con otro dia.';
          }
          this.buscandoSlots = false;
        },
        error: (err) => {
          this.errorMsg =
            err?.error?.mensaje || 'No se pudo obtener la disponibilidad.';
          this.slotsDisponibles = [];
          this.buscandoSlots = false;
        }
      });
  }

  onSeleccionarSlot(slot: SlotDisponible): void {
    this.slotSeleccionado = slot;
    this.successMsg = '';
    this.errorMsg = '';
  }

  onReservar(): void {
    if (!this.selectedOdontologoId || !this.slotSeleccionado) {
      this.errorMsg = 'Selecciona un horario disponible antes de reservar.';
      return;
    }

    this.creandoCita = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.citasService
      .crearCita({
        odontologoId: this.selectedOdontologoId,
        inicio: this.slotSeleccionado.inicio,
        motivo: this.motivo || undefined
      })
      .subscribe({
        next: () => {
          this.successMsg = 'Tu cita fue reservada correctamente.';
          this.motivo = '';
          this.limpiarDisponibilidad();
          this.cargarCitas();
        },
        error: (err) => {
          this.errorMsg =
            err?.error?.mensaje || 'No se pudo reservar la cita. Intenta nuevamente.';
          this.creandoCita = false;
        },
        complete: () => {
          this.creandoCita = false;
        }
      });
  }

  limpiarDisponibilidad(): void {
    this.slotsDisponibles = [];
    this.slotSeleccionado = null;
    this.duracionSlot = 0;
    this.buscandoSlots = false;
  }

  onCancelar(citaId: number): void {
    if (this.cancelando.has(citaId)) {
      return;
    }

    const confirmar = window.confirm('Seguro que deseas cancelar esta cita?');
    if (!confirmar) {
      return;
    }

    this.cancelando.add(citaId);
    this.citasService.cancelarCita(citaId).subscribe({
      next: () => {
        this.successMsg = 'La cita fue cancelada correctamente.';
        this.cargarCitas();
      },
      error: (err) => {
        this.errorMsg =
          err?.error?.mensaje || 'No se pudo cancelar la cita. Intenta nuevamente.';
        this.cancelando.delete(citaId);
      },
      complete: () => {
        this.cancelando.delete(citaId);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['']);
  }

  obtenerEtiquetaOdontologo(odontologo: any): string {
    const nombre = odontologo?.nombre || 'Odontologo';
    const especialidad = odontologo?.especialidad ? ` - ${odontologo.especialidad}` : '';
    return `${nombre}${especialidad}`;
  }

  // Reprogramar
  abrirReprogramar(cita: Cita): void {
    this.reprogramandoId = cita.id;
    this.reFecha = '';
    this.reSlots = [];
    this.reSlotSel = null;
    this.okAndErrorReset();
  }

  cerrarReprogramar(): void {
    this.reprogramandoId = null;
    this.reFecha = '';
    this.reSlots = [];
    this.reSlotSel = null;
  }

  buscarReSlots(cita: Cita): void {
    if (!this.reFecha) {
      this.errorMsg = 'Selecciona una fecha para ver horarios disponibles.';
      return;
    }
    this.errorMsg = '';
    this.successMsg = '';
    this.reBuscando = true;
    this.reSlotSel = null;
    const odontologoId = (cita.odontologoId as number | undefined) || (cita.odontologo as any)?.id;
    this.citasService.obtenerDisponibilidad(odontologoId, this.reFecha).subscribe({
      next: (r) => {
        this.reSlots = r?.slots || [];
        this.duracionSlot = r?.duracion || 30;
        if (!this.reSlots.length) this.errorMsg = 'Sin horarios para ese dia.';
        this.reBuscando = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.mensaje || 'No se pudo obtener disponibilidad.';
        this.reBuscando = false;
      }
    });
  }

  seleccionarReSlot(s: SlotDisponible): void {
    this.reSlotSel = s;
  }

  confirmarReprogramar(cita: Cita): void {
    if (!this.reprogramandoId || !this.reSlotSel) {
      this.errorMsg = 'Selecciona un horario disponible.';
      return;
    }
    this.reGuardando = true;
    this.citasService.reprogramarCita(this.reprogramandoId, this.reSlotSel.inicio).subscribe({
      next: () => {
        this.successMsg = 'Cita reprogramada correctamente.';
        this.cerrarReprogramar();
        this.cargarCitas();
        this.reGuardando = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.mensaje || 'No se pudo reprogramar la cita.';
        this.reGuardando = false;
      }
    });
  }

  private okAndErrorReset(): void {
    this.errorMsg = '';
    this.successMsg = '';
  }
}
