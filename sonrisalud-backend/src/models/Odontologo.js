import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Odontologo = sequelize.define(
  "Odontologo",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    correo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    especialidad: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    duracionConsulta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      field: "duracion_consulta",
    },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: "created_at",
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: "updated_at",
  },
},
{
  tableName: "odontologos",
  timestamps: true,
  createdAt: "created_at",
    updatedAt: "updated_at",
  }
);
