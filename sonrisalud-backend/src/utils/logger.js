const levelColors = {
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
};

const stamp = () => new Date().toISOString();

export const logger = {
  info: (...args) => console.info(`[${stamp()}][${levelColors.info}]`, ...args),
  warn: (...args) => console.warn(`[${stamp()}][${levelColors.warn}]`, ...args),
  error: (...args) => console.error(`[${stamp()}][${levelColors.error}]`, ...args),
};
