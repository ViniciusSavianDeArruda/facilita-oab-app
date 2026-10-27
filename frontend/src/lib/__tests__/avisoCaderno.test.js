import assert from "node:assert/strict";
import { test } from "node:test";

import { AVISO_REMOCAO_FALHOU, reduzirAviso } from "../avisoCaderno.js";

test("falha de remoção define o aviso", () => {
  assert.equal(reduzirAviso(null, "remocao-falhou"), AVISO_REMOCAO_FALHOU);
});

test("qualquer outra ação descarta um aviso antigo", () => {
  for (const evento of ["limpar", "selecionar", "filtrar", "mutacao"]) {
    assert.equal(reduzirAviso(AVISO_REMOCAO_FALHOU, evento), null);
  }
});

test("nova falha mantém um único aviso, sem acumular", () => {
  const primeiro = reduzirAviso(null, "remocao-falhou");
  assert.equal(reduzirAviso(primeiro, "remocao-falhou"), AVISO_REMOCAO_FALHOU);
});
