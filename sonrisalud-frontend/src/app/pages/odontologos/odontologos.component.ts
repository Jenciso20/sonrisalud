import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OdontologosService } from '../../services/odontologos.service';

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
  fecha = new Date().toISOString().slice(0, 10);
  citas: Cita[] = [];
  loading = false;
  error = '';

  // Atención
  sel: Cita | null = null;
  diagnostico = '';
  tratamiento = '';
  observaciones = '';
  guardando = false;

  constructor(private odService: OdontologosService) {}

  ngOnInit(): void {
    this.buscar();
  }

  rangoDiaISO(d: string): { desde: string; hasta: string } {
    const start = new Date(d + 'T00:00:00');
    const end = new Date(d + 'T23:59:59');
    return { desde: start.toISOString(), hasta: end.toISOString() };
  }

  buscar(): void {
    this.loading = true;
    this.error = '';
    const { desde, hasta } = this.rangoDiaISO(this.fecha);
    // En esta fase tomamos el primer odontólogo activo del catálogo
    // (puedes adaptar para usar el userId del token en backend si lo vinculas)
    // Para demo, pide todos y usa el primero.
    this.odService.obtenerOdontologos().subscribe({
      next: (ods) => {
        const primero = ods && ods[0];
        if (!primero) { this.loading = false; return; }
        this.odService.agenda(primero.id, desde, hasta).subscribe({
          next: (c) => { this.citas = c || []; this.loading = false; },
          error: (err) => { this.error = err?.error?.mensaje || 'Error al cargar agenda'; this.loading = false; }
        });
      },
      error: () => { this.error = 'No se pudo cargar odontologos'; this.loading = false; }
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
}
