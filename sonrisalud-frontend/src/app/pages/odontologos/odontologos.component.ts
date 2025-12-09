import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OdontologosService } from '../../services/odontologos.service';
import { AuthService } from '../../services/auth.service';
import { CitasService } from '../../services/citas.service';
import { AdminService } from '../../services/admin.service';

interface Cita {
  id: number;
  inicio: string;
  fin: string;
  estado: string;
  pacienteId: number;
  paciente?: { id: number; nombre?: string; correo?: string };
  motivo?: string;
  diagnostico?: string;
  tratamiento?: string;
  observaciones?: string;
  nota?: string;
  receta?: string;
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

  // AtenciÃ³n
  sel: Cita | null = null;
  diagnostico = '';
  tratamiento = '';
  observaciones = '';
  nota = '';
  receta = '';
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
  role: string | null = null;
  private readonly dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  // Admin: selector de odontologo
  onOdontologoChange(idStr: string) {
    const id = Number(idStr) || null;
    this.odontologoId = id;
    this.buscar();
  }

  private dayKey(value: string | Date): string {
    const d = typeof value === 'string' ? new Date(value) : value;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  odontologos: any[] = [];

  get citasProximas(): Cita[] {
    const ahora = new Date();
    return [...this.citas]
      .filter((c) => new Date(c.inicio) >= ahora)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }

  constructor(
    private odService: OdontologosService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private citasService: CitasService,
    private adminService: AdminService,
  ) {}

  ngOnInit(): void {
    this.role = this.auth.getRole?.() || null;
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
        this.odontologos = lista;
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
  limpiarFiltros() {
    this.filterEstado = null;
    this.filterPacienteId = null;
    this.viewMode = 'week';
    this.fecha = new Date().toISOString().slice(0, 10);
    this.weekStart = this.getWeekStart(new Date());
    this.buscar();
  }

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
    this.diagnostico = c.diagnostico || '';
    this.tratamiento = c.tratamiento || '';
    this.observaciones = c.observaciones || '';
    this.nota = c.nota || '';
    this.receta = c.receta || '';
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
    this.odService.atenderCita(this.sel.id, { diagnostico: this.diagnostico || undefined, tratamiento: this.tratamiento || undefined, observaciones: this.observaciones || undefined, receta: this.receta || undefined }).subscribe({
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
    this.odService.guardarNotasCita(this.sel.id, { diagnostico: this.diagnostico || undefined, tratamiento: this.tratamiento || undefined, observaciones: this.observaciones || undefined, nota: this.nota || undefined, receta: this.receta || undefined }).subscribe({
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
    const role = this.role || this.auth.getRole();

    if (role === 'admin') {
      this.adminService.listarCitas({ odontologoId: null, pacienteId: null, estado: null, desde: null, hasta: null }).subscribe({
        next: (h) => { this.historialPropio = Array.isArray(h) ? h : []; this.loadingHistPropio = false; },
        error: (err) => { this.error = err?.error?.mensaje || 'Error al cargar historial'; this.loadingHistPropio = false; }
      });
      return;
    }

    const odId = role === 'admin' ? (this.odontologoId || undefined) : undefined;
    this.odService.historialPropio(50, odId).subscribe({
      next: (h) => { this.historialPropio = Array.isArray(h) ? h : []; this.loadingHistPropio = false; },
      error: (err) => { this.error = err?.error?.mensaje || 'Error al cargar historial'; this.loadingHistPropio = false; }
    });
  }

  // Helpers calendario
  get weekDays(): { label: string; iso: string }[] {
    const start = new Date(this.weekStart + 'T00:00:00');
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const label = `${this.dayNames[i]} ${String(d.getDate()).padStart(2, '0')}`;
      return { label, iso: this.dayKey(d) };
    });
  }

  eventsForDay(iso: string): { cita: Cita; top: number; height: number; title: string }[] {
    const inDay: any[] = this.citas.filter(c => this.dayKey((c as any).inicio) === iso);
    return inDay.map(c => {
      const start = new Date(c.inicio);
      const end = new Date(c.fin);
      const startMin = start.getHours()*60 + start.getMinutes();
      const endMin = end.getHours()*60 + end.getMinutes();
      const topMin = Math.max(0, startMin - this.dayStartMinutes);
      const bottomMin = Math.max(0, Math.min(this.dayEndMinutes, endMin) - this.dayStartMinutes);
      const heightMin = Math.max(40, bottomMin - topMin);
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

  seleccionarResSlot(s: { inicio: string; fin: string; etiqueta: string }): void {
    this.resSlotSel = s;
  }

  crearCitaComoOd(): void {
    if (!this.pacienteId || !this.resSlotSel) {
      this.error = 'Selecciona paciente y horario';
      return;
    }
    this.error = '';
    this.resGuardando = true;
    const payload: any = {
      pacienteId: this.pacienteId,
      inicio: this.resSlotSel.inicio,
      motivo: this.resMotivo || undefined,
    };
    if (this.odontologoId) payload.odontologoId = this.odontologoId;

    this.odService.crearCitaComoOdontologo(payload).subscribe({
      next: () => {
        this.resGuardando = false;
        this.resSlots = [];
        this.resSlotSel = null;
        this.resMotivo = '';
        this.buscar();
      },
      error: (err) => {
        this.resGuardando = false;
        this.error = err?.error?.mensaje || 'No se pudo crear la cita';
      },
    });
  }

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
    this.citasService.obtenerDisponibilidad(this.odontologoId, this.resFecha).subscribe({
      next: (r) => {
        this.resSlots = r?.slots || [];
        this.resDuracion = r?.duracion || 30;
        this.resBuscando = false;
        if (!this.resSlots.length) this.error = 'Sin horarios disponibles para ese día';
      },
      error: (err) => {
        this.error = err?.error?.mensaje || 'Error al obtener disponibilidad';
        this.resBuscando = false;
      }
    });
  }
  cancelarOd(c: any): void {
    if (!c?.id) return;
    if (!confirm('Â¿Cancelar esta cita?')) return;
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
    const today = this.dayKey(new Date());
    return iso === today;
  }

  isTomorrow(iso: string): boolean {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return iso === this.dayKey(d);
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

  imprimirReceta(): void {
    if (!this.sel) return;
    const pacienteNombre = this.sel.paciente?.nombre || `Paciente #${this.sel.pacienteId}`;
    const od = this.odontologos.find(o => o.id === this.odontologoId);
    const odNombre = od?.nombre || 'Odontologo';
    const fecha = new Date(this.sel.inicio).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
    const cuerpoReceta = this.receta || 'Sin receta registrada';
    const contenido = `
      <html>
        <head>
          <title>Receta - ${pacienteNombre}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1c1c1c; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .marca { font-size: 18px; font-weight: 800; color: #0a3d62; }
            .info { font-size: 13px; color: #4b5563; }
            h1 { margin: 0 0 12px; font-size: 22px; color: #0a3d62; }
            .card { border: 1px solid #d7e0ea; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
            .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
            .valor { font-size: 15px; margin: 0; }
            .receta { white-space: pre-wrap; border: 1px dashed #cbd5e1; padding: 12px; border-radius: 10px; background: #f8fafc; min-height: 120px; }
            .firma { margin-top: 40px; text-align: center; }
            .firma hr { width: 220px; }
            @media print {
              body { padding: 16px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="marca">SonriSalud</div>
              <div class="info">Receta odontológica</div>
            </div>
            <div class="info">
              <div><strong>Fecha:</strong> ${fecha}</div>
              <div><strong>Odontólogo:</strong> ${odNombre}</div>
            </div>
          </div>
          <h1>Paciente: ${pacienteNombre}</h1>
          <div class="card">
            <div class="label">Diagnóstico</div>
            <p class="valor">${this.diagnostico || 'Sin diagnóstico registrado'}</p>
          </div>
          <div class="card">
            <div class="label">Receta</div>
            <div class="receta">${cuerpoReceta}</div>
          </div>
          <div class="card">
            <div class="label">Indicaciones / Tratamiento</div>
            <p class="valor">${this.tratamiento || 'Sin indicaciones'}</p>
          </div>
          <div class="firma">
            <hr />
            <div>${odNombre}</div>
            <div>Firma y sello</div>
          </div>
        </body>
      </html>
    `;
    const popup = window.open('', '_blank', 'width=720,height=900');
    if (!popup) { this.error = 'El navegador bloqueó la ventana de impresión'; return; }
    popup.document.open();
    popup.document.write(contenido);
    popup.document.close();
    popup.focus();
    popup.print();
  }
}







