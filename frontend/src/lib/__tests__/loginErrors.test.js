import assert from "node:assert/strict";
import { test } from "node:test";

import { mensagemErroLogin } from "../loginErrors.js";

test("login distingue senha errada, limite de tentativas e falha do servidor", () => {
  assert.equal(mensagemErroLogin(401), "Senha incorreta.");
  assert.match(mensagemErroLogin(429), /Muitas tentativas/);
  assert.match(mensagemErroLogin(500), /Não foi possível entrar/);
  assert.match(mensagemErroLogin(503), /Não foi possível entrar/);
});
