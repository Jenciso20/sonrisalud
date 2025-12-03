import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OdontologosService {
  private readonly apiBase = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  obtenerOdontologos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/odontologos`);
  }

  agenda(odontologoId: number, desde: string, hasta: string, filtros?: { estado?: string; pacienteId?: number | null }): Observable<any[]> {
    const params: any = { odontologoId, desde, hasta };
    if (filtros?.estado) params.estado = filtros.estado;
    if (filtros?.pacienteId) params.pacienteId = filtros.pacienteId;
    return this.http.get<any[]>(`${this.apiBase}/odontologos/agenda`, { params });
  }

  atenderCita(id: number, payload: { diagnostico?: string; tratamiento?: string; observaciones?: string }): Observable<any> {
    return this.http.patch(`${this.apiBase}/odontologos/citas/${id}/atender`, payload);
  }

  guardarNotasCita(id: number, payload: { diagnostico?: string; tratamiento?: string; observaciones?: string; nota?: string }): Observable<any> {
    return this.http.patch(`${this.apiBase}/odontologos/citas/${id}/notas`, payload);
  }

  cancelarCitaComoOdontologo(id: number): Observable<any> {
    return this.http.patch(`${this.apiBase}/odontologos/citas/${id}/cancelar`, {});
  }

  reprogramarCitaComoOdontologo(id: number, nuevoInicio: string): Observable<any> {
    return this.http.patch(`${this.apiBase}/odontologos/citas/${id}/reprogramar`, { nuevoInicio });
  }

  // Listar pacientes accesible para odontologos
  listarPacientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/odontologos/pacientes`);
  }

  // Crear cita como odontologo eligiendo paciente
  crearCitaComoOdontologo(payload: { pacienteId: number; inicio: string; motivo?: string; odontologoId?: number }): Observable<any> {
    return this.http.post(`${this.apiBase}/odontologos/citas`, payload);
  }

  historialPaciente(pacienteId: number, limit = 10): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/odontologos/pacientes/${pacienteId}/historial`, { params: { limit } });
  }

  historialPropio(limit = 50, odontologoId?: number): Observable<any[]> {
    const params: any = { limit };
    if (odontologoId) params.odontologoId = odontologoId;
    return this.http.get<any[]>(`${this.apiBase}/odontologos/historial`, { params });
  }
}
