import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;
  private readonly tokenKey = 'sonrisalud_token';

  constructor(private http: HttpClient) {}

  login(credentials: { correo: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  register(data: { nombre: string; apellidos?: string; correo: string; password: string; telefono?: string; dni?: string; codigoUniversitario?: string; }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`);
  }

  updateProfile(payload: {
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    dni?: string;
    codigoUniversitario?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/me`, payload);
  }

  recoverPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/recover`, { correo: email });
  }

  resetPassword(token: string, nuevaPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, nuevaPassword });
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  private isExpired(decoded: any | null): boolean {
    if (!decoded || !decoded.exp) return true;
    const expMs = Number(decoded.exp) * 1000;
    return Date.now() >= expMs;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const decoded = this.decodeToken(token);
    if (!decoded || this.isExpired(decoded)) {
      this.clearToken();
      return false;
    }
    return true;
  }

  logout(): void {
    this.clearToken();
  }

  private decodeToken(token: string): any | null {
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
      return null;
    }
  }

  getUser(): { id: number; correo: string; rol?: string } | null {
    const token = this.getToken();
    if (!token) return null;
    const decoded = this.decodeToken(token);
    if (!decoded || this.isExpired(decoded)) return null;
    return { id: decoded.id, correo: decoded.correo, rol: decoded.rol };
  }

  getRole(): string | null {
    return this.getUser()?.rol || null;
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  isOdontologo(): boolean {
    return this.getRole() === 'odontologo';
  }

  isPaciente(): boolean {
    return this.getRole() === 'paciente';
  }
}
