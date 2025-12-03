import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OdontologosService } from '../../services/odontologos.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface Cita {
  id: number;
  inicio: string;
  fin: string;
  estado: string;
  pacienteId: number;
  paciente?: { id: number; nombre?: string; correo?: string };
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
  filterEstado: string | null = null;
  filterPacienteId: number | null = null;

  // Atención
  sel: Cita | null = null;
  diagnostico = '';
  tratamiento = '';
  observaciones = '';
  nota = '';
  guardando = false;
  savingDraft = false;
  lastDraftAt: string | null = null;
  private saveTimer: any = null;
  historial: any[] = [];
  loadingHist = false;

  // Calendario semanal (08:00 a 20:00)
  dayStartMinutes = 8 * 60;
  dayEndMinutes = 20 * 60;
  dayMinutes = (20 - 8) * 60; // 12h
  pxPerMinute = 1; // 720px de alto por dia
  viewTab: 'agenda' | 'historial' = 'agenda';
  historialPropio: any[] = [];
  loadingHistPropio = false;
  draggingId: number | null = null;

  get citasProximas(): Cita[] {
    const ahora = new Date();
    return [...this.citas]
      .filter((c) => new Date(c.inicio) >= ahora)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }

  constructor(private odService: OdontologosService, private auth: AuthService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.cargarOdontologoYBuscar();
    this.cargarPacientes();
    this.route.queryParamMap.subscribe((p) => {
      const tab = p.get('tab');
      this.viewTab = tab === 'historial' ? 'historial' : 'agenda';
      this.buscar();
    });
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
    if (this.viewTab === 'historial') { this.cargarHistorialPropio(); return; }
    if (!this.odontologoId) { this.loading = false; return; }
    this.loading = true; this.error = '';
    const { desde, hasta } = this.viewMode === 'day' ? this.rangoDiaISO(this.fecha) : this.rangoSemanaISO(this.weekStart);
    this.odService.agenda(this.odontologoId, desde, hasta, { estado: this.filterEstado || undefined, pacienteId: this.filterPacienteId || undefined }).subscribe({
      next: (c) => { this.citas = c || []; this.loading = false; },
      error: (err) => { this.error = err?.error?.mensaje || 'Error al cargar agenda'; this.loading = false; }
    });
  }

  abrirAtencion(c: Cita): void {
    this.sel = c;
    this.diagnostico = '';
    this.tratamiento = '';
    this.observaciones = '';
    this.nota = '';
    this.lastDraftAt = null;
    this.cargarHistorial(c.pacienteId);
  }
  cerrarAtencion(): void { this.sel = null; }

  cargarHistorial(pacienteId: number): void {
    if (!pacienteId) { this.historial = []; return; }
    this.loadingHist = true;
    this.odService.historialPaciente(pacienteId, 10).subscribe({
      next: (h) => { this.historial = Array.isArray(h) ? h : []; this.loadingHist = false; },
      error: () => { this.loadingHist = false; }
    });
  }

  atender(): void {
    if (!this.sel) return;
    this.guardando = true;
    this.odService.atenderCita(this.sel.id, { diagnostico: this.diagnostico || undefined, tratamiento: this.tratamiento || undefined, observaciones: this.observaciones || undefined }).subscribe({
      next: () => { this.guardando = false; this.cerrarAtencion(); this.buscar(); },
      error: (err) => { this.error = err?.error?.mensaje || 'Error al guardar'; this.guardando = false; }
    });
  }

  onNotasChange(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.guardarNotas(true), 1200);
  }

  guardarNotas(isDraft = false): void {
    if (!this.sel) return;
    if (isDraft) this.savingDraft = true; else this.guardando = true;
    this.odService.guardarNotasCita(this.sel.id, { diagnostico: this.diagnostico || undefined, tratamiento: this.tratamiento || undefined, observaciones: this.observaciones || undefined, nota: this.nota || undefined }).subscribe({
      next: () => {
        if (isDraft) {
          this.savingDraft = false;
          this.lastDraftAt = new Date().toLocaleTimeString();
        } else {
          this.guardando = false;
        }
      },
      error: (err) => {
        this.error = err?.error?.mensaje || 'Error al guardar notas';
        this.savingDraft = false;
        this.guardando = false;
      }
    });
  }

  cargarHistorialPropio(): void {
    this.loadingHistPropio = true; this.error = '';
    const role = this.auth.getRole();
    const odId = role === 'admin' ? (this.odontologoId || undefined) : undefined;
    this.odService.historialPropio(50, odId).subscribe({
      next: (h) => { this.historialPropio = Array.isArray(h) ? h : []; this.loadingHistPropio = false; },
      error: (err) => { this.error = err?.error?.mensaje || 'Error al cargar historial'; this.loadingHistPropio = false; }
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
    const inDay: any[] = this.citas.filter(c => (c as any).inicio.slice(0,10) === iso);
    return inDay.map(c => {
      const start = new Date(c.inicio);
      const end = new Date(c.fin);
      const startMin = start.getHours()*60 + start.getMinutes();
      const endMin = end.getHours()*60 + end.getMinutes();
      const topMin = Math.max(0, startMin - this.dayStartMinutes);
      const bottomMin = Math.max(0, Math.min(this.dayEndMinutes, endMin) - this.dayStartMinutes);
      const heightMin = Math.max(20, bottomMin - topMin);
      const title = c.paciente?.nombre ? c.paciente.nombre : `Paciente #${c.pacienteId || ''}`;
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
    const urlBase = environment.apiBaseUrl;
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

  cancelarOd(c: any): void {
    if (!c?.id) return;
    if (!confirm('¿Cancelar esta cita?')) return;
    this.odService.cancelarCitaComoOdontologo(c.id).subscribe({
      next: () => { this.buscar(); },
      error: (err) => { this.error = err?.error?.mensaje || 'No se pudo cancelar la cita'; }
    });
  }

  estadoClase(estado: string): string {
    const e = (estado || '').toLowerCase();
    if (e === 'confirmada') return 'event--confirmada';
    if (e === 'atendida') return 'event--atendida';
    if (e === 'cancelada') return 'event--cancelada';
    return 'event--pendiente';
  }

  isToday(iso: string): boolean {
    const today = new Date().toISOString().slice(0,10);
    return iso === today;
  }

  isTomorrow(iso: string): boolean {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return iso === d.toISOString().slice(0,10);
  }

  onDragStart(c: Cita) { this.draggingId = c.id; }
  onDragEnd() { this.draggingId = null; }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

  onDrop(ev: DragEvent, dayIso: string) {
    ev.preventDefault();
    if (!this.draggingId) return;
    const cita = this.citas.find((c) => c.id === this.draggingId);
    if (!cita) { this.draggingId = null; return; }
    const target = ev.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const y = ev.clientY - rect.top;
    const duracion = Math.max(15, Math.round((new Date(cita.fin).getTime() - new Date(cita.inicio).getTime()) / 60000));
    const minutesRaw = Math.round(y / this.pxPerMinute / 5) * 5;
    const minutesFromStart = Math.min(this.dayEndMinutes - duracion, Math.max(0, minutesRaw)) + this.dayStartMinutes;
    const hour = Math.floor(minutesFromStart / 60);
    const min = minutesFromStart % 60;
    const base = new Date(`${dayIso}T00:00:00`);
    base.setHours(hour, min, 0, 0);
    const nuevoInicio = base.toISOString();
    this.odService.reprogramarCitaComoOdontologo(this.draggingId, nuevoInicio).subscribe({
      next: () => { this.draggingId = null; this.buscar(); },
      error: (err) => { this.error = err?.error?.mensaje || 'No se pudo mover la cita'; this.draggingId = null; }
    });
  }
}

