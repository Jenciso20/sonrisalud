import { logger } from "../utils/logger.js";

// Simple in-memory rate limiter to avoid extra dependencies.
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 30, keyGenerator } = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  const getKey = keyGenerator || ((req) => req.ip || req.connection?.remoteAddress || "global");

  return (req, res, next) => {
    const key = getKey(req);
    const now = Date.now();
    const bucket = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    hits.set(key, bucket);

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.round((bucket.resetAt - now) / 1000));
      res.set("Retry-After", retryAfter.toString());
      logger.warn(`Rate limit exceeded for ${key} on ${req.originalUrl}`);
      return res.status(429).json({ mensaje: "Demasiadas solicitudes, intenta de nuevo en unos minutos." });
    }

    return next();
  };
}
