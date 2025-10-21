import { Odontologo } from "../models/Odontologo.js";
import { HorarioOdontologo } from "../models/HorarioOdontologo.js";
import { Cita } from "../models/Cita.js";
import { Op } from "sequelize";
import { Usuario } from "../models/Usuario.js";
import { crearCita as crearCitaPaciente } from "./citas.controller.js";

export const listarOdontologos = async (req, res) => {
  try {
    const odontologos = await Odontologo.findAll({
      where: { activo: true },
      include: [
        {
          model: HorarioOdontologo,
          as: "horarios",
        },
      ],
      order: [["nombre", "ASC"]],
    });

    res.json(odontologos);
  } catch (error) {
    console.error("Error al listar odontologos:", error);
    res.status(500).json({ mensaje: "Error al listar odontologos" });
  }
};

export const crearOdontologo = async (req, res) => {
  const { nombre, correo, especialidad, telefono, duracionConsulta, horarios = [] } = req.body;

  try {
    const existe = await Odontologo.findOne({ where: { correo } });
    if (existe) {
      return res.status(400).json({ mensaje: "El correo ya esta registrado para un odontologo" });
    }

    const odontologo = await Odontologo.create({
      nombre,
      correo,
      especialidad,
      telefono,
      duracionConsulta,
    });

    if (Array.isArray(horarios) && horarios.length > 0) {
      const horariosConId = horarios.map((horario) => ({
        ...horario,
        odontologoId: odontologo.id,
      }));
      await HorarioOdontologo.bulkCreate(horariosConId);
    }

    const creado = await Odontologo.findByPk(odontologo.id, {
      include: [{ model: HorarioOdontologo, as: "horarios" }],
    });

    res.status(201).json(creado);
  } catch (error) {
    console.error("Error al crear odontologo:", error);
    res.status(500).json({ mensaje: "Error al crear odontologo" });
  }
};

export const agenda = async (req, res) => {
  const { odontologoId, desde, hasta } = req.query;
  if (!odontologoId || !desde || !hasta) {
    return res.status(400).json({ mensaje: "odontologoId, desde y hasta son requeridos" });
  }
  try {
    const d = new Date(desde);
    const h = new Date(hasta);
    if (Number.isNaN(d.getTime()) || Number.isNaN(h.getTime())) {
      return res.status(400).json({ mensaje: "Rango de fechas invalido" });
    }
    const citas = await Cita.findAll({
      where: {
        odontologoId,
        inicio: { [Op.between]: [d, h] },
      },
      order: [["inicio", "ASC"]],
    });
    res.json(citas);
  } catch (error) {
    console.error("Error agenda odontologo:", error);
    res.status(500).json({ mensaje: "Error al obtener agenda" });
  }
};

export const atenderCita = async (req, res) => {
  const { id } = req.params;
  const { diagnostico, tratamiento, observaciones } = req.body;
  try {
    const cita = await Cita.findByPk(id);
    if (!cita) return res.status(404).json({ mensaje: "Cita no encontrada" });
    cita.diagnostico = diagnostico ?? cita.diagnostico;
    cita.tratamiento = tratamiento ?? cita.tratamiento;
    cita.observaciones = observaciones ?? cita.observaciones;
    cita.estado = "atendida";
    cita.atendidaPor = cita.odontologoId;
    await cita.save();
    res.json({ mensaje: "Cita actualizada" });
  } catch (error) {
    console.error("Error al atender cita:", error);
    res.status(500).json({ mensaje: "Error al actualizar cita" });
  }
};

// Lista basica de pacientes para uso de odontologos
export const listarPacientesParaOdontologo = async (req, res) => {
  try {
    const pacientes = await Usuario.findAll({
      where: { rol: "paciente" },
      attributes: ["id", "nombre", "correo"],
      order: [["nombre", "ASC"]],
    });
    res.json(pacientes);
  } catch (error) {
    console.error("Error al listar pacientes para odontologo:", error);
    res.status(500).json({ mensaje: "Error al listar pacientes" });
  }
};

// Permite a un odontologo crear una cita indicando pacienteId
export const crearCitaParaPaciente = async (req, res) => {
  const usuario = req.usuario; // odontologo o admin autenticado
  const { pacienteId, inicio, motivo, odontologoId: bodyOdId } = req.body || {};
  try {
    if (!pacienteId || !inicio) {
      return res.status(400).json({ mensaje: "Paciente e inicio son requeridos" });
    }
    let odontologoId = null; // JS: sin anotaciones de tipo
    if (usuario.rol === 'admin') {
      if (!bodyOdId) return res.status(400).json({ mensaje: 'Odontologo requerido' });
      odontologoId = bodyOdId;
    } else {
      // Mapear odontologo (modelo) a partir del usuario autenticado
      const od = await Odontologo.findOne({ where: { userId: usuario.id } });
      if (!od) return res.status(404).json({ mensaje: 'Odontologo no vinculado a usuario' });
      odontologoId = od.id;
    }
    // Reutilizar las validaciones de crearCita para este paciente y este odontologo
    req.body = { odontologoId, inicio, motivo };
    req.usuario = { id: pacienteId };
    return crearCitaPaciente(req, res);
  } catch (error) {
    console.error("Error odontologo crear cita:", error);
    res.status(500).json({ mensaje: "Error al crear cita" });
  }
};
