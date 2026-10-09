import assert from "node:assert/strict";
import test from "node:test";
import { createPlanPersistence } from "../src/lib/planoPersistence.js";

function harness() {
  const calls = [];
  let server = null;
  const persistence = createPlanPersistence({
    put: (value) => request("put", value),
    remove: () => request("delete", null),
  });

  function request(type, value) {
    return new Promise((resolve, reject) => {
      calls.push({
        type,
        value,
        finish({ error, commit = !error } = {}) {
          if (commit) server = value;
          if (error) reject(error);
          else resolve(value);
        },
      });
    });
  }

  return { calls, persistence, getServer: () => server };
}

async function nextTurn() {
  await Promise.resolve();
  await Promise.resolve();
}

test("uma marcação otimista é confirmada pelo servidor", async () => {
  const { calls, persistence, getServer } = harness();
  const plan = { itens: [true] };
  const saved = persistence.save(plan);
  assert.equal(persistence.getLocal(), plan);
  assert.equal(persistence.getConfirmed(), null);
  assert.equal(persistence.getStatus(), "pending");
  calls[0].finish();
  await saved;
  assert.equal(getServer(), plan);
  assert.equal(persistence.getConfirmed(), plan);
  assert.equal(persistence.getStatus(), "idle");
});

test("duas marcações rápidas são serializadas", async () => {
  const { calls, persistence, getServer } = harness();
  const a = { itens: [true, false] };
  const b = { itens: [true, true] };
  const first = persistence.save(a);
  const second = persistence.save(b);
  assert.equal(calls.length, 1);
  assert.equal(persistence.getLocal(), b);
  calls[0].finish();
  await first;
  await nextTurn();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].value, b);
  assert.equal(persistence.getLocal(), b);
  calls[1].finish();
  await second;
  assert.equal(getServer(), b);
  assert.equal(persistence.getConfirmed(), b);
  assert.equal(persistence.getStatus(), "idle");
});

test("três marcações consolidam os dois PUTs ainda pendentes", async () => {
  const { calls, persistence, getServer } = harness();
  const a = { n: 1 };
  const b = { n: 2 };
  const c = { n: 3 };
  const first = persistence.save(a);
  const second = persistence.save(b);
  const third = persistence.save(c);
  calls[0].finish();
  await first;
  await nextTurn();
  assert.deepEqual(calls.map((call) => call.value), [a, c]);
  calls[1].finish();
  await Promise.all([second, third]);
  assert.equal(getServer(), c);
  assert.equal(persistence.getLocal(), c);
  assert.equal(persistence.getConfirmed(), c);
});

test("atrasos diferentes não permitem resposta fora de ordem", async () => {
  const { calls, persistence, getServer } = harness();
  const first = persistence.save({ n: 1 });
  const second = persistence.save({ n: 2 });
  await nextTurn();
  assert.equal(calls.length, 1);
  calls[0].finish();
  await first;
  assert.equal(persistence.getStatus(), "pending");
  await nextTurn();
  calls[1].finish();
  await second;
  assert.deepEqual(getServer(), { n: 2 });
  assert.deepEqual(persistence.getLocal(), { n: 2 });
  assert.deepEqual(persistence.getConfirmed(), { n: 2 });
});

test("falha do primeiro PUT não desfaz a edição mais recente", async () => {
  const { calls, persistence, getServer } = harness();
  const first = persistence.save({ n: 1 });
  const second = persistence.save({ n: 2 });
  calls[0].finish({ error: new Error("rede") });
  await assert.rejects(first);
  assert.deepEqual(persistence.getLocal(), { n: 2 });
  await nextTurn();
  calls[1].finish();
  await second;
  assert.deepEqual(getServer(), { n: 2 });
  assert.deepEqual(persistence.getConfirmed(), { n: 2 });
  assert.equal(persistence.getStatus(), "idle");
});

test("falha do último PUT mantém a edição local não confirmada e permite retry", async () => {
  const { calls, persistence, getServer } = harness();
  const first = persistence.save({ n: 1 });
  calls[0].finish();
  await first;
  const second = persistence.save({ n: 2 });
  calls[1].finish({ error: new Error("HTTP 500") });
  await assert.rejects(second);
  assert.deepEqual(persistence.getLocal(), { n: 2 });
  assert.deepEqual(persistence.getConfirmed(), { n: 1 });
  assert.deepEqual(getServer(), { n: 1 });
  assert.equal(persistence.getStatus(), "error");
  const retried = persistence.retry();
  calls[2].finish();
  await retried;
  assert.deepEqual(getServer(), { n: 2 });
  assert.deepEqual(persistence.getLocal(), { n: 2 });
  assert.deepEqual(persistence.getConfirmed(), { n: 2 });
  assert.equal(persistence.getStatus(), "idle");
});

test("nova marcação depois de falha substitui o estado não confirmado", async () => {
  const { calls, persistence, getServer } = harness();
  const first = persistence.save({ n: 1 });
  calls[0].finish({ error: new Error("HTTP 422") });
  await assert.rejects(first);
  const second = persistence.save({ n: 2 });
  calls[1].finish();
  await second;
  assert.deepEqual(getServer(), { n: 2 });
  assert.equal(persistence.getStatus(), "idle");
});

test("recompactação pendente não sobrescreve marcação posterior", async () => {
  const { calls, persistence, getServer } = harness();
  const initial = persistence.save({ dia: "ontem" });
  const recompact = persistence.save({ dia: "hoje", concluido: false });
  const marking = persistence.save({ dia: "hoje", concluido: true });
  calls[0].finish();
  await initial;
  await nextTurn();
  assert.deepEqual(calls[1].value, { dia: "hoje", concluido: true });
  calls[1].finish();
  await Promise.all([recompact, marking]);
  assert.deepEqual(getServer(), { dia: "hoje", concluido: true });
  assert.deepEqual(persistence.getLocal(), getServer());
  assert.deepEqual(persistence.getConfirmed(), getServer());
});

test("DELETE separa plano antigo de regeneração com escritas pendentes", async () => {
  const { calls, persistence, getServer } = harness();
  const old = persistence.save({ plano: "antigo" });
  const deleting = persistence.clear();
  const fresh = persistence.save({ plano: "novo" });
  assert.deepEqual(persistence.getLocal(), { plano: "novo" });
  calls[0].finish();
  await old;
  await nextTurn();
  assert.equal(calls[1].type, "delete");
  calls[1].finish();
  await deleting;
  await nextTurn();
  assert.equal(calls[2].type, "put");
  calls[2].finish();
  await fresh;
  assert.deepEqual(getServer(), { plano: "novo" });
  assert.deepEqual(persistence.getConfirmed(), { plano: "novo" });
  assert.deepEqual(persistence.getLocal(), { plano: "novo" });
});

test("exclusão falha sem recriar plano antigo na interface", async () => {
  const { calls, persistence, getServer } = harness();
  const initial = persistence.save({ plano: "antigo" });
  calls[0].finish();
  await initial;
  const deleting = persistence.clear();
  calls[1].finish({ error: new Error("rede") });
  await assert.rejects(deleting);
  assert.equal(persistence.getLocal(), null);
  assert.deepEqual(getServer(), { plano: "antigo" });
  assert.equal(persistence.getStatus(), "error");
  const retry = persistence.retry();
  calls[2].finish();
  await retry;
  assert.equal(getServer(), null);
  assert.equal(persistence.getLocal(), null);
  assert.equal(persistence.getConfirmed(), null);
  assert.equal(persistence.getStatus(), "idle");
});

test("resposta perdida após commit permanece incerta até retry confirmado", async () => {
  const { calls, persistence, getServer } = harness();
  const saved = persistence.save({ n: 1 });
  calls[0].finish({ error: new Error("resposta perdida"), commit: true });
  await assert.rejects(saved);
  assert.deepEqual(getServer(), { n: 1 });
  assert.equal(persistence.getConfirmed(), null);
  assert.equal(persistence.getStatus(), "error");
  const retry = persistence.retry();
  calls[1].finish();
  await retry;
  assert.deepEqual(persistence.getConfirmed(), { n: 1 });
  assert.deepEqual(persistence.getLocal(), { n: 1 });
});

test("hidratação antiga não apaga uma edição iniciada depois do GET", async () => {
  const { calls, persistence } = harness();
  const startedAt = persistence.getVersion();
  const saved = persistence.save({ n: 2 });
  persistence.hydrate({ n: 1 }, startedAt);
  assert.deepEqual(persistence.getLocal(), { n: 2 });
  calls[0].finish();
  await saved;
  assert.deepEqual(persistence.getConfirmed(), { n: 2 });
  assert.deepEqual(persistence.getLocal(), { n: 2 });
});

test("regeneração após DELETE confirmado mantém falha visível até retry", async () => {
  const { calls, persistence, getServer } = harness();
  const deleting = persistence.clear();
  const fresh = persistence.save({ plano: "novo" });
  calls[0].finish();
  await deleting;
  await nextTurn();
  calls[1].finish({ error: new Error("HTTP 503") });
  await assert.rejects(fresh);
  assert.equal(getServer(), null);
  assert.deepEqual(persistence.getLocal(), { plano: "novo" });
  assert.equal(persistence.getConfirmed(), null);
  assert.equal(persistence.getStatus(), "error");
  const retry = persistence.retry();
  calls[2].finish();
  await retry;
  assert.deepEqual(getServer(), { plano: "novo" });
  assert.equal(persistence.getStatus(), "idle");
});

test("resposta perdida do DELETE não permite que PUT anterior recrie o plano", async () => {
  const { calls, persistence, getServer } = harness();
  const old = persistence.save({ plano: "antigo" });
  const deleting = persistence.clear();
  calls[0].finish();
  await old;
  await nextTurn();
  calls[1].finish({ error: new Error("resposta perdida"), commit: true });
  await assert.rejects(deleting);
  assert.equal(getServer(), null);
  assert.equal(persistence.getLocal(), null);
  assert.deepEqual(persistence.getConfirmed(), { plano: "antigo" });
  assert.equal(persistence.getStatus(), "error");
  const retry = persistence.retry();
  calls[2].finish();
  await retry;
  assert.equal(getServer(), null);
  assert.equal(persistence.getConfirmed(), null);
});
