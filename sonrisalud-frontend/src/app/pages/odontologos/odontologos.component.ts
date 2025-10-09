import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-odontologos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './odontologos.component.html',
  styleUrls: ['./odontologos.component.css']
})
export class OdontologosComponent {
  readonly agenda = [
    'Visualiza tus citas por dia y hora.',
    'Marca cada cita como atendida o cancelada.',
    'Agrega observaciones clinicas por paciente.'
  ];

  readonly pacientes = [
    'Consulta el historial clinico con diagnostico y tratamiento.',
    'Registra nuevos procedimientos o tratamientos realizados.',
    'Mantiene seguimiento de pacientes frecuentes.'
  ];

  readonly disponibilidad = [
    'Configura dias y horas disponibles para atencion.',
    'Bloquea espacios por vacaciones o descansos.',
    'Sincroniza la disponibilidad con la reserva de citas.'
  ];
}
