import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl =
    (window as any).__sonriSaludApiUrl || 'http://localhost:3000/api/auth';
  private readonly tokenKey = 'sonrisalud_token';

  constructor(private http: HttpClient) {}

  login(credentials: { correo: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  register(data: { nombre: string; correo: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
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

  isAuthenticated(): boolean {
    return !!this.getToken();
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
    if (!decoded) return null;
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
}
