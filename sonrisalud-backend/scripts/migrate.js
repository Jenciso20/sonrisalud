import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sequelize } from "../src/config/db.js";
import { logger } from "../src/utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../src/migrations/sql");

async function ensureTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      run_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function appliedMigrations() {
  const [rows] = await sequelize.query('SELECT name FROM schema_migrations');
  return new Set(rows.map((r) => r.name));
}

async function applyMigration(name, sql) {
  logger.info(`Aplicando migracion ${name}`);
  await sequelize.query(sql);
  await sequelize.query('INSERT INTO schema_migrations(name) VALUES ($1) ON CONFLICT DO NOTHING', {
    bind: [name],
  });
}

async function main() {
  if (!fs.existsSync(migrationsDir)) {
    logger.warn("Sin carpeta de migraciones, nada que ejecutar.");
    return;
  }

  await ensureTable();
  const done = await appliedMigrations();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (done.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await applyMigration(file, sql);
  }

  logger.info("Migraciones SQL aplicadas");
}

main()
  .catch((err) => {
    logger.error("Error al ejecutar migraciones:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch (e) {
      logger.warn("No se pudo cerrar la conexion de BD:", e);
    }
  });
