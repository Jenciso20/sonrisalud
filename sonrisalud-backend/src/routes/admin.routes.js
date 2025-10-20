import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  listarPacientes,
  actualizarPaciente,
  eliminarPaciente,
  actualizarOdontologo,
  eliminarOdontologo,
  listarUsuarios,
  actualizarRolUsuario,
  reportesCitas,
} from "../controllers/admin.controller.js";
import {
  adminListarCitas,
  adminCrearCita,
  adminActualizarCita,
  adminCancelarCita,
  obtenerDisponibilidad,
} from "../controllers/citas.controller.js";

const router = express.Router();

// Todo bajo /api/admin requiere rol admin
router.use(requireAuth, requireRole("admin"));

// Pacientes
router.get("/pacientes", listarPacientes);
router.patch("/pacientes/:id", actualizarPaciente);
router.delete("/pacientes/:id", eliminarPaciente);

// Citas
router.get("/citas", adminListarCitas);
router.post("/citas", adminCrearCita);
router.patch("/citas/:id", adminActualizarCita);
router.patch("/citas/:id/cancelar", adminCancelarCita);

// Reutiliza disponibilidad
router.get("/disponibilidad", obtenerDisponibilidad);

// Odontologos
router.patch("/odontologos/:id", actualizarOdontologo);
router.delete("/odontologos/:id", eliminarOdontologo);

// Usuarios (roles)
router.get("/usuarios", listarUsuarios);
router.patch("/usuarios/:id/rol", actualizarRolUsuario);
router.get("/reportes/citas", reportesCitas);

export default router;
