import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OdontologosService } from '../../services/odontologos.service';
import { AuthService } from '../../services/auth.service';

interface Cita {
  id: number;
  inicio: string;
  fin: string;
  estado: string;
  pacienteId: number;
  motivo?: string;
}

@Component({
  selector: 'app-odontologos',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './odontologos.component.html',
  styleUrls: ['./odontologos.component.css']
})
export class OdontologosComponent {
  // Vista: 'week' o 'day'
  viewMode: 'week' | 'day' = 'week';

  // Rango de consulta
  fecha = new Date().toISOString().slice(0, 10); // usado para vista diaria
  weekStart = this.getWeekStart(new Date());

  citas: Cita[] = [];
  odontologoId: number | null = null;
  loading = false;
  error = '';

  // Atención
  sel: Cita | null = null;
  diagnostico = '';
  tratamiento = '';
  observaciones = '';
  guardando = false;

  // Calendario semanal (08:00 a 20:00)
  dayStartMinutes = 8 * 60;
  dayEndMinutes = 20 * 60;
  dayMinutes = (20 - 8) * 60; // 12h
  pxPerMinute = 1; // 720px de alto por dia

  constructor(private odService: OdontologosService, private auth: AuthService) {}

  ngOnInit(): void {
    this.cargarOdontologoYBuscar();
    this.cargarPacientes();
  }

  cargarOdontologoYBuscar(): void {
    this.loading = true;
    this.odService.obtenerOdontologos().subscribe({
      next: (ods) => {
        const lista = Array.isArray(ods) ? ods : [];
        const correo = this.auth.getUser()?.correo;
        const propio = correo ? lista.find(o => o?.correo === correo) : null;
        const primero = propio || (lista.length ? lista[0] : null);
        this.odontologoId = primero ? primero.id : null;
        this.buscar();
      },
      error: () => { this.error = 'No se pudo cargar odontologos'; this.loading = false; }
    });
  }

  getWeekStart(d: Date): string {
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Lunes como inicio
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
  }

  rangoDiaISO(d: string) { const start = new Date(d + 'T00:00:00'); const end = new Date(d + 'T23:59:59'); return { desde: start.toISOString(), hasta: end.toISOString() }; }
  rangoSemanaISO(startStr: string) {
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { desde: start.toISOString(), hasta: end.toISOString() };
  }

  prevWeek() { const d = new Date(this.weekStart); d.setDate(d.getDate() - 7); this.weekStart = d.toISOString().slice(0,10); this.buscar(); }
  nextWeek() { const d = new Date(this.weekStart); d.setDate(d.getDate() + 7); this.weekStart = d.toISOString().slice(0,10); this.buscar(); }
  todayWeek() { this.weekStart = this.getWeekStart(new Date()); this.buscar(); }

  buscar(): void {
    if (!this.odontologoId) { this.loading = false; return; }
    this.loading = true; this.error = '';
    const { desde, hasta } = this.viewMode === 'day' ? this.rangoDiaISO(this.fecha) : this.rangoSemanaISO(this.weekStart);
    this.odService.agenda(this.odontologoId, desde, hasta).subscribe({
      next: (c) => { this.citas = c || []; this.loading = false; },
      error: (err) => { this.error = err?.error?.mensaje || 'Error al cargar agenda'; this.loading = false; }
    });
  }

  abrirAtencion(c: Cita): void { this.sel = c; this.diagnostico=''; this.tratamiento=''; this.observaciones=''; }
  cerrarAtencion(): void { this.sel = null; }

  atender(): void {
    if (!this.sel) return;
    this.guardando = true;
    this.odService.atenderCita(this.sel.id, { diagnostico: this.diagnostico || undefined, tratamiento: this.tratamiento || undefined, observaciones: this.observaciones || undefined }).subscribe({
      next: () => { this.guardando = false; this.cerrarAtencion(); this.buscar(); },
      error: (err) => { this.error = err?.error?.mensaje || 'Error al guardar'; this.guardando = false; }
    });
  }

  // Helpers calendario
  get weekDays(): { label: string; iso: string }[] {
    const labels = ['Lun','Mar','Mie','Jue','Vie','Sab','Dom'];
    const start = new Date(this.weekStart + 'T00:00:00');
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      return { label: `${labels[i]} ${d.getDate()}` , iso: d.toISOString().slice(0,10) };
    });
  }

  eventsForDay(iso: string): { cita: Cita; top: number; height: number; title: string }[] {
    const inDay: Cita[] = this.citas.filter(c => c.inicio.slice(0,10) === iso);
    return inDay.map(c => {
      const start = new Date(c.inicio);
      const end = new Date(c.fin);
      const startMin = start.getHours()*60 + start.getMinutes();
      const endMin = end.getHours()*60 + end.getMinutes();
      const topMin = Math.max(0, startMin - this.dayStartMinutes);
      const bottomMin = Math.max(0, Math.min(this.dayEndMinutes, endMin) - this.dayStartMinutes);
      const heightMin = Math.max(20, bottomMin - topMin);
      const title = `Paciente #${(c as any).pacienteId || ''}`;
      return { cita: c, top: topMin * this.pxPerMinute, height: heightMin * this.pxPerMinute, title };
    });
  }

  // --- Reserva como odontologo ---
  pacientes: any[] = [];
  pacienteId: number | null = null;
  resFecha = '';
  resSlots: { inicio: string; fin: string; etiqueta: string }[] = [];
  resSlotSel: { inicio: string; fin: string; etiqueta: string } | null = null;
  resBuscando = false;
  resGuardando = false;
  resDuracion = 0;
  resMotivo = '';

  cargarPacientes(): void {
    this.odService.listarPacientes().subscribe({
      next: (p) => (this.pacientes = p || []),
      error: () => (this.error = 'No se pudo cargar pacientes'),
    });
  }

  verDisponibilidadPropia(): void {
    if (!this.odontologoId || !this.resFecha) { this.error = 'Elige fecha'; return; }
    this.error = '';
    this.resBuscando = true;
    this.odService
      .agenda(this.odontologoId, this.resFecha + 'T00:00:00', this.resFecha + 'T23:59:59')
      .subscribe({ next: () => {}, error: () => {} }); // no usado aquí
    // Reutilizamos endpoint general de disponibilidad
    const urlBase = (window as any).__sonriSaludApiBaseUrl || 'http://localhost:3000/api';
    fetch(`${urlBase}/citas/disponibilidad?odontologoId=${this.odontologoId}&fecha=${this.resFecha}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('sonrisalud_token')}` }
    }).then(r => r.json()).then((r) => {
      this.resSlots = r?.slots || [];
      this.resDuracion = r?.duracion || 30;
      this.resBuscando = false;
      if (!this.resSlots.length) this.error = 'Sin horarios disponibles para ese día';
    }).catch(() => { this.error = 'Error al obtener disponibilidad'; this.resBuscando = false; });
  }

  seleccionarResSlot(s: { inicio: string; fin: string; etiqueta: string }): void { this.resSlotSel = s; }

  crearCitaComoOd(): void {
    if (!this.pacienteId || !this.resSlotSel) { this.error = 'Selecciona paciente y horario'; return; }
    this.resGuardando = true; this.error = '';
    this.odService.crearCitaComoOdontologo({ pacienteId: this.pacienteId, inicio: this.resSlotSel.inicio, motivo: this.resMotivo || undefined, odontologoId: this.odontologoId || undefined }).subscribe({
      next: () => { this.resGuardando = false; this.resMotivo = ''; this.resSlotSel = null; this.resSlots = []; this.buscar(); },
      error: (err) => { this.error = err?.error?.mensaje || 'No se pudo crear la cita'; this.resGuardando = false; }
    });
  }
}
