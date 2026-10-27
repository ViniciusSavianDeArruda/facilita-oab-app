import assert from "node:assert/strict";
import { test } from "node:test";

import {
  limparFalha,
  listarFalhasDeCarga,
  registrarFalha,
  temFalhasDeCarga,
} from "../cargaFalhas.js";

test("registra, deduplica e limpa falhas de carga", () => {
  assert.equal(temFalhasDeCarga(), false);
  registrarFalha("caderno");
  registrarFalha("caderno");
  registrarFalha("simulados");
  assert.deepEqual(listarFalhasDeCarga(), ["caderno", "simulados"]);
  assert.equal(temFalhasDeCarga(), true);
  limparFalha("caderno");
  assert.deepEqual(listarFalhasDeCarga(), ["simulados"]);
  limparFalha("simulados");
  assert.equal(temFalhasDeCarga(), false);
});
