import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  crearCita,
  listarCitasPaciente,
  cancelarCita,
  obtenerDisponibilidad,
  reprogramarCita,
} from "../controllers/citas.controller.js";

const router = express.Router();

// Disponibilidad es visible para usuarios autenticados (paciente u odontologo)
router.get("/disponibilidad", requireAuth, obtenerDisponibilidad);
// Las siguientes rutas son para pacientes y admin
router.get("/", requireAuth, requireRole("paciente", "admin"), listarCitasPaciente);
router.post("/", requireAuth, requireRole("paciente", "admin"), crearCita);
router.patch("/:id/cancelar", requireAuth, requireRole("paciente", "admin"), cancelarCita);
router.patch("/:id/reprogramar", requireAuth, requireRole("paciente", "admin"), reprogramarCita);

export default router;
