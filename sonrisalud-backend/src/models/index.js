import { Usuario } from "./Usuario.js";
import { Odontologo } from "./Odontologo.js";
import { HorarioOdontologo } from "./HorarioOdontologo.js";
import { Cita } from "./Cita.js";

// Asociaciones entre modelos
Odontologo.hasMany(HorarioOdontologo, {
  as: "horarios",
  foreignKey: "odontologo_id",
});
HorarioOdontologo.belongsTo(Odontologo, {
  foreignKey: "odontologo_id",
});

Odontologo.hasMany(Cita, {
  as: "citas",
  foreignKey: "odontologo_id",
});
Cita.belongsTo(Odontologo, {
  as: "odontologo",
  foreignKey: "odontologo_id",
});

Usuario.hasMany(Cita, {
  as: "citas",
  foreignKey: "paciente_id",
});
Cita.belongsTo(Usuario, {
  as: "paciente",
  foreignKey: "paciente_id",
});

export const models = {
  Usuario,
  Odontologo,
  HorarioOdontologo,
  Cita,
};
