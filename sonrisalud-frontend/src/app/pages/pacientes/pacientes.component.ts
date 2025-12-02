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
  selectedOdontologoId: number | null = null;
  selectedFecha = '';
  slotsDisponibles: SlotDisponible[] = [];
  slotsOcupados: Array<{ inicio: string; fin: string; estado: string; paciente?: any }> = [];
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

  // Calendario paciente
  viewMode: 'week' | 'list' = 'week';
  weekStart = this.getWeekStart(new Date());
  dayStartMinutes = 8 * 60;
  dayEndMinutes = 20 * 60;
  pxPerMinute = 1; // 720px por dia

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
      error: (err: any) => {
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
          // cargar ocupadas en paralelo
          this.citasService
            .ocupadas(this.selectedOdontologoId!, this.selectedFecha!)
            .subscribe({ next: (r) => (this.slotsOcupados = r || []), error: () => (this.slotsOcupados = []) });
        },
        error: (err: any) => {
          this.errorMsg =
            err?.error?.mensaje || 'No se pudo obtener la disponibilidad.';
          this.slotsDisponibles = [];
          this.slotsOcupados = [];
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
        error: (err: any) => {
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
      error: (err: any) => {
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

  // Navegacion semana
  prevWeek(): void {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() - 7);
    this.weekStart = this.getWeekStart(d);
  }

  todayWeek(): void {
    this.weekStart = this.getWeekStart(new Date());
  }

  nextWeek(): void {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() + 7);
    this.weekStart = this.getWeekStart(d);
  }

  // Semana actual mostrada en el calendario (lun-dom)
  get weekDays(): { label: string; iso: string; date: Date }[] {
    const days: { label: string; iso: string; date: Date }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      const iso = this.formatIsoDate(d);
      const label = d.toLocaleDateString(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
      });
      days.push({ label, iso, date: d });
    }
    return days;
  }

  // Eventos para un dia especifico del calendario
  eventsForDay(iso: string): Array<{ cita: Cita; title: string; top: number; height: number; estadoClass: string }> {
    const startMinutes = this.dayStartMinutes;
    const endMinutes = this.dayEndMinutes;
    const pxPerMin = this.pxPerMinute || 1;

    const events = (this.citas || []).filter((c) => {
      const d = new Date(c.inicio);
      return this.formatIsoDate(d) === iso;
    }).map((c) => {
      const s = new Date(c.inicio);
      const e = new Date(c.fin || c.inicio);
      const sMin = s.getHours() * 60 + s.getMinutes();
      const eMin = e.getHours() * 60 + e.getMinutes();
      const clampedStart = Math.max(sMin, startMinutes);
      const clampedEnd = Math.min(eMin, endMinutes);
      const top = Math.max(0, (clampedStart - startMinutes) * pxPerMin);
      const height = Math.max(10, (clampedEnd - clampedStart) * pxPerMin);
      const title = c.odontologo?.nombre || 'Cita';
      return { cita: c, title, top, height, estadoClass: this.estadoClass(c.estado) };
    });

    return events;
  }

  estadoClass(estado: string): string {
    const e = (estado || '').toLowerCase();
    if (e === 'confirmada') return 'event--confirmada';
    if (e === 'cancelada') return 'event--cancelada';
    if (e === 'atendida') return 'event--atendida';
    return 'event--pendiente';
  }

  currentLinePosition(dayIso: string): number | null {
    const todayIso = this.formatIsoDate(new Date());
    if (dayIso !== todayIso) return null;
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    if (minutes < this.dayStartMinutes || minutes > this.dayEndMinutes) return null;
    return (minutes - this.dayStartMinutes) * this.pxPerMinute;
  }

  obtenerEtiquetaOdontologo(odontologo: any): string {
    const nombre = odontologo?.nombre || 'Odontologo';
    return `${nombre}`;
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
      error: (err: any) => {
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
      error: (err: any) => {
        this.errorMsg = err?.error?.mensaje || 'No se pudo reprogramar la cita.';
        this.reGuardando = false;
      }
    });
  }

  private okAndErrorReset(): void {
    this.errorMsg = '';
    this.successMsg = '';
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun..6=Sat
    const diff = (day + 6) % 7; // start on Monday
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private formatIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}




