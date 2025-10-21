import { Op } from "sequelize";
import { Cita } from "../models/Cita.js";
import { Odontologo } from "../models/Odontologo.js";
import { HorarioOdontologo } from "../models/HorarioOdontologo.js";
import { Usuario } from "../models/Usuario.js";

const ESTADOS_ACTIVOS = ["pendiente", "confirmada"];

const toMinutes = (timeString) => {
  const [h, m] = timeString.split(":").map(Number);
  return h * 60 + m;
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
    console.error("Error al listar citas:", error);
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

    const inicioDate = new Date(inicio);
    if (Number.isNaN(inicioDate.getTime())) {
      return res.status(400).json({ mensaje: "Fecha de inicio invalida" });
    }

    const now = new Date();
    if (inicioDate <= now) {
      return res.status(400).json({ mensaje: "La cita debe programarse a futuro" });
    }

    const duracion = 60; // citas de 1 hora
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

    const choqueOdontologo = await Cita.findOne({
      where: {
        odontologoId,
        estado: { [Op.in]: ESTADOS_ACTIVOS },
        [Op.and]: [
          { inicio: { [Op.lt]: finDate } },
          { fin: { [Op.gt]: inicioDate } },
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
          { inicio: { [Op.lt]: finDate } },
          { fin: { [Op.gt]: inicioDate } },
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
    console.error("Error al crear cita:", error);
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
    console.error("Error al cancelar cita:", error);
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

    const duracion = 60; // citas de 1 hora
    const milisegundosDuracion = duracion * 60 * 1000;
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
          return inicioSlot < citaFin && finSlot > citaInicio;
        });

        if (!hayChoque) {
          slots.push({
            inicio: inicioSlot.toISOString(),
            fin: finSlot.toISOString(),
            etiqueta: formatSlot(inicioSlot, finSlot),
          });
        }

        cursor = new Date(cursor.getTime() + milisegundosDuracion);
      }
    });

    slots.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

    res.json({ slots, duracion });
  } catch (error) {
    console.error("Error al obtener disponibilidad:", error);
    res.status(500).json({ mensaje: "Error al obtener disponibilidad" });
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

    const inicioDate = new Date(nuevoInicio);
    if (Number.isNaN(inicioDate.getTime())) {
      return res.status(400).json({ mensaje: "Fecha de inicio invalida" });
    }
    const now = new Date();
    if (inicioDate <= now) {
      return res.status(400).json({ mensaje: "La cita debe programarse a futuro" });
    }

    const odontologo = await Odontologo.findByPk(cita.odontologoId);
    if (!odontologo || !odontologo.activo) {
      return res.status(404).json({ mensaje: "Odontologo no encontrado" });
    }
    const duracion = 60; // citas de 1 hora
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
          { inicio: { [Op.lt]: finDate } },
          { fin: { [Op.gt]: inicioDate } },
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
          { inicio: { [Op.lt]: finDate } },
          { fin: { [Op.gt]: inicioDate } },
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
    console.error("Error al reprogramar cita:", error);
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
    console.error("Admin listar citas:", error);
    res.status(500).json({ mensaje: "Error al listar citas" });
  }
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
      const inicioDate = new Date(nuevoInicio);
      if (Number.isNaN(inicioDate.getTime())) {
        return res.status(400).json({ mensaje: "Fecha de inicio invalida" });
      }
      const odontologo = await Odontologo.findByPk(cita.odontologoId);
      const duracion = 60; // citas de 1 hora
      const finDate = new Date(inicioDate.getTime() + duracion * 60 * 1000);

      // choques
      const choque = await Cita.findOne({
        where: {
          odontologoId: cita.odontologoId,
          id: { [Op.ne]: cita.id },
          estado: { [Op.in]: ESTADOS_ACTIVOS },
          [Op.and]: [
            { inicio: { [Op.lt]: finDate } },
            { fin: { [Op.gt]: inicioDate } },
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
    console.error("Admin actualizar cita:", error);
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
    console.error("Admin cancelar cita:", error);
    res.status(500).json({ mensaje: "Error al cancelar cita" });
  }
};
