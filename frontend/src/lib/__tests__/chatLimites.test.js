import assert from "node:assert/strict";
import { test } from "node:test";

import { mensagemDeDetalhe } from "../erroApi.js";
import {
  LIMITE_HISTORICO,
  LIMITE_MENSAGEM,
  mensagemMuitoLonga,
  recortarHistorico,
} from "../chatLimites.js";

const fala = (i) => ({
  role: i % 2 === 0 ? "user" : "assistant",
  content: `m${i}`,
});

test("mensagem no limite passa e acima do limite é barrada", () => {
  assert.equal(mensagemMuitoLonga("x".repeat(LIMITE_MENSAGEM)), false);
  assert.equal(mensagemMuitoLonga("x".repeat(LIMITE_MENSAGEM + 1)), true);
});

test("histórico curto é mantido e o longo é recortado começando pelo usuário", () => {
  const curto = Array.from({ length: 5 }, (_, i) => fala(i));
  assert.equal(recortarHistorico(curto), curto);

  const longo = Array.from({ length: 151 }, (_, i) => fala(i));
  const recorte = recortarHistorico(longo);
  assert.ok(recorte.length <= LIMITE_HISTORICO);
  assert.equal(recorte[0].role, "user");
  assert.equal(recorte.at(-1), longo.at(-1));
});

test("detail de validação (lista) vira texto legível, nunca [object Object]", () => {
  assert.equal(mensagemDeDetalhe("Senha incorreta."), "Senha incorreta.");
  const lista = mensagemDeDetalhe([
    { type: "string_too_long", loc: ["body"], msg: "x" },
  ]);
  assert.match(lista, /inválido ou grande demais/);
  assert.equal(mensagemDeDetalhe(undefined), null);
});
