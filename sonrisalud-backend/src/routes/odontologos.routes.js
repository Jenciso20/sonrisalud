import express from "express";
import { listarOdontologos, crearOdontologo, agenda, atenderCita } from "../controllers/odontologos.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, listarOdontologos);
router.post("/", requireAuth, crearOdontologo);
router.get("/agenda", requireAuth, agenda);
router.patch("/citas/:id/atender", requireAuth, atenderCita);

export default router;
