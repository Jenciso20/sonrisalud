import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface MenuSection {
  titulo: string;
  descripcion: string;
  ruta: string;
  fragment?: string;
  icono: string;
  items: string[];
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent {
  readonly secciones: MenuSection[] = [
    {
      titulo: 'Modulo de Paciente',
      descripcion: 'Gestiona tus citas, perfil y notificaciones.',
      ruta: '/pacientes',
      icono: 'PAC',
      items: [
        'Reservar citas odontologicas: elegir especialidad, profesional, fecha y hora.',
        'Validaciones para evitar duplicados y cruces de horario.',
        'Confirmaciones y recordatorios de cita por correo.',
        'Historial de citas con estados pendiente, atendida o cancelada.',
        'Edicion de datos personales y cambio de contrasena.',
        'Carga de fotografia de perfil.',
        'Notificaciones automaticas 24h antes de la cita.'
      ]
    },
    {
      titulo: 'Modulo de Odontologo',
      descripcion: 'Administra agenda, pacientes y disponibilidad.',
      ruta: '/odontologos',
      icono: 'ODO',
      items: [
        'Agenda de citas por fecha con opciones para marcar atendida o cancelada.',
        'Registro de observaciones de cada consulta.',
        'Gestion de pacientes atendidos: diagnosticos y tratamientos.',
        'Carga de nuevos procedimientos o tratamientos realizados.',
        'Definicion de disponibilidad: dias y horarios de atencion.',
        'Bloqueo de horarios por vacaciones o descansos.'
      ]
    },
    {
      titulo: 'Modulo de Filtros',
      descripcion: 'Filtra y navega rapido por la agenda semanal o diaria.',
      ruta: '/odontologos',
      fragment: 'filtros-agenda',
      icono: 'FLT',
      items: [
        'Filtro por estado, paciente y vista (semana o dia).',
        'Atajos a hoy y reseteo rapido de filtros.',
        'Acceso directo a la agenda del odontologo para reprogramar.'
      ]
    },
    {
      titulo: 'Modulo de Administrador',
      descripcion: 'Supervisa usuarios, servicios y reportes.',
      ruta: '/administrador',
      icono: 'ADM',
      items: [
        'Gestion de usuarios: ver, editar o eliminar pacientes y odontologos.',
        'Asignacion de roles y restablecimiento manual de contrasenas.',
        'Configuracion de servicios y especialidades (sin cobros).',
        'Reportes de citas por periodo o especialidad.',
        'Seguimiento de pacientes nuevos y atenciones realizadas (sin costos).',
        'Gestion de notificaciones y campanas por correo.',
        'Monitoreo de logs de correo para citas confirmadas o canceladas.'
      ]
    }
  ];
}
