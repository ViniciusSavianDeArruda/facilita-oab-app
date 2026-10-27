import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DIAS_MAX_ATE_PROVA,
  situacaoDataProva,
  somarDias,
} from "../dataCivil.js";

const hoje = "2026-10-27";

test("situacaoDataProva classifica vazia, passada, válida, limite e distante", () => {
  assert.equal(situacaoDataProva("", hoje), "sem-data");
  assert.equal(situacaoDataProva(hoje, hoje), "passada");
  assert.equal(situacaoDataProva("2026-10-01", hoje), "passada");
  assert.equal(situacaoDataProva(somarDias(hoje, 1), hoje), "ok");
  assert.equal(
    situacaoDataProva(somarDias(hoje, DIAS_MAX_ATE_PROVA), hoje),
    "ok",
  );
  assert.equal(
    situacaoDataProva(somarDias(hoje, DIAS_MAX_ATE_PROVA + 1), hoje),
    "distante",
  );
});

test("anos absurdos que o input aceita não passam", () => {
  assert.equal(situacaoDataProva("9999-12-31", hoje), "distante");
  assert.equal(situacaoDataProva("275760-09-13", hoje), "distante");
  assert.equal(situacaoDataProva("300000-01-01", hoje), "invalida");
});
