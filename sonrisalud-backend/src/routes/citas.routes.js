import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  crearCita,
  listarCitasPaciente,
  cancelarCita,
  obtenerDisponibilidad,
  reprogramarCita,
} from "../controllers/citas.controller.js";

const router = express.Router();

router.get("/disponibilidad", requireAuth, obtenerDisponibilidad);
router.get("/", requireAuth, listarCitasPaciente);
router.post("/", requireAuth, crearCita);
router.patch("/:id/cancelar", requireAuth, cancelarCita);
router.patch("/:id/reprogramar", requireAuth, reprogramarCita);

export default router;
