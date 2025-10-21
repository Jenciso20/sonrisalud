import express from "express";
import { listarOdontologos, crearOdontologo, agenda, atenderCita, listarPacientesParaOdontologo, crearCitaParaPaciente } from "../controllers/odontologos.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, listarOdontologos);
router.post("/", requireAuth, crearOdontologo);
router.get("/agenda", requireAuth, agenda);
router.patch("/citas/:id/atender", requireAuth, atenderCita);
// Endpoints para odontologo
router.get("/pacientes", requireAuth, requireRole("odontologo", "admin"), listarPacientesParaOdontologo);
router.post("/citas", requireAuth, requireRole("odontologo", "admin"), crearCitaParaPaciente);

export default router;
