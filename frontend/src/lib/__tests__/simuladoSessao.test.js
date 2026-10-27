import assert from "node:assert/strict";
import { test } from "node:test";

import {
  lerSimuladoSalvo,
  limparSimuladoSalvo,
  sessaoRetomavel,
  SIMULADO_STORAGE_KEY,
} from "../simuladoSessao.js";

const questao = {
  enunciado: "Q",
  alternativas: { A: "a", B: "b", C: "c", D: "d" },
  correta: "A",
};
const simulado = { id: "s1", modo: "rapido", questoes: [questao] };
const agora = Date.UTC(2026, 9, 27, 12);
const salvo = (extra = {}) => ({
  id: "s1",
  answers: { 0: "A" },
  currentIdx: 0,
  startedAt: agora - 60_000,
  simulado,
  ...extra,
});

function fakeStorage(valor) {
  const dados = new Map(
    valor === undefined ? [] : [[SIMULADO_STORAGE_KEY, valor]],
  );
  return {
    getItem: (k) => dados.get(k) ?? null,
    removeItem: (k) => dados.delete(k),
    has: (k) => dados.has(k),
  };
}

test("sessão válida devolve o simulado com as questões", () => {
  assert.deepEqual(sessaoRetomavel(salvo(), agora), simulado);
});

test("sessão antiga (formato sem questões) não é retomada", () => {
  const legado = salvo();
  delete legado.simulado;
  assert.equal(sessaoRetomavel(legado, agora), null);
});

test("sessão corrompida, vencida ou inconsistente é ignorada", () => {
  assert.equal(sessaoRetomavel(null, agora), null);
  assert.equal(sessaoRetomavel(salvo({ id: "outro" }), agora), null);
  assert.equal(
    sessaoRetomavel(salvo({ simulado: { ...simulado, questoes: [] } }), agora),
    null,
  );
  assert.equal(
    sessaoRetomavel(
      salvo({ simulado: { ...simulado, questoes: [{ enunciado: "x" }] } }),
      agora,
    ),
    null,
  );
  assert.equal(sessaoRetomavel(salvo({ startedAt: "x" }), agora), null);
  assert.equal(
    sessaoRetomavel(salvo({ startedAt: agora - 25 * 3600 * 1000 }), agora),
    null,
  );
});

test("lerSimuladoSalvo tolera JSON inválido e limpar remove a chave", () => {
  assert.equal(lerSimuladoSalvo(fakeStorage("{quebrado")), null);
  assert.equal(lerSimuladoSalvo(fakeStorage()), null);
  const storage = fakeStorage(JSON.stringify(salvo({ startedAt: Date.now() })));
  assert.deepEqual(lerSimuladoSalvo(storage), simulado);
  limparSimuladoSalvo(storage);
  assert.equal(storage.has(SIMULADO_STORAGE_KEY), false);
});
