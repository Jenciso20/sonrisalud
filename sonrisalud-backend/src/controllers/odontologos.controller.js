import { Odontologo } from "../models/Odontologo.js";
import { HorarioOdontologo } from "../models/HorarioOdontologo.js";

export const listarOdontologos = async (req, res) => {
  try {
    const odontologos = await Odontologo.findAll({
      where: { activo: true },
      include: [
        {
          model: HorarioOdontologo,
          as: "horarios",
        },
      ],
      order: [["nombre", "ASC"]],
    });

    res.json(odontologos);
  } catch (error) {
    console.error("Error al listar odontologos:", error);
    res.status(500).json({ mensaje: "Error al listar odontologos" });
  }
};

export const crearOdontologo = async (req, res) => {
  const { nombre, correo, especialidad, telefono, duracionConsulta, horarios = [] } = req.body;

  try {
    const existe = await Odontologo.findOne({ where: { correo } });
    if (existe) {
      return res.status(400).json({ mensaje: "El correo ya esta registrado para un odontologo" });
    }

    const odontologo = await Odontologo.create({
      nombre,
      correo,
      especialidad,
      telefono,
      duracionConsulta,
    });

    if (Array.isArray(horarios) && horarios.length > 0) {
      const horariosConId = horarios.map((horario) => ({
        ...horario,
        odontologoId: odontologo.id,
      }));
      await HorarioOdontologo.bulkCreate(horariosConId);
    }

    const creado = await Odontologo.findByPk(odontologo.id, {
      include: [{ model: HorarioOdontologo, as: "horarios" }],
    });

    res.status(201).json(creado);
  } catch (error) {
    console.error("Error al crear odontologo:", error);
    res.status(500).json({ mensaje: "Error al crear odontologo" });
  }
};
