import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import odontologosRoutes from "./routes/odontologos.routes.js";
import citasRoutes from "./routes/citas.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { runMigrations } from "./migrations/runMigrations.js";
import "./models/index.js";
import { Usuario } from "./models/Usuario.js";
import bcrypt from "bcryptjs";
import { rateLimit } from "./middleware/rateLimit.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { logger } from "./utils/logger.js";
import { startReminderJob } from "./jobs/reminderJob.js";

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origen (como Postman o server-to-server)
    if (!origin) return callback(null, true);

    // Si no hay orígenes definidos, permitir todos (modo desarrollo/debug)
    if (allowedOrigins.length === 0) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      logger.warn(`Origen bloqueado por CORS: ${origin}`);
      return callback(new Error("Origen no permitido por CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
  optionsSuccessStatus: 204,
};

if (allowedOrigins.length > 0) {
  logger.info(`Orígenes CORS permitidos: ${allowedOrigins.join(", ")}`);
} else {
  logger.warn("No se han configurado orígenes para CORS. Se permitirá cualquier origen.");
}

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

// Health check route, útil para despliegues y monitoreo
app.get("/", (req, res) => {
  res.json({
    mensaje: "Backend running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// Endpoint temporal para inicializar la BD en Vercel (Seed)
app.get("/api/seed-admin", async (req, res) => {
  try {
    await sequelize.sync(syncOptions);
    await runMigrations();

    const admins = await Usuario.count({ where: { rol: "admin" } });
    if (admins === 0) {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminNombre = process.env.ADMIN_NOMBRE || "Administrador";

      if (adminEmail && adminPassword) {
        const hashed = await bcrypt.hash(adminPassword, 10);
        const existente = await Usuario.findOne({ where: { correo: adminEmail } });

        if (existente) {
          existente.nombre = adminNombre;
          existente.password = hashed;
          existente.rol = "admin";
          await existente.save();
          return res.json({ message: `Usuario existente promovido a admin: ${adminEmail}` });
        } else {
          await Usuario.create({
            nombre: adminNombre,
            correo: adminEmail,
            password: hashed,
            rol: "admin",
          });
          return res.json({ message: `Admin inicial creado: ${adminEmail}` });
        }
      } else {
        return res.status(400).json({ message: "Faltan variables de entorno ADMIN_EMAIL / ADMIN_PASSWORD" });
      }
    }
    return res.json({ message: "El administrador ya existe" });
  } catch (error) {
    logger.error("Error en seed-admin:", error);
    res.status(500).json({ message: "Error interno al crear admin", error: error.message });
  }
});

// Rate limit solo para rutas sensibles (auth y recuperación)
const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 30),
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/odontologos", odontologosRoutes);
app.use("/api/citas", citasRoutes);
app.use("/api/admin", adminRoutes);

// Error handler global
app.use((err, _req, res, _next) => {
  logger.error("Error no controlado", err);
  if (err?.message?.includes("CORS")) {
    return res.status(401).json({ mensaje: "Origen no permitido por CORS" });
  }
  return res.status(500).json({ mensaje: "Error interno del servidor" });
});

const PORT = process.env.PORT || 3000;
const shouldAlter = (process.env.DB_SYNC_ALTER || "").toLowerCase() === "true";
const syncOptions = shouldAlter ? { alter: true } : {};

// Función para iniciar el servidor localmente
// Función para iniciar el servidor localmente
const startServer = async () => {
  try {
    await sequelize.authenticate(); // Verificar conexión primero
    logger.info("Conexión a base de datos establecida.");

    await sequelize.sync(syncOptions);
    logger.info("Base de datos sincronizada correctamente.");

    // Aplicar migraciones ligeras (ADD COLUMN IF NOT EXISTS)
    await runMigrations();

    // Bootstrap primer admin si no existe
    const admins = await Usuario.count({ where: { rol: "admin" } });
    if (admins === 0) {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminNombre = process.env.ADMIN_NOMBRE || "Administrador";
      if (adminEmail && adminPassword) {
        const hashed = await bcrypt.hash(adminPassword, 10);
        const existente = await Usuario.findOne({ where: { correo: adminEmail } });
        if (existente) {
          existente.nombre = adminNombre;
          existente.password = hashed;
          existente.rol = "admin";
          await existente.save();
          logger.info(`Usuario existente promovido a admin: ${adminEmail}`);
        } else {
          await Usuario.create({
            nombre: adminNombre,
            correo: adminEmail,
            password: hashed,
            rol: "admin",
          });
          logger.info(`Admin inicial creado: ${adminEmail}`);
        }
      } else {
        logger.warn("No hay ADMIN_EMAIL/ADMIN_PASSWORD definidos; crea un admin manualmente.");
      }
    }

    app.listen(PORT, () => {
      logger.info(`Servidor corriendo en http://localhost:${PORT}`);
      startReminderJob();
    });
  } catch (error) {
    logger.error("Error al iniciar el servidor:", error);
  }
};

// Solo iniciar el servidor si se ejecuta directamente (no importado)
// y si NO estamos en un entorno serverless que exporta la app (como Vercel)
// Vercel setea process.env.VERCEL = "1"
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  startServer();
}

export default app;
