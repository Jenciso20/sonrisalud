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

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/odontologos", odontologosRoutes);
app.use("/api/citas", citasRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 3000;
const shouldAlter = (process.env.DB_SYNC_ALTER || "").toLowerCase() === "true";
const syncOptions = shouldAlter ? { alter: true } : {};

sequelize
  .sync(syncOptions)
  .then(() => {
    console.log("Base de datos sincronizada correctamente.");
    // Aplicar migraciones ligeras (ADD COLUMN IF NOT EXISTS)
    (async () => {
      await runMigrations();
      // Bootstrap primer admin si no existe
      try {
        const admins = await Usuario.count({ where: { rol: "admin" } });
        if (admins === 0) {
          const adminEmail = process.env.ADMIN_EMAIL;
          const adminPassword = process.env.ADMIN_PASSWORD;
          const adminNombre = process.env.ADMIN_NOMBRE || "Administrador";
          if (adminEmail && adminPassword) {
            const hashed = await bcrypt.hash(adminPassword, 10);
            // Si ya existe un usuario con ese correo, lo promovemos a admin y actualizamos password
            const existente = await Usuario.findOne({ where: { correo: adminEmail } });
            if (existente) {
              existente.nombre = adminNombre;
              existente.password = hashed;
              existente.rol = "admin";
              await existente.save();
              console.log(`Usuario existente promovido a admin: ${adminEmail}`);
            } else {
              await Usuario.create({
                nombre: adminNombre,
                correo: adminEmail,
                password: hashed,
                rol: "admin",
              });
              console.log(`Admin inicial creado: ${adminEmail}`);
            }
          } else {
            console.warn("No hay ADMIN_EMAIL/ADMIN_PASSWORD definidos; crea un admin manualmente.");
          }
        }
      } catch (e) {
        console.error("Error al crear admin inicial:", e);
      }
    })();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => console.error("Error al conectar con la base de datos:", error));
