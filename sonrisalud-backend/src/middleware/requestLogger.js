import { logger } from "../utils/logger.js";

export function requestLogger(req, _res, next) {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
}
