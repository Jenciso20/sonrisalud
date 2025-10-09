import bcrypt from "bcryptjs";
import { Usuario } from "../models/Usuario.js";
import { Odontologo } from "../models/Odontologo.js";
import { Cita } from "../models/Cita.js";
import { HorarioOdontologo } from "../models/HorarioOdontologo.js";

export const listarPacientes = async (req, res) => {
  try {
    const pacientes = await Usuario.findAll({
      where: { rol: "paciente" },
      attributes: ["id", "nombre", "correo", "telefono"],
      order: [["nombre", "ASC"]],
    });
    res.json(pacientes);
  } catch (error) {
    console.error("Admin listar pacientes:", error);
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
    console.error("Admin actualizar paciente:", error);
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
    console.error("Admin eliminar paciente:", error);
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
    console.error("Admin actualizar odontologo:", error);
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
    console.error("Admin eliminar odontologo:", error);
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
    console.error("Admin listar usuarios:", error);
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
    res.json({ mensaje: "Rol actualizado", usuario: { id: usuario.id, rol: usuario.rol } });
  } catch (error) {
    console.error("Admin actualizar rol:", error);
    res.status(500).json({ mensaje: "Error al actualizar rol" });
  }
};
