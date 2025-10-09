import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const HorarioOdontologo = sequelize.define(
  "HorarioOdontologo",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    odontologoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "odontologo_id",
    },
    diaSemana: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "dia_semana",
      validate: {
        min: 0,
        max: 6,
      },
    },
    horaInicio: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "hora_inicio",
    },
    horaFin: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "hora_fin",
    },
  },
  {
    tableName: "horarios_odontologos",
    timestamps: false,
  }
);
