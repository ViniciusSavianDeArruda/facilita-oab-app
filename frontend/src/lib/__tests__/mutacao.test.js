import assert from "node:assert/strict";
import { test } from "node:test";

import { executarMutacao } from "../mutacao.js";

test("sucesso devolve true e chama aoSucesso com o resultado", async () => {
  let recebido = null;
  const ok = await executarMutacao({
    enviar: async () => "salvo",
    aoSucesso: (r) => {
      recebido = r;
    },
    aoFalhar: () => assert.fail("não deveria falhar"),
  });
  assert.equal(ok, true);
  assert.equal(recebido, "salvo");
});

test("falha devolve false, desfaz e não lança", async () => {
  let desfeito = false;
  const ok = await executarMutacao({
    enviar: async () => {
      throw new Error("rede");
    },
    aoSucesso: () => assert.fail("não deveria confirmar"),
    aoFalhar: () => {
      desfeito = true;
    },
  });
  assert.equal(ok, false);
  assert.equal(desfeito, true);
});

test("funciona sem callbacks opcionais", async () => {
  assert.equal(await executarMutacao({ enviar: async () => {} }), true);
  assert.equal(
    await executarMutacao({
      enviar: () => {
        throw new Error("x");
      },
    }),
    false,
  );
});
