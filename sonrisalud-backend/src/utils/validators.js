const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const STRONG_PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const COMMON_PASSWORDS = ["password", "12345678", "123456789", "qwerty", "admin123", "password1", "1234567890"];

function fail(messages) {
  return { valid: false, errors: Array.isArray(messages) ? messages : [messages] };
}

function success() {
  return { valid: true, errors: [] };
}

export function validateLoginPayload(body) {
  if (!body || typeof body !== "object") return fail("Payload requerido.");
  const { correo, password } = body;
  const errors = [];
  if (!correo || typeof correo !== "string" || !EMAIL_REGEX.test(correo)) {
    errors.push("Correo invalido.");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    errors.push("Password invalida (minimo 6 caracteres).");
  }
  return errors.length ? fail(errors) : success();
}

export function validateRegisterPayload(body) {
  if (!body || typeof body !== "object") return fail("Payload requerido.");
  const {
    nombre,
    apellidos,
    correo,
    password,
    telefono,
    dni,
    codigoUniversitario,
  } = body;
  const errors = [];
  if (!nombre || typeof nombre !== "string" || nombre.trim().length < 2) {
    errors.push("Nombre es requerido (minimo 2 caracteres).");
  }
  const correoLower = (correo || "").toLowerCase().trim();
  const domain = (process.env.INSTITUTION_DOMAIN || "").trim();
  if (domain && !correoLower.endsWith(domain)) {
    errors.push(`Usa tu correo institucional ${domain}`);
  }
  if (!EMAIL_REGEX.test(correoLower)) {
    errors.push("Correo invalido.");
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    errors.push("Password debe tener minimo 8 caracteres.");
  } else if (!STRONG_PWD_REGEX.test(password) || COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push("Password debe incluir mayuscula, minuscula y numero y no ser comun.");
  }
  if (telefono) {
    const digits = String(telefono).replace(/\D/g, "");
    const isValidPeru = (digits.length === 9 && digits.startsWith("9")) || (digits.length === 11 && digits.startsWith("51") && digits[2] === "9");
    if (!isValidPeru) {
      errors.push("Telefono invalido (formato Peru: 9 digitos, inicia en 9).");
    }
  }
  if (dni) {
    const digitsDni = String(dni).replace(/\D/g, "");
    if (digitsDni.length !== 8) {
      errors.push("DNI invalido (8 digitos).");
    }
  }
  if (codigoUniversitario && String(codigoUniversitario).length < 3) {
    errors.push("Codigo universitario invalido.");
  }
  return errors.length ? fail(errors) : success();
}

export function validateProfilePayload(body) {
  if (!body || typeof body !== "object") return fail("Payload requerido.");
  const { nombre, apellidos, telefono, dni, codigoUniversitario, newPassword, currentPassword } = body;
  const errors = [];
  if (nombre !== undefined && (typeof nombre !== "string" || nombre.trim().length < 2)) {
    errors.push("Nombre invalido (minimo 2 caracteres).");
  }
  if (apellidos !== undefined && typeof apellidos !== "string") {
    errors.push("Apellidos invalidos.");
  }
  if (telefono) {
    const digits = String(telefono).replace(/\D/g, "");
    const isValidPeru = (digits.length === 9 && digits.startsWith("9")) || (digits.length === 11 && digits.startsWith("51") && digits[2] === "9");
    if (!isValidPeru) {
      errors.push("Telefono invalido (formato Peru: 9 digitos, inicia en 9).");
    }
  }
  if (dni) {
    const digitsDni = String(dni).replace(/\D/g, "");
    if (digitsDni.length !== 8) {
      errors.push("DNI invalido (8 digitos).");
    }
  }
  if (codigoUniversitario && String(codigoUniversitario).length < 3) {
    errors.push("Codigo universitario invalido.");
  }
  if (newPassword) {
    if (!currentPassword) errors.push("Debes enviar el password actual.");
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      errors.push("La nueva password debe tener minimo 8 caracteres.");
    } else if (!STRONG_PWD_REGEX.test(newPassword) || COMMON_PASSWORDS.includes(newPassword.toLowerCase())) {
      errors.push("La nueva password debe incluir mayuscula, minuscula y numero y no ser comun.");
    }
  }
  return errors.length ? fail(errors) : success();
}

export function validateRecoverPayload(body) {
  if (!body || typeof body !== "object") return fail("Payload requerido.");
  const { correo } = body;
  if (!correo || typeof correo !== "string" || !EMAIL_REGEX.test(correo)) {
    return fail("Correo invalido.");
  }
  return success();
}

export function validateResetPayload(body) {
  if (!body || typeof body !== "object") return fail("Payload requerido.");
  const { token, nuevaPassword } = body;
  const errors = [];
  if (!token || typeof token !== "string") {
    errors.push("Token requerido.");
  }
  if (!nuevaPassword || typeof nuevaPassword !== "string" || nuevaPassword.length < 8) {
    errors.push("Password debe tener minimo 8 caracteres.");
  }
  return errors.length ? fail(errors) : success();
}
