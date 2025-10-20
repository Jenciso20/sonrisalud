import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OdontologosService {
  private readonly apiBase =
    (window as any).__sonriSaludApiBaseUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  obtenerOdontologos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/odontologos`);
  }

  agenda(odontologoId: number, desde: string, hasta: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/odontologos/agenda`, { params: { odontologoId, desde, hasta } });
  }

  atenderCita(id: number, payload: { diagnostico?: string; tratamiento?: string; observaciones?: string }): Observable<any> {
    return this.http.patch(`${this.apiBase}/odontologos/citas/${id}/atender`, payload);
  }
}
