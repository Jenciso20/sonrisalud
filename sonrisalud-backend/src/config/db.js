import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import * as pgModule from "pg";

dotenv.config();

const pg = pgModule.default || pgModule;

if (!pg) {
  console.error("CRITICAL ERROR: 'pg' module failed to load!");
} else {
  console.log("PG Module loaded successfully:", typeof pg);
}

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    dialectModule: pg,
    logging: false,
    dialectOptions:
      process.env.NODE_ENV === "production"
        ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
        : {},
  }
);