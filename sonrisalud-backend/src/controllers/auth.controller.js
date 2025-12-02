import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { Usuario } from "../models/Usuario.js";
import { logger } from "../utils/logger.js";
import {
  validateLoginPayload,
  validateRecoverPayload,
  validateRegisterPayload,
  validateResetPayload,
  validateProfilePayload,
} from "../utils/validators.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4200";
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_SECURE =
  (process.env.EMAIL_SECURE || "").toLowerCase() === "true" || EMAIL_PORT === 465;

// Login
export const login = async (req, res) => {
  const validation = validateLoginPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ mensaje: "Datos invalidos", errores: validation.errors });
  }

  try {
    const { correo, password } = req.body;
    const correoLower = correo.toLowerCase().trim();

    const usuario = await Usuario.findOne({ where: { correo: correoLower } });
    if (!usuario) {
      return res.status(400).json({ mensaje: "Usuario no encontrado" });
    }

    const validPassword = await bcrypt.compare(password, usuario.password);
    if (!validPassword) {
      return res.status(401).json({ mensaje: "Contrasena incorrecta" });
    }

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ mensaje: "Login exitoso", token });
  } catch (error) {
    logger.error("login error", error);
    res.status(500).json({ mensaje: "Error al iniciar sesion" });
  }
};

// Registro
export const register = async (req, res) => {
  const validation = validateRegisterPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ mensaje: "Datos invalidos", errores: validation.errors });
  }

  try {
    const { nombre, apellidos, correo, password, telefono, dni, codigoUniversitario } = req.body;

    const correoLower = String(correo).toLowerCase().trim();

    const existeUsuario = await Usuario.findOne({ where: { correo: correoLower } });
    if (existeUsuario) {
      return res.status(400).json({ mensaje: "El correo ya esta registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await Usuario.create({
      nombre,
      apellidos: apellidos || null,
      correo: correoLower,
      password: hashedPassword,
      rol: "paciente",
      telefono: telefono || null,
      dni: dni || null,
      codigoUniversitario: codigoUniversitario || null,
    });

    res.json({ mensaje: "Usuario registrado correctamente", usuario: nuevoUsuario });
  } catch (error) {
    logger.error("register error", error);
    res.status(500).json({ mensaje: "Error al registrar usuario" });
  }
};

// Recuperar contrasena
export const recoverPassword = async (req, res) => {
  const validation = validateRecoverPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ mensaje: "Correo invalido", errores: validation.errors });
  }

  const { correo } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { correo } });
    if (!usuario) {
      return res.status(404).json({ mensaje: "No existe una cuenta con ese correo." });
    }

    if (!EMAIL_USER || !EMAIL_PASS) {
      return res
        .status(500)
        .json({ mensaje: "El servidor de correo no esta configurado correctamente." });
    }

    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const link = `${FRONTEND_URL}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"SonriSalud" <${EMAIL_USER}>`,
      to: correo,
      subject: "Recuperacion de contrasena",
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;text-align:center;">
          <h2>Recuperacion de contrasena</h2>
          <p>Haz clic en el siguiente enlace para restablecer tu contrasena:</p>
          <a href="${link}" style="background:#0984e3;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Restablecer contrasena</a>
          <p style="margin-top:15px;">Este enlace expira en 15 minutos.</p>
        </div>
      `,
    });

    logger.info(`Enlace de recuperacion generado para ${correo}: ${link}`);
    res.json({ mensaje: "Correo de recuperacion enviado. Revisa tu bandeja de entrada." });
  } catch (error) {
    logger.error("recover error", error);
    res.status(500).json({ mensaje: "Error al enviar el correo." });
  }
};

// Restablecer contrasena
export const resetPassword = async (req, res) => {
  const validation = validateResetPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ mensaje: "Datos invalidos", errores: validation.errors });
  }

  try {
    const { token, nuevaPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.id);

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const hashed = await bcrypt.hash(nuevaPassword, 10);
    usuario.password = hashed;
    await usuario.save();

    res.json({ mensaje: "Contrasena actualizada correctamente." });
  } catch (error) {
    logger.error("reset error", error);
    res.status(400).json({ mensaje: "Token invalido o expirado" });
  }
};

// Perfil propio
export const getProfile = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: ["id", "nombre", "apellidos", "correo", "telefono", "dni", "codigoUniversitario", "rol"],
    });
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    res.json(usuario);
  } catch (error) {
    logger.error("getProfile error", error);
    res.status(500).json({ mensaje: "Error al obtener perfil" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id);
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const validation = validateProfilePayload(req.body || {});
    if (!validation.valid) {
      return res.status(400).json({ mensaje: "Datos invalidos", errores: validation.errors });
    }

    const { nombre, apellidos, telefono, dni, codigoUniversitario, newPassword, currentPassword } = req.body || {};

    if (nombre !== undefined) usuario.nombre = nombre;
    if (apellidos !== undefined) usuario.apellidos = apellidos;
    if (telefono !== undefined) usuario.telefono = telefono;
    if (dni !== undefined) usuario.dni = dni;
    if (codigoUniversitario !== undefined) usuario.codigoUniversitario = codigoUniversitario;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ mensaje: "Debes ingresar tu password actual" });
      }
      const ok = await bcrypt.compare(currentPassword, usuario.password);
      if (!ok) {
        return res.status(400).json({ mensaje: "Password actual incorrecto" });
      }
      usuario.password = await bcrypt.hash(newPassword, 10);
    }

    await usuario.save();
    res.json({
      mensaje: "Perfil actualizado",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        telefono: usuario.telefono,
        dni: usuario.dni,
        codigoUniversitario: usuario.codigoUniversitario,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    logger.error("updateProfile error", error);
    res.status(500).json({ mensaje: "Error al actualizar perfil" });
  }
};
