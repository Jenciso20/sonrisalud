import { test } from "node:test";
import { strictEqual } from "node:assert/strict";
import {
  validateLoginPayload,
  validateRecoverPayload,
  validateRegisterPayload,
  validateResetPayload,
} from "../src/utils/validators.js";

test("validateLoginPayload permite payload valido", () => {
  const result = validateLoginPayload({ correo: "user@unajma.edu.pe", password: "123456" });
  strictEqual(result.valid, true);
});

test("validateLoginPayload rechaza correo invalido", () => {
  const result = validateLoginPayload({ correo: "mal", password: "123456" });
  strictEqual(result.valid, false);
});

test("validateRegisterPayload requiere correo institucional cuando se define dominio y password largo", () => {
  process.env.INSTITUTION_DOMAIN = "@unajma.edu.pe";
  const ok = validateRegisterPayload({
    nombre: "Test",
    correo: "test@unajma.edu.pe",
    password: "Abcdef12",
    telefono: "987654321",
    dni: "12345678",
  });
  strictEqual(ok.valid, true);

  const badDomain = validateRegisterPayload({
    nombre: "Test",
    correo: "test@gmail.com",
    password: "Abcdef12",
  });
  strictEqual(badDomain.valid, false);
  delete process.env.INSTITUTION_DOMAIN;
});

test("validateRecoverPayload valida correo", () => {
  const result = validateRecoverPayload({ correo: "correo@unajma.edu.pe" });
  strictEqual(result.valid, true);
});

test("validateResetPayload requiere token y password", () => {
  const result = validateResetPayload({ token: "abc", nuevaPassword: "12345678" });
  strictEqual(result.valid, true);
});
