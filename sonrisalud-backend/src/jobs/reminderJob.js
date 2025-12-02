import nodemailer from "nodemailer";
import { Op } from "sequelize";
import { Cita } from "../models/Cita.js";
import { Usuario } from "../models/Usuario.js";
import { Odontologo } from "../models/Odontologo.js";
import { sendTemplate, sendText, formatE164 } from "../services/whatsapp.service.js";
import { logger } from "../utils/logger.js";

const REMINDER_ENABLED = (process.env.REMINDER_ENABLED || "").toLowerCase() === "true";
const REMINDER_HOURS_BEFORE = Number(process.env.REMINDER_HOURS_BEFORE || 24);
const REMINDER_INTERVAL_MS = Number(process.env.REMINDER_INTERVAL_MS || 5 * 60 * 1000);

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_SECURE =
  (process.env.EMAIL_SECURE || "").toLowerCase() === "true" || EMAIL_PORT === 465;

function buildTransporter() {
  if (!EMAIL_USER || !EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_SECURE,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

const transporter = buildTransporter();

const formatIcsDate = (date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

function buildIcs(cita, paciente, odontologo) {
  const start = formatIcsDate(new Date(cita.inicio));
  const end = formatIcsDate(new Date(cita.fin));
  const now = formatIcsDate(new Date());
  const summary = `Cita odontologica con ${odontologo?.nombre || "Odontologo"}`;
  const description = cita.motivo || "Cita programada";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SonriSalud//EN",
    "BEGIN:VEVENT",
    `UID:cita-${cita.id}@sonrisalud`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `ORGANIZER;CN=SonriSalud:mailto:${EMAIL_USER || "noreply@sonrisalud.local"}`,
    `ATTENDEE;CN=${paciente?.nombre || "Paciente"}:mailto:${paciente?.correo || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

async function sendEmailReminder(cita, paciente, odontologo) {
  if (!transporter || !paciente?.correo) return false;
  const ics = buildIcs(cita, paciente, odontologo);
  const fechaStr = new Date(cita.inicio).toLocaleString();
  const mail = {
    from: `"SonriSalud" <${EMAIL_USER}>`,
    to: paciente.correo,
    subject: "Recordatorio de cita odontologica",
    text: `Hola ${paciente.nombre || ""}, te recordamos tu cita el ${fechaStr} con ${odontologo?.nombre || "tu odontologo"}.\nMotivo: ${cita.motivo || "consulta"}\nSi no puedes asistir, por favor responde este mensaje.`,
    attachments: [
      {
        filename: "cita.ics",
        content: ics,
        contentType: "text/calendar",
      },
    ],
  };
  await transporter.sendMail(mail);
  return true;
}

async function sendWhatsappReminder(cita, paciente, odontologo) {
  const hasWA = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
  if (!hasWA) return false;
  const tel = paciente?.telefono;
  const to = tel ? formatE164(tel) : null;
  if (!to) return false;
  const fechaStr = new Date(cita.inicio).toLocaleString();
  const odont = odontologo?.nombre || "Odontologo";
  const nombre = paciente?.nombre || "Paciente";
  const text = `Hola ${nombre}, recordatorio de tu cita odontologica el ${fechaStr} con ${odont}. Si no puedes asistir, por favor cancela con anticipacion.`;
  try {
    const templateName = process.env.WHATSAPP_TEMPLATE || "";
    if (templateName) await sendTemplate(to, templateName, "es");
    else await sendText(to, text);
    return true;
  } catch (e) {
    logger.warn("No se pudo enviar WhatsApp:", e?.details || e?.message || e);
    return false;
  }
}

async function processReminders() {
  const now = new Date();
  const limite = new Date(now.getTime() + REMINDER_HOURS_BEFORE * 60 * 60 * 1000);
  try {
    const citas = await Cita.findAll({
      where: {
        recordatorioEnviado: false,
        estado: { [Op.in]: ["pendiente", "confirmada"] },
        inicio: { [Op.between]: [now, limite] },
      },
      include: [
        { model: Usuario, as: "paciente" },
        { model: Odontologo, as: "odontologo" },
      ],
    });

    for (const cita of citas) {
      const paciente = cita.paciente;
      const odontologo = cita.odontologo;
      let enviado = false;

      // Primero WhatsApp, luego fallback a email
      enviado = await sendWhatsappReminder(cita, paciente, odontologo);
      if (!enviado) {
        try {
          enviado = await sendEmailReminder(cita, paciente, odontologo);
        } catch (e) {
          logger.warn("No se pudo enviar email:", e?.message || e);
        }
      }

      if (enviado) {
        cita.recordatorioEnviado = true;
        await cita.save();
        logger.info(`Recordatorio marcado para cita ${cita.id}`);
      }
    }
  } catch (error) {
    logger.error("Error en job de recordatorios:", error);
  }
}

export function startReminderJob() {
  if (!REMINDER_ENABLED) {
    logger.info("Recordatorios automaticos deshabilitados (REMINDER_ENABLED=false)");
    return;
  }
  logger.info(
    `Job de recordatorios activo: cada ${Math.round(
      REMINDER_INTERVAL_MS / 60000
    )} min, ${REMINDER_HOURS_BEFORE}h antes de la cita`
  );
  // Primera ejecucion
  processReminders();
  setInterval(processReminders, REMINDER_INTERVAL_MS);
}
