import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createResultSaveRegistry,
  mesmoResultado,
} from "../simuladoResultSave.js";

test("falha de rede deixa o resultado como não confirmado", async () => {
  const registry = createResultSaveRegistry();
  const state = await registry.start("s1", () =>
    Promise.reject(new Error("x")),
  );
  assert.equal(state.status, "unconfirmed");
  assert.equal(registry.peek("s1").status, "unconfirmed");
});

test("start não reenvia: segunda chamada devolve a mesma tentativa", async () => {
  const registry = createResultSaveRegistry();
  let chamadas = 0;
  const submit = async () => {
    chamadas++;
    return { savedCount: 2 };
  };
  await registry.start("s1", submit);
  await registry.start("s1", submit);
  assert.equal(chamadas, 1);
});

test("retry reenvia somente quando o estado é não confirmado", async () => {
  const registry = createResultSaveRegistry();
  await registry.start("s1", () => Promise.reject(new Error("x")));
  const state = await registry.retry("s1", async () => ({ savedCount: 3 }));
  assert.deepEqual(state, { status: "saved", savedCount: 3 });
  assert.equal(registry.peek("s1").status, "saved");
});

test("retry não reenvia resultado já salvo nem tentativa em andamento", async () => {
  const registry = createResultSaveRegistry();
  let chamadas = 0;
  const submit = async () => {
    chamadas++;
    return { savedCount: 1 };
  };
  await registry.start("s1", submit);
  await registry.retry("s1", submit);
  assert.equal(chamadas, 1);

  let liberar;
  const lenta = registry.start(
    "s2",
    () => new Promise((resolve) => (liberar = resolve)),
  );
  const retry = registry.retry("s2", submit);
  assert.equal(chamadas, 1);
  await Promise.resolve();
  liberar({ savedCount: 0 });
  await lenta;
  await retry;
});

test("retry de um simulado desconhecido não faz nada", () => {
  const registry = createResultSaveRegistry();
  assert.equal(
    registry.retry("nunca", async () => ({})),
    null,
  );
});

const payload = {
  simulado: {
    modo: "rapido",
    questoes: [{ enunciado: "A" }, { enunciado: "B" }],
  },
  answers: { 0: "A", 1: "C" },
  elapsedSec: 120,
  acertos: 1,
  total: 2,
};
const salvo = {
  modo: "rapido",
  elapsedSec: 120,
  acertos: 1,
  total: 2,
  questoes: [{ enunciado: "A" }, { enunciado: "B" }],
  answers: { 0: "A", 1: "C" },
};

test("mesmoResultado reconhece o resultado já gravado", () => {
  assert.equal(mesmoResultado(salvo, payload), true);
});

test("mesmoResultado rejeita resultados diferentes", () => {
  assert.equal(mesmoResultado({ ...salvo, acertos: 0 }, payload), false);
  assert.equal(mesmoResultado({ ...salvo, elapsedSec: 5 }, payload), false);
  assert.equal(
    mesmoResultado({ ...salvo, answers: { 0: "B", 1: "C" } }, payload),
    false,
  );
  assert.equal(
    mesmoResultado(
      { ...salvo, questoes: [{ enunciado: "A" }, { enunciado: "Z" }] },
      payload,
    ),
    false,
  );
  assert.equal(mesmoResultado({ ...salvo, questoes: [] }, payload), false);
});
