import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CitasService {
  private readonly apiBase =
    (window as any).__sonriSaludApiBaseUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  obtenerCitasPaciente(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/citas`);
  }

  obtenerCitasPacienteRango(desde: string, hasta: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/citas`, {
      params: { desde, hasta }
    });
  }

  cancelarCita(id: number): Observable<any> {
    return this.http.patch(`${this.apiBase}/citas/${id}/cancelar`, {});
  }

  crearCita(payload: {
    odontologoId: number;
    inicio: string;
    motivo?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiBase}/citas`, payload);
  }

  obtenerDisponibilidad(odontologoId: number, fecha: string): Observable<{
    slots: { inicio: string; fin: string; etiqueta: string }[];
    duracion: number;
  }> {
    return this.http.get<{
      slots: { inicio: string; fin: string; etiqueta: string }[];
      duracion: number;
    }>(`${this.apiBase}/citas/disponibilidad`, {
      params: {
        odontologoId,
        fecha
      }
    });
  }

  reprogramarCita(id: number, nuevoInicio: string): Observable<any> {
    return this.http.patch(`${this.apiBase}/citas/${id}/reprogramar`, { nuevoInicio });
  }

  ocupadas(odontologoId: number, fecha: string): Observable<Array<{ inicio: string; fin: string; estado: string; paciente?: any }>> {
    return this.http.get<Array<{ inicio: string; fin: string; estado: string; paciente?: any }>>(
      `${this.apiBase}/citas/ocupadas`, { params: { odontologoId, fecha } }
    );
  }
}
