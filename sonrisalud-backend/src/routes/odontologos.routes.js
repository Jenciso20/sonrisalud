import express from "express";
import { listarOdontologos, crearOdontologo } from "../controllers/odontologos.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, listarOdontologos);
router.post("/", requireAuth, crearOdontologo);

export default router;
