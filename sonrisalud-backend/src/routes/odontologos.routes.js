import express from "express";
import { listarOdontologos, crearOdontologo, agenda, atenderCita, listarPacientesParaOdontologo, crearCitaParaPaciente, guardarNotasCita, historialPaciente, historialOdontologo, cancelarCitaComoOdontologo } from "../controllers/odontologos.controller.js";
import { reprogramarCitaOd } from "../controllers/citas.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, listarOdontologos);
router.post("/", requireAuth, crearOdontologo);
router.get("/agenda", requireAuth, agenda);
router.patch("/citas/:id/atender", requireAuth, atenderCita);
router.patch("/citas/:id/notas", requireAuth, requireRole("odontologo", "admin"), guardarNotasCita);
router.patch("/citas/:id/cancelar", requireAuth, requireRole("odontologo", "admin"), cancelarCitaComoOdontologo);
router.patch("/citas/:id/reprogramar", requireAuth, requireRole("odontologo", "admin"), reprogramarCitaOd);
router.get("/pacientes/:id/historial", requireAuth, requireRole("odontologo", "admin"), historialPaciente);
router.get("/historial", requireAuth, requireRole("odontologo", "admin"), historialOdontologo);
// Endpoints para odontologo
router.get("/pacientes", requireAuth, requireRole("odontologo", "admin"), listarPacientesParaOdontologo);
router.post("/citas", requireAuth, requireRole("odontologo", "admin"), crearCitaParaPaciente);

export default router;
