import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { Usuario } from "../models/Usuario.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4200";
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_SECURE =
  (process.env.EMAIL_SECURE || "").toLowerCase() === "true" || EMAIL_PORT === 465;

// Login
export const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    const usuario = await Usuario.findOne({ where: { correo } });
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
    console.error(error);
    res.status(500).json({ mensaje: "Error al iniciar sesion" });
  }
};

// Registro
export const register = async (req, res) => {
  try {
    const { nombre, correo, password, telefono } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
    }

    const existeUsuario = await Usuario.findOne({ where: { correo } });
    if (existeUsuario) {
      return res.status(400).json({ mensaje: "El correo ya esta registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await Usuario.create({
      nombre,
      correo,
      password: hashedPassword,
      rol: "paciente",
      telefono: telefono || null,
    });

    res.json({ mensaje: "Usuario registrado correctamente", usuario: nuevoUsuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al registrar usuario" });
  }
};

// Recuperar contrasena
export const recoverPassword = async (req, res) => {
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

    console.log(`Enlace de recuperacion generado para ${correo}: ${link}`);
    res.json({ mensaje: "Correo de recuperacion enviado. Revisa tu bandeja de entrada." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al enviar el correo." });
  }
};

// Restablecer contrasena
export const resetPassword = async (req, res) => {
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
    console.error(error);
    res.status(400).json({ mensaje: "Token invalido o expirado" });
  }
};
