import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiBase =
    (window as any).__sonriSaludApiBaseUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  listarPacientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/admin/pacientes`);
  }

  actualizarPaciente(id: number, data: { nombre?: string; correo?: string; telefono?: string; fotoUrl?: string; password?: string; }): Observable<any> {
    return this.http.patch(`${this.apiBase}/admin/pacientes/${id}`, data);
  }

  eliminarPaciente(id: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/admin/pacientes/${id}`);
  }

  listarCitas(filtros: {
    odontologoId?: number | null;
    pacienteId?: number | null;
    desde?: string | null;
    hasta?: string | null;
    estado?: string | null;
  }): Observable<any[]> {
    let params = new HttpParams();
    if (filtros.odontologoId) params = params.set('odontologoId', String(filtros.odontologoId));
    if (filtros.pacienteId) params = params.set('pacienteId', String(filtros.pacienteId));
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    return this.http.get<any[]>(`${this.apiBase}/admin/citas`, { params });
  }

  crearCita(payload: { pacienteId: number; odontologoId: number; inicio: string; motivo?: string; }): Observable<any> {
    return this.http.post(`${this.apiBase}/admin/citas`, payload);
  }

  actualizarCita(id: number, payload: { estado?: string; motivo?: string; nuevoInicio?: string; }): Observable<any> {
    return this.http.patch(`${this.apiBase}/admin/citas/${id}`, payload);
  }

  cancelarCita(id: number): Observable<any> {
    return this.http.patch(`${this.apiBase}/admin/citas/${id}/cancelar`, {});
  }

  enviarRecordatorioCita(id: number): Observable<any> {
    return this.http.post(`${this.apiBase}/admin/citas/${id}/recordatorio`, {});
  }

  whatsappEnabled(): Observable<{ enabled: boolean }> {
    return this.http.get<{ enabled: boolean }>(`${this.apiBase}/admin/whatsapp/enabled`);
  }

  obtenerDisponibilidad(odontologoId: number, fecha: string): Observable<{
    slots: { inicio: string; fin: string; etiqueta: string }[];
    duracion: number;
  }> {
    return this.http.get<{
      slots: { inicio: string; fin: string; etiqueta: string }[];
      duracion: number;
    }>(`${this.apiBase}/admin/disponibilidad`, {
      params: { odontologoId, fecha }
    });
  }

  listarUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/admin/usuarios`);
  }

  actualizarRolUsuario(id: number, rol: string): Observable<any> {
    return this.http.patch(`${this.apiBase}/admin/usuarios/${id}/rol`, { rol });
  }

  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/admin/usuarios/${id}`);
  }

  actualizarOdontologo(id: number, data: { nombre?: string; correo?: string; especialidad?: string; telefono?: string; duracionConsulta?: number; activo?: boolean; }): Observable<any> {
    return this.http.patch(`${this.apiBase}/admin/odontologos/${id}`, data);
  }

  eliminarOdontologo(id: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/admin/odontologos/${id}`);
  }
}
