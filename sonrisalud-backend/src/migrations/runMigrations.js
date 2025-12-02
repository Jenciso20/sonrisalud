import { sequelize } from "../config/db.js";
import { logger } from "../utils/logger.js";

export async function runMigrations() {
  const queries = [
    // Usuarios
    `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "apellidos" VARCHAR NULL;`,
    `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "dni" VARCHAR NULL;`,
    `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "codigo_universitario" VARCHAR NULL;`,

    // Odontologos
    `ALTER TABLE "odontologos" ADD COLUMN IF NOT EXISTS "user_id" INTEGER NULL;`,

    // Citas: columnas clínicas
    `ALTER TABLE "citas" ADD COLUMN IF NOT EXISTS "diagnostico" TEXT NULL;`,
    `ALTER TABLE "citas" ADD COLUMN IF NOT EXISTS "tratamiento" TEXT NULL;`,
    `ALTER TABLE "citas" ADD COLUMN IF NOT EXISTS "observaciones" TEXT NULL;`,
    `ALTER TABLE "citas" ADD COLUMN IF NOT EXISTS "atendida_por" INTEGER NULL;`,
  ];

  for (const sql of queries) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      // Si alguna columna ya existe o hay otro error, lo registramos y seguimos
      logger.warn("Migration warning:", err?.message || err);
    }
  }
  logger.info("Migraciones basicas aplicadas (columns: usuarios/odontologos/citas).");
}
