import express from "express";
import { login, register, recoverPassword, resetPassword, getProfile, updateProfile } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/recover", recoverPassword);
router.post("/reset-password", resetPassword);
router.get("/me", requireAuth, getProfile);
router.patch("/me", requireAuth, updateProfile);

export default router;
