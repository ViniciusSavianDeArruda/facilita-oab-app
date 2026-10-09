import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";
import { createResultSaveRegistry } from "../src/lib/simuladoResultSave.js";

let vite;
let simulados;
let caderno;
let originalFetch;
let originalWindow;
let originalStorage;
let originalConsoleError;
const errors = [];

before(async () => {
  originalFetch = globalThis.fetch;
  originalWindow = globalThis.window;
  originalStorage = globalThis.localStorage;
  originalConsoleError = globalThis.console.error;
  globalThis.window = new globalThis.EventTarget();
  globalThis.localStorage = { getItem: () => "test-token" };
  globalThis.console.error = (...args) => errors.push(args);
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  simulados = await vite.ssrLoadModule("/src/lib/simulados.js");
  caderno = await vite.ssrLoadModule("/src/lib/caderno.js");
});

after(async () => {
  await vite?.close();
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
  globalThis.localStorage = originalStorage;
  globalThis.console.error = originalConsoleError;
});

function payload(id) {
  return {
    simulado: { id, modo: "geral", materia_filtro: null, questoes: [] },
    answers: [],
    elapsedSec: 30,
    acertos: 0,
    total: 0,
    porMateria: {},
  };
}

function json(body, status = 200) {
  return new globalThis.Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("POST confirmado atualiza histórico e contador do Caderno", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, method: options.method ?? "GET" });
    if (url.endsWith("/me/simulados")) {
      return json({ id: 1, savedCount: 1, porMateria: {} }, 201);
    }
    if (url.endsWith("/me/caderno")) {
      return json([
        { id: 1, status: "aberto", createdAt: "2026-01-01T00:00:00Z" },
      ]);
    }
    throw new Error(`URL inesperada: ${url}`);
  };

  const state = await simulados.saveResultOnce(payload("success"));
  assert.deepEqual(state, { status: "saved", savedCount: 1 });
  assert.equal(simulados.listarSimulados()[0].id, 1);
  assert.equal(caderno.contarPorStatus().aberto, 1);
  assert.deepEqual(calls.map((call) => call.method), ["POST", "GET"]);
});

for (const status of [400, 500]) {
  test(`HTTP ${status} fica sem confirmação e não reenvia`, async () => {
    let posts = 0;
    globalThis.fetch = async () => {
      posts++;
      return json({ detail: "Falha ao salvar" }, status);
    };
    const id = `http-${status}`;
    assert.equal((await simulados.saveResultOnce(payload(id))).status, "unconfirmed");
    assert.equal((await simulados.saveResultOnce(payload(id))).status, "unconfirmed");
    assert.equal(posts, 1);
  });
}

test("falha de conexão não é tratada como confirmação", async () => {
  let posts = 0;
  globalThis.fetch = async () => {
    posts++;
    throw new TypeError("Falha de rede");
  };
  const state = await simulados.saveResultOnce(payload("network"));
  assert.equal(state.status, "unconfirmed");
  assert.equal(simulados.getResultSaveState("network").status, "unconfirmed");
  assert.equal(posts, 1);
});

test("resposta perdida após commit não causa segundo POST", async () => {
  let serverRecords = 0;
  let posts = 0;
  globalThis.fetch = async () => {
    posts++;
    serverRecords++;
    throw new TypeError("Resposta perdida");
  };
  const id = "lost-response";
  assert.equal((await simulados.saveResultOnce(payload(id))).status, "unconfirmed");
  assert.equal((await simulados.saveResultOnce(payload(id))).status, "unconfirmed");
  assert.equal(serverRecords, 1);
  assert.equal(posts, 1);
});

test("StrictMode e remonta compartilham a mesma tentativa", async () => {
  let finish;
  let posts = 0;
  globalThis.fetch = () => {
    posts++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const result = payload("strict-remount");
  const firstMount = simulados.saveResultOnce(result);
  const secondEffect = simulados.saveResultOnce(result);
  assert.equal(firstMount, secondEffect);
  await Promise.resolve();
  assert.equal(posts, 1);
  assert.equal(simulados.getResultSaveState(result.simulado.id).status, "saving");

  // O efeito desmontado ignora a conclusão; a nova montagem observa a mesma promessa.
  let oldMounted = true;
  let oldUpdate = false;
  firstMount.then(() => {
    if (oldMounted) oldUpdate = true;
  });
  oldMounted = false;
  const remount = simulados.saveResultOnce(result);
  assert.equal(remount, firstMount);
  finish(json({ id: 2, savedCount: 0, porMateria: {} }, 201));
  // O POST confirmado também hidrata o Caderno antes de concluir a tentativa.
  globalThis.fetch = async () => json([]);
  assert.equal((await remount).status, "saved");
  assert.equal(oldUpdate, false);
  assert.equal(simulados.getResultSaveState(result.simulado.id).status, "saved");
  assert.equal(posts, 1);
});

test("desmontagem durante envio preserva estado final para remonta", async () => {
  let finish;
  let calls = 0;
  const registry = createResultSaveRegistry();
  const submit = () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const first = registry.start("unmount", submit);
  await Promise.resolve();
  assert.equal(registry.peek("unmount").status, "saving");
  const remount = registry.start("unmount", submit);
  finish({ savedCount: 2 });
  await first;
  assert.equal((await remount).status, "saved");
  assert.equal(registry.peek("unmount").savedCount, 2);
  assert.equal(calls, 1);
});
