import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ mensaje: "Token requerido" });
  }

  const [, token] = authHeader.split(" ");

  if (!token) {
    return res.status(401).json({ mensaje: "Token invalido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    logger.warn("Token invalido:", error.message);
    return res.status(401).json({ mensaje: "Token invalido o expirado" });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario || !req.usuario.rol) {
      return res.status(403).json({ mensaje: "Permisos insuficientes" });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: "Acceso denegado" });
    }
    next();
  };
};
