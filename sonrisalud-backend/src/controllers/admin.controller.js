import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { Usuario } from "../models/Usuario.js";
import { Odontologo } from "../models/Odontologo.js";
import { Cita } from "../models/Cita.js";
import { HorarioOdontologo } from "../models/HorarioOdontologo.js";
import { logger } from "../utils/logger.js";

export const listarPacientes = async (req, res) => {
  try {
    const pacientes = await Usuario.findAll({
      where: { rol: "paciente" },
      attributes: ["id", "nombre", "correo", "telefono", "dni", "codigoUniversitario"],
      order: [["nombre", "ASC"]],
    });
    res.json(pacientes);
  } catch (error) {
    logger.error("Admin listar pacientes:", error);
    res.status(500).json({ mensaje: "Error al listar pacientes" });
  }
};

export const actualizarPaciente = async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, telefono, fotoUrl, password } = req.body || {};
  try {
    const paciente = await Usuario.findByPk(id);
    if (!paciente || paciente.rol !== "paciente") {
      return res.status(404).json({ mensaje: "Paciente no encontrado" });
    }
    if (nombre !== undefined) paciente.nombre = nombre;
    if (correo !== undefined) paciente.correo = correo;
    if (telefono !== undefined) paciente.telefono = telefono;
    if (fotoUrl !== undefined) paciente.fotoUrl = fotoUrl;
    if (password) paciente.password = await bcrypt.hash(password, 10);

    await paciente.save();
    res.json({ mensaje: "Paciente actualizado", paciente });
  } catch (error) {
    logger.error("Admin actualizar paciente:", error);
    res.status(500).json({ mensaje: "Error al actualizar paciente" });
  }
};

export const eliminarPaciente = async (req, res) => {
  const { id } = req.params;
  try {
    const paciente = await Usuario.findByPk(id);
    if (!paciente || paciente.rol !== "paciente") {
      return res.status(404).json({ mensaje: "Paciente no encontrado" });
    }

    const citas = await Cita.count({ where: { pacienteId: id } });
    if (citas > 0) {
      return res
        .status(400)
        .json({ mensaje: "No se puede eliminar: el paciente tiene citas asociadas" });
    }

    await paciente.destroy();
    res.json({ mensaje: "Paciente eliminado" });
  } catch (error) {
    logger.error("Admin eliminar paciente:", error);
    res.status(500).json({ mensaje: "Error al eliminar paciente" });
  }
};

export const actualizarOdontologo = async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, especialidad, telefono, duracionConsulta, activo } = req.body || {};
  try {
    const odontologo = await Odontologo.findByPk(id);
    if (!odontologo) {
      return res.status(404).json({ mensaje: "Odontologo no encontrado" });
    }
    if (nombre !== undefined) odontologo.nombre = nombre;
    if (correo !== undefined) odontologo.correo = correo;
    if (especialidad !== undefined) odontologo.especialidad = especialidad;
    if (telefono !== undefined) odontologo.telefono = telefono;
    if (duracionConsulta !== undefined) odontologo.duracionConsulta = duracionConsulta;
    if (activo !== undefined) odontologo.activo = !!activo;

    await odontologo.save();
    res.json({ mensaje: "Odontologo actualizado", odontologo });
  } catch (error) {
    logger.error("Admin actualizar odontologo:", error);
    res.status(500).json({ mensaje: "Error al actualizar odontologo" });
  }
};

export const eliminarOdontologo = async (req, res) => {
  const { id } = req.params;
  try {
    const odontologo = await Odontologo.findByPk(id);
    if (!odontologo) {
      return res.status(404).json({ mensaje: "Odontologo no encontrado" });
    }

    const citas = await Cita.count({ where: { odontologoId: id } });
    if (citas > 0) {
      return res
        .status(400)
        .json({ mensaje: "No se puede eliminar: el odontologo tiene citas asociadas" });
    }

    await HorarioOdontologo.destroy({ where: { odontologoId: id } });
    await odontologo.destroy();
    res.json({ mensaje: "Odontologo eliminado" });
  } catch (error) {
    logger.error("Admin eliminar odontologo:", error);
    res.status(500).json({ mensaje: "Error al eliminar odontologo" });
  }
};

export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ["id", "nombre", "correo", "rol"],
      order: [["nombre", "ASC"]],
    });
    res.json(usuarios);
  } catch (error) {
    logger.error("Admin listar usuarios:", error);
    res.status(500).json({ mensaje: "Error al listar usuarios" });
  }
};

const ROLES_PERMITIDOS = ["paciente", "odontologo", "admin"];

export const actualizarRolUsuario = async (req, res) => {
  const { id } = req.params;
  const { rol } = req.body || {};
  try {
    if (!ROLES_PERMITIDOS.includes(rol)) {
      return res.status(400).json({ mensaje: "Rol invalido" });
    }
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    usuario.rol = rol;
    await usuario.save();

    // Si pasa a rol odontologo, asegurar registro en catalogo de odontologos
    if (rol === "odontologo") {
      const correo = usuario.correo;
      const nombre = usuario.nombre || "Odontologo";
      let od = await Odontologo.findOne({ where: { correo } });
      if (od) {
        od.nombre = nombre;
        od.userId = usuario.id;
        od.activo = true;
        await od.save();
      } else {
        await Odontologo.create({
          nombre,
          correo,
          especialidad: "General",
          telefono: usuario.telefono || null,
          duracionConsulta: 30,
          userId: usuario.id,
          activo: true,
        });
      }
    }

    res.json({ mensaje: "Rol actualizado", usuario: { id: usuario.id, rol: usuario.rol } });
  } catch (error) {
    logger.error("Admin actualizar rol:", error);
    res.status(500).json({ mensaje: "Error al actualizar rol" });
  }
};

export const reportesCitas = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const where = {};
    if (desde || hasta) {
      where.inicio = {};
      if (desde) where.inicio[Op.gte] = new Date(desde);
      if (hasta) where.inicio[Op.lte] = new Date(hasta);
    }
    const totalPendientes = await Cita.count({ where: { ...where, estado: 'pendiente' } });
    const totalConfirmadas = await Cita.count({ where: { ...where, estado: 'confirmada' } });
    const totalCanceladas = await Cita.count({ where: { ...where, estado: 'cancelada' } });
    const totalAtendidas = await Cita.count({ where: { ...where, estado: 'atendida' } });
    res.json({ pendientes: totalPendientes, confirmadas: totalConfirmadas, canceladas: totalCanceladas, atendidas: totalAtendidas });
  } catch (error) {
    logger.error('Admin reportes citas:', error);
    res.status(500).json({ mensaje: 'Error al generar reportes' });
  }
};

export const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    if (usuario.id === req.usuario?.id) {
      return res.status(400).json({ mensaje: "No puedes eliminar tu propia cuenta" });
    }

    if (usuario.rol === "admin") {
      const totalAdmins = await Usuario.count({ where: { rol: "admin", id: { [Op.ne]: usuario.id } } });
      if (totalAdmins === 0) {
        return res.status(400).json({ mensaje: "No se puede eliminar el ultimo admin" });
      }
    }

    // Eliminar citas y dependencias de manera forzada para admin
    await Cita.destroy({ where: { pacienteId: usuario.id } });
    const od = await Odontologo.findOne({
      where: { [Op.or]: [{ userId: usuario.id }, { correo: usuario.correo }] },
    });
    if (od) {
      await Cita.destroy({ where: { odontologoId: od.id } });
      await HorarioOdontologo.destroy({ where: { odontologoId: od.id } });
      await od.destroy();
    }

    await usuario.destroy();
    res.json({ mensaje: "Usuario eliminado" });
  } catch (error) {
    logger.error("Admin eliminar usuario:", error);
    res.status(500).json({ mensaje: "Error al eliminar usuario" });
  }
};
