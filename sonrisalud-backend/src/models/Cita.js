import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Cita = sequelize.define(
  "Cita",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    pacienteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "paciente_id",
    },
    odontologoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "odontologo_id",
    },
    inicio: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    fin: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pendiente",
    },
    motivo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nota: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  diagnostico: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tratamiento: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  atendidaPor: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "atendida_por",
  },
  recordatorioEnviado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: "recordatorio_enviado",
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
  tableName: "citas",
  timestamps: true,
  createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["odontologo_id", "inicio"],
        name: "idx_cita_odontologo_inicio",
      },
    ],
  }
);
