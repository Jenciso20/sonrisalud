import { Op } from "sequelize";
import { Cita } from "../models/Cita.js";
import { Odontologo } from "../models/Odontologo.js";
import { HorarioOdontologo } from "../models/HorarioOdontologo.js";
import { Usuario } from "../models/Usuario.js";
import { formatE164, sendTemplate, sendText } from "../services/whatsapp.service.js";
import { logger } from "../utils/logger.js";
import { sequelize } from "../config/db.js";

const ESTADOS_ACTIVOS = ["pendiente", "confirmada"];
const GAP_MINUTES = Number(process.env.APPOINTMENT_GAP_MINUTES || 10);
const MIN_HOURS_BEFORE = Number(process.env.MIN_HOURS_BEFORE || 2);
const MAX_ACTIVE_CITAS_PACIENTE = Number(process.env.MAX_ACTIVE_CITAS_PACIENTE || 3);
const BLOCK_WEEKENDS = (process.env.BLOCK_WEEKENDS || "true").toLowerCase() === "true";

const toMinutes = (timeString) => {
  const [h, m] = timeString.split(":").map(Number);
  return h * 60 + m;
};

const parseToUtc = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // Normaliza a ISO/UTC para guardar y comparar en base de datos
  return new Date(date.toISOString());
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);
const durationForOdontologo = (odontologo) =>
  Number(odontologo?.duracionConsulta) > 0 ? Number(odontologo.duracionConsulta) : 60;
const isWeekend = (date) => {
  const d = date.getDay();
  return d === 0 || d === 6;
};

export const listarCitasPaciente = async (req, res) => {
  const pacienteId = req.usuario.id;
  const { estado, desde, hasta } = req.query;

  try {
    const where = {
      pacienteId,
    };

    if (estado) {
      where.estado = estado;
    }

    if (desde || hasta) {
      where.inicio = {};
      if (desde) {
        const inicioDesde = new Date(desde);
        if (!Number.isNaN(inicioDesde.getTime())) {
          where.inicio[Op.gte] = inicioDesde;
        }
      }
      if (hasta) {
        const inicioHasta = new Date(hasta);
        if (!Number.isNaN(inicioHasta.getTime())) {
          where.inicio[Op.lte] = inicioHasta;
        }
      }
    }

    const citas = await Cita.findAll({
      where,
      include: [
        {
          model: Odontologo,
          as: "odontologo",
        },
      ],
      order: [["inicio", "ASC"]],
    });

    res.json(citas);
  } catch (error) {
    logger.error("Error al listar citas:", error);
    res.status(500).json({ mensaje: "Error al listar citas" });
  }
};

export const crearCita = async (req, res) => {
  const pacienteId = req.usuario.id;
  const { odontologoId, inicio, motivo } = req.body;

  if (!odontologoId || !inicio) {
    return res.status(400).json({ mensaje: "Odontologo y fecha de inicio son requeridos" });
  }

  try {
    const odontologo = await Odontologo.findByPk(odontologoId);
    if (!odontologo || !odontologo.activo) {
      return res.status(404).json({ mensaje: "Odontologo no encontrado" });
    }
    const duracion = durationForOdontologo(odontologo);

    const inicioDate = parseToUtc(inicio);
    if (!inicioDate) {
      return res.status(400).json({ mensaje: "Fecha de inicio invalida" });
    }

    if (BLOCK_WEEKENDS && isWeekend(inicioDate)) {
      return res.status(400).json({ mensaje: "No se permiten citas en fin de semana" });
    }

    const now = new Date();
    const diffHours = (inicioDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < MIN_HOURS_BEFORE) {
      return res
        .status(400)
        .json({ mensaje: `La cita debe programarse con al menos ${MIN_HOURS_BEFORE} horas de anticipacion` });
    }

    const activasPaciente = await Cita.count({
      where: { pacienteId, estado: { [Op.in]: ESTADOS_ACTIVOS } },
    });
    if (activasPaciente >= MAX_ACTIVE_CITAS_PACIENTE) {
      return res
        .status(400)
        .json({
          mensaje: `Ya tienes ${MAX_ACTIVE_CITAS_PACIENTE} citas activas. Cancela o atiende alguna antes de reservar.`,
        });
    }

    const finDate = new Date(inicioDate.getTime() + duracion * 60 * 1000);

    const diaSemana = inicioDate.getDay();
    const inicioMin = inicioDate.getHours() * 60 + inicioDate.getMinutes();
    const finMin = inicioMin + duracion;

    let horarios = await HorarioOdontologo.findAll({
      where: { odontologoId, diaSemana },
    });
    // Fallback si no hay horarios configurados para ese día
    if (!horarios.length) {
      horarios = [{ horaInicio: "08:00", horaFin: "20:00" }];
    }

    const estaEnHorario = horarios.some((horario) => {
      const horaInicio = toMinutes(horario.horaInicio);
      const horaFin = toMinutes(horario.horaFin);
      return inicioMin >= horaInicio && finMin <= horaFin;
    });

    if (!estaEnHorario) {
      return res.status(400).json({ mensaje: "El horario seleccionado no esta disponible" });
    }

    // Bloqueo almuerzo 12:00-14:00
    const lunchStart = 12 * 60;
    const lunchEnd = 14 * 60;
    const overlapLunch = !(finMin <= lunchStart || inicioMin >= lunchEnd);
    if (overlapLunch) {
      return res
        .status(400)
        .json({ mensaje: "No se permiten reservas entre 12:00 y 14:00 (almuerzo)" });
    }

    const choqueOdontologo = await Cita.findOne({
      where: {
        odontologoId,
        estado: { [Op.in]: ESTADOS_ACTIVOS },
        [Op.and]: [
          { inicio: { [Op.lt]: addMinutes(finDate, GAP_MINUTES) } },
          { fin: { [Op.gt]: addMinutes(inicioDate, -GAP_MINUTES) } },
        ],
      },
    });

    if (choqueOdontologo) {
      return res.status(400).json({ mensaje: "El odontologo ya tiene una cita en ese horario" });
    }

    const choquePaciente = await Cita.findOne({
      where: {
        pacienteId,
        estado: { [Op.in]: ESTADOS_ACTIVOS },
        [Op.and]: [
          { inicio: { [Op.lt]: addMinutes(finDate, GAP_MINUTES) } },
          { fin: { [Op.gt]: addMinutes(inicioDate, -GAP_MINUTES) } },
        ],
      },
    });

    if (choquePaciente) {
      return res.status(400).json({ mensaje: "Ya tienes una cita en ese horario" });
    }

    const cita = await Cita.create({
      pacienteId,
      odontologoId,
      inicio: inicioDate,
      fin: finDate,
      motivo,
    });

    const citaCreada = await Cita.findByPk(cita.id, {
      include: [{ model: Odontologo, as: "odontologo" }],
    });

    res.status(201).json(citaCreada);
  } catch (error) {
    logger.error("Error al crear cita:", error);
    res.status(500).json({ mensaje: "Error al crear cita" });
  }
};

export const cancelarCita = async (req, res) => {
  const pacienteId = req.usuario.id;
  const { id } = req.params;

  try {
    const cita = await Cita.findByPk(id);
    if (!cita) {
      return res.status(404).json({ mensaje: "Cita no encontrada" });
    }

    if (cita.pacienteId !== pacienteId) {
      return res.status(403).json({ mensaje: "No puedes modificar esta cita" });
    }

    if (!ESTADOS_ACTIVOS.includes(cita.estado)) {
      return res.status(400).json({ mensaje: "No se puede cancelar una cita en este estado" });
    }

    cita.estado = "cancelada";
    await cita.save();

    res.json({ mensaje: "Cita cancelada correctamente" });
  } catch (error) {
    logger.error("Error al cancelar cita:", error);
    res.status(500).json({ mensaje: "Error al cancelar cita" });
  }
};

const buildDateTime = (fechaBase, timeString) => {
  const [hours = "0", minutes = "0"] = timeString.split(":");
  const dateTime = new Date(fechaBase);
  dateTime.setHours(Number(hours), Number(minutes), 0, 0);
  return dateTime;
};

const formatSlot = (inicio, fin) => {
  const pad = (value) => value.toString().padStart(2, "0");
  const startHours = pad(inicio.getHours());
  const startMinutes = pad(inicio.getMinutes());
  const endHours = pad(fin.getHours());
  const endMinutes = pad(fin.getMinutes());
  return `${startHours}:${startMinutes} - ${endHours}:${endMinutes}`;
};

export const obtenerDisponibilidad = async (req, res) => {
  const { odontologoId, fecha } = req.query;

  if (!odontologoId || !fecha) {
    return res.status(400).json({ mensaje: "Odontologo y fecha son requeridos" });
  }

  try {
    const odontologo = await Odontologo.findByPk(odontologoId, {
      include: [{ model: HorarioOdontologo, as: "horarios" }],
    });
    const duracion = durationForOdontologo(odontologo);

    if (!odontologo || !odontologo.activo) {
      return res.status(404).json({ mensaje: "Odontologo no encontrado" });
    }

    const targetDate = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(targetDate.getTime())) {
      return res.status(400).json({ mensaje: "Fecha invalida" });
    }

    const diaSemana = targetDate.getDay();

    let horarios = odontologo.horarios.filter(
      (horario) => horario.diaSemana === diaSemana
    );

    // Fallback: si no hay horarios configurados para ese dia, asumir jornada 08:00-20:00
    // Esto facilita pruebas cuando aún no se cargaron horarios.
    const usarFallback = !horarios.length;
    if (usarFallback) {
      horarios = [
        {
          horaInicio: "08:00",
          horaFin: "20:00",
        },
      ];
    }

    const inicioDia = new Date(targetDate);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(targetDate);
    finDia.setHours(23, 59, 59, 999);

    const citasDelDia = await Cita.findAll({
      where: {
        odontologoId,
        estado: { [Op.in]: ESTADOS_ACTIVOS },
        inicio: { [Op.between]: [inicioDia, finDia] },
      },
    });

    const milisegundosDuracion = duracion * 60 * 1000;
    const gapMs = GAP_MINUTES * 60 * 1000;
    const ahora = new Date();

    const slots = [];

    horarios.forEach((horario) => {
      const horarioInicio = buildDateTime(targetDate, horario.horaInicio);
      const horarioFin = buildDateTime(targetDate, horario.horaFin);

      let cursor = new Date(horarioInicio);

      while (cursor.getTime() + milisegundosDuracion <= horarioFin.getTime()) {
        const inicioSlot = new Date(cursor);
        const finSlot = new Date(cursor.getTime() + milisegundosDuracion);

        if (inicioSlot < ahora) {
          cursor = new Date(cursor.getTime() + milisegundosDuracion);
          continue;
        }

        const hayChoque = citasDelDia.some((cita) => {
          const citaInicio = new Date(cita.inicio);
          const citaFin = new Date(cita.fin);
          return inicioSlot < new Date(citaFin.getTime() + gapMs) &&
            finSlot > new Date(citaInicio.getTime() - gapMs);
        });

        // Bloqueo de almuerzo 12:00-14:00
        const startMin = inicioSlot.getHours() * 60 + inicioSlot.getMinutes();
        const endMin = finSlot.getHours() * 60 + finSlot.getMinutes();
        const lunchStart = 12 * 60;
        const lunchEnd = 14 * 60;
        const overlapLunch = !(endMin <= lunchStart || startMin >= lunchEnd);

        if (!hayChoque && !overlapLunch) {
          slots.push({
            inicio: inicioSlot.toISOString(),
            fin: finSlot.toISOString(),
            etiqueta: formatSlot(inicioSlot, finSlot),
          });
        }

        // avanzar respetando gap
        cursor = new Date(cursor.getTime() + milisegundosDuracion + gapMs);
      }
    });

    slots.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

    res.json({ slots, duracion });
  } catch (error) {
    logger.error("Error al obtener disponibilidad:", error);
    res.status(500).json({ mensaje: "Error al obtener disponibilidad" });
  }
};

// Listar citas ocupadas (activos) para un odontologo en un dia especifico
export const citasOcupadasDia = async (req, res) => {
  const { odontologoId, fecha } = req.query;
  if (!odontologoId || !fecha) return res.status(400).json({ mensaje: 'Odontologo y fecha son requeridos' });
  try {
    const inicioDia = new Date(`${fecha}T00:00:00`);
    const finDia = new Date(`${fecha}T23:59:59`);
    const citas = await Cita.findAll({
      where: {
        odontologoId,
        estado: { [Op.in]: ESTADOS_ACTIVOS },
        inicio: { [Op.between]: [inicioDia, finDia] },
      },
      include: [{ model: Odontologo, as: 'odontologo' }, { model: Usuario, as: 'paciente', attributes: ['id','nombre'] }],
      order: [["inicio", "ASC"]],
    });
    res.json(citas.map(c => ({ inicio: c.inicio, fin: c.fin, estado: c.estado, paciente: c.paciente })));
  } catch (e) {
    logger.error('Citas ocupadas dia:', e);
    res.status(500).json({ mensaje: 'Error al listar ocupadas' });
  }
};

export const reprogramarCita = async (req, res) => {
  const pacienteId = req.usuario.id;
  const { id } = req.params;
  const { nuevoInicio } = req.body;

  try {
    const cita = await Cita.findByPk(id);
    if (!cita) return res.status(404).json({ mensaje: "Cita no encontrada" });
    if (cita.pacienteId !== pacienteId) {
      return res.status(403).json({ mensaje: "No puedes modificar esta cita" });
    }
    if (!ESTADOS_ACTIVOS.includes(cita.estado)) {
      return res.status(400).json({ mensaje: "No se puede reprogramar en este estado" });
    }

    const inicioDate = parseToUtc(nuevoInicio);
    if (!inicioDate) {
      return res.status(400).json({ mensaje: "Fecha de inicio invalida" });
    }
    const now = new Date();
    const diffHours = (inicioDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < MIN_HOURS_BEFORE) {
      return res
        .status(400)
        .json({ mensaje: `Debe reprogramarse con al menos ${MIN_HOURS_BEFORE} horas de anticipacion` });
    }
    if (BLOCK_WEEKENDS && isWeekend(inicioDate)) {
      return res.status(400).json({ mensaje: "No se permiten citas en fin de semana" });
    }

    const odontologo = await Odontologo.findByPk(cita.odontologoId);
    const duracion = durationForOdontologo(odontologo);
    if (!odontologo || !odontologo.activo) {
      return res.status(404).json({ mensaje: "Odontologo no encontrado" });
    }
    const finDate = new Date(inicioDate.getTime() + duracion * 60 * 1000);

    const diaSemana = inicioDate.getDay();
    const inicioMin = inicioDate.getHours() * 60 + inicioDate.getMinutes();
    const finMin = inicioMin + duracion;

    let horarios = await HorarioOdontologo.findAll({
      where: { odontologoId: cita.odontologoId, diaSemana },
    });
    if (!horarios.length) {
      horarios = [{ horaInicio: "08:00", horaFin: "20:00" }];
    }

    const estaEnHorario = horarios.some((horario) => {
      const horaInicio = toMinutes(horario.horaInicio);
      const horaFin = toMinutes(horario.horaFin);
      return inicioMin >= horaInicio && finMin <= horaFin;
    });
    if (!estaEnHorario) {
      return res.status(400).json({ mensaje: "El horario seleccionado no esta disponible" });
    }

    // choques con otras citas del odontologo
    const choqueOdontologo = await Cita.findOne({
      where: {
        odontologoId: cita.odontologoId,
        id: { [Op.ne]: cita.id },
        estado: { [Op.in]: ESTADOS_ACTIVOS },
        [Op.and]: [
          { inicio: { [Op.lt]: addMinutes(finDate, GAP_MINUTES) } },
          { fin: { [Op.gt]: addMinutes(inicioDate, -GAP_MINUTES) } },
        ],
      },
    });
    if (choqueOdontologo) {
      return res.status(400).json({ mensaje: "El odontologo ya tiene una cita en ese horario" });
    }

    // choques con otras citas del paciente
    const choquePaciente = await Cita.findOne({
      where: {
        pacienteId,
        id: { [Op.ne]: cita.id },
        estado: { [Op.in]: ESTADOS_ACTIVOS },
        [Op.and]: [
          { inicio: { [Op.lt]: addMinutes(finDate, GAP_MINUTES) } },
          { fin: { [Op.gt]: addMinutes(inicioDate, -GAP_MINUTES) } },
        ],
      },
    });
    if (choquePaciente) {
      return res.status(400).json({ mensaje: "Ya tienes una cita en ese horario" });
    }

    cita.inicio = inicioDate;
    cita.fin = finDate;
    await cita.save();

    const actualizada = await Cita.findByPk(cita.id, {
      include: [{ model: Odontologo, as: "odontologo" }],
    });
    res.json(actualizada);
  } catch (error) {
    logger.error("Error al reprogramar cita:", error);
    res.status(500).json({ mensaje: "Error al reprogramar cita" });
  }
};

// Reprogramar como odontologo o admin (drag&drop)
export const reprogramarCitaOd = async (req, res) => {
  const { id } = req.params;
  const { nuevoInicio } = req.body;
  try {
    const cita = await Cita.findByPk(id);
    if (!cita) return res.status(404).json({ mensaje: "Cita no encontrada" });

    // Si es odontologo, validar pertenencia
    if (req.usuario?.rol === "odontologo") {
      const od = await Odontologo.findOne({ where: { userId: req.usuario.id } });
      if (!od || od.id !== cita.odontologoId) {
        return res.status(403).json({ mensaje: "No puedes reprogramar esta cita" });
      }
    }

    const inicioDate = parseToUtc(nuevoInicio);
    if (!inicioDate) {
      return res.status(400).json({ mensaje: "Fecha de inicio invalida" });
    }
    if (BLOCK_WEEKENDS && isWeekend(inicioDate)) {
      return res.status(400).json({ mensaje: "No se permiten citas en fin de semana" });
    }
    const now = new Date();
    const diffHours = (inicioDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < MIN_HOURS_BEFORE) {
      return res
        .status(400)
        .json({ mensaje: `Debe reprogramarse con al menos ${MIN_HOURS_BEFORE} horas de anticipacion` });
    }

    const odontologo = await Odontologo.findByPk(cita.odontologoId);
    if (!odontologo || !odontologo.activo) {
      return res.status(404).json({ mensaje: "Odontologo no encontrado" });
    }
    const duracion = durationForOdontologo(odontologo);
    const finDate = new Date(inicioDate.getTime() + duracion * 60 * 1000);

    // choques con otras citas del odontologo
    const choqueOdontologo = await Cita.findOne({
      where: {
        odontologoId: cita.odontologoId,
        id: { [Op.ne]: cita.id },
        estado: { [Op.in]: ESTADOS_ACTIVOS },
        [Op.and]: [
          { inicio: { [Op.lt]: addMinutes(finDate, GAP_MINUTES) } },
          { fin: { [Op.gt]: addMinutes(inicioDate, -GAP_MINUTES) } },
        ],
      },
    });
    if (choqueOdontologo) {
      return res.status(400).json({ mensaje: "El odontologo ya tiene una cita en ese horario" });
    }

    cita.inicio = inicioDate;
    cita.fin = finDate;
    await cita.save();

    const actualizada = await Cita.findByPk(cita.id, {
      include: [
        { model: Odontologo, as: "odontologo" },
        { model: Usuario, as: "paciente" },
      ],
    });
    res.json(actualizada);
  } catch (error) {
    logger.error("Error al reprogramar cita (od):", error);
    res.status(500).json({ mensaje: "Error al reprogramar cita" });
  }
};

// ADMIN: listar citas con filtros
export const adminListarCitas = async (req, res) => {
  const { odontologoId, pacienteId, desde, hasta, estado } = req.query;
  try {
    const where = {};
    if (odontologoId) where.odontologoId = odontologoId;
    if (pacienteId) where.pacienteId = pacienteId;
    if (estado) where.estado = estado;
    if (desde || hasta) {
      where.inicio = {};
      if (desde) {
        const d = new Date(desde);
        if (!Number.isNaN(d.getTime())) where.inicio[Op.gte] = d;
      }
      if (hasta) {
        const h = new Date(hasta);
        if (!Number.isNaN(h.getTime())) where.inicio[Op.lte] = h;
      }
    }

    const citas = await Cita.findAll({
      where,
      include: [
        { model: Odontologo, as: "odontologo" },
        { model: Usuario, as: "paciente" },
      ],
      order: [["inicio", "ASC"]],
    });

    res.json(citas);
  } catch (error) {
    logger.error("Admin listar citas:", error);
    res.status(500).json({ mensaje: "Error al listar citas" });
  }
};

// ADMIN: enviar recordatorio por WhatsApp (con fallback a email futuro)
export const adminEnviarRecordatorio = async (req, res) => {
  const { id } = req.params;
  try {
    // Configuracion requerida para WhatsApp Cloud API
    const hasWA = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
    if (!hasWA) {
      return res
        .status(501)
        .json({ mensaje: 'WhatsApp no esta configurado en el servidor', detalle: 'Define WHATSAPP_TOKEN y WHATSAPP_PHONE_ID en .env' });
    }

    const cita = await Cita.findByPk(id, {
      include: [
        { model: Odontologo, as: 'odontologo' },
        { model: Usuario, as: 'paciente' },
      ],
    });
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    const tel = cita.paciente?.telefono;
    const to = formatE164(tel);
    if (!to) return res.status(400).json({ mensaje: 'Paciente sin telefono valido' });

    const fecha = new Date(cita.inicio);
    const fechaStr = fecha.toLocaleString();
    const odont = cita.odontologo?.nombre || 'Odontologo';
    const nombre = cita.paciente?.nombre || 'Paciente';
    const text = `Hola ${nombre}, recordatorio de tu cita odontologica el ${fechaStr} con ${odont}. Si no puedes asistir, por favor cancela con anticipacion.`;

    const templateName = process.env.WHATSAPP_TEMPLATE || '';
    try {
      if (templateName) await sendTemplate(to, templateName, 'es');
      else await sendText(to, text);
      cita.recordatorioEnviado = true;
      await cita.save();
      return res.json({ mensaje: 'Recordatorio enviado', destino: to });
    } catch (waErr) {
      logger.error('Error WhatsApp:', waErr?.details || waErr);
      return res.status(502).json({ mensaje: 'No se pudo enviar por WhatsApp', detalle: waErr?.details || null });
    }
  } catch (error) {
    logger.error('Admin enviar recordatorio:', error);
    res.status(500).json({ mensaje: 'Error al enviar recordatorio' });
  }
};

// ADMIN: capability flag for WhatsApp availability
export const adminWhatsAppEnabled = async (_req, res) => {
  const enabled = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
  res.json({ enabled });
};

// ADMIN: crear cita para cualquier paciente
export const adminCrearCita = async (req, res) => {
  const { pacienteId, odontologoId, inicio, motivo } = req.body;
  if (!pacienteId || !odontologoId || !inicio) {
    return res.status(400).json({ mensaje: "Paciente, odontologo e inicio son requeridos" });
  }

  // Reutilizamos las validaciones de crearCita cambiando origen de pacienteId
  req.usuario = { id: pacienteId }; // para reutilizar la lógica existente
  return crearCita(req, res);
};

// ADMIN: actualizar cita (estado, motivo, reprogramar)
export const adminActualizarCita = async (req, res) => {
  const { id } = req.params;
  const { estado, motivo, nuevoInicio } = req.body;
  try {
    const cita = await Cita.findByPk(id);
    if (!cita) return res.status(404).json({ mensaje: "Cita no encontrada" });

    if (estado) cita.estado = estado;
    if (motivo !== undefined) cita.motivo = motivo;

    if (nuevoInicio) {
      const inicioDate = parseToUtc(nuevoInicio);
      if (!inicioDate) {
        return res.status(400).json({ mensaje: "Fecha de inicio invalida" });
      }
      if (BLOCK_WEEKENDS && isWeekend(inicioDate)) {
        return res.status(400).json({ mensaje: "No se permiten citas en fin de semana" });
      }
      const now = new Date();
      const diffHours = (inicioDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours < MIN_HOURS_BEFORE) {
        return res
          .status(400)
          .json({ mensaje: `Debe reprogramarse con al menos ${MIN_HOURS_BEFORE} horas de anticipacion` });
      }
      const odontologo = await Odontologo.findByPk(cita.odontologoId);
      const duracion = durationForOdontologo(odontologo);
      const finDate = new Date(inicioDate.getTime() + duracion * 60 * 1000);

      // choques
      const choque = await Cita.findOne({
        where: {
          odontologoId: cita.odontologoId,
          id: { [Op.ne]: cita.id },
          estado: { [Op.in]: ESTADOS_ACTIVOS },
          [Op.and]: [
            { inicio: { [Op.lt]: addMinutes(finDate, GAP_MINUTES) } },
            { fin: { [Op.gt]: addMinutes(inicioDate, -GAP_MINUTES) } },
          ],
        },
      });
      if (choque) return res.status(400).json({ mensaje: "Choque de horario" });

      cita.inicio = inicioDate;
      cita.fin = finDate;
    }

    await cita.save();
    const conRelaciones = await Cita.findByPk(cita.id, {
      include: [
        { model: Odontologo, as: "odontologo" },
        { model: Usuario, as: "paciente" },
      ],
    });
    res.json(conRelaciones);
  } catch (error) {
    logger.error("Admin actualizar cita:", error);
    res.status(500).json({ mensaje: "Error al actualizar cita" });
  }
};

// ADMIN: cancelar cita (sin validar propietario)
export const adminCancelarCita = async (req, res) => {
  const { id } = req.params;
  try {
    const cita = await Cita.findByPk(id);
    if (!cita) return res.status(404).json({ mensaje: "Cita no encontrada" });
    if (!ESTADOS_ACTIVOS.includes(cita.estado)) {
      return res.status(400).json({ mensaje: "No se puede cancelar una cita en este estado" });
    }
    cita.estado = "cancelada";
    await cita.save();
    res.json({ mensaje: "Cita cancelada correctamente" });
  } catch (error) {
    logger.error("Admin cancelar cita:", error);
    res.status(500).json({ mensaje: "Error al cancelar cita" });
  }
};
