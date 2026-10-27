import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dataCivilHoje,
  diaDaSemana,
  diasEntre,
  somarDias,
} from "./dataCivil.js";

test("26/10/2026 22:30 em São Paulo (UTC 01:30 do dia 27) ainda é dia 26", () => {
  assert.equal(dataCivilHoje(new Date("2026-10-27T01:30:00Z")), "2026-10-26");
});

test("27/10/2026 00:30 em São Paulo (UTC 03:30) já é dia 27", () => {
  assert.equal(dataCivilHoje(new Date("2026-10-27T03:30:00Z")), "2026-10-27");
});

test("limites do dia em Brasília (UTC-3)", () => {
  assert.equal(dataCivilHoje(new Date("2026-10-27T02:59:59Z")), "2026-10-26");
  assert.equal(dataCivilHoje(new Date("2026-10-27T03:00:00Z")), "2026-10-27");
});

test("data civil não sofre deslocamento na aritmética", () => {
  assert.equal(somarDias("2026-10-26", 0), "2026-10-26");
  assert.equal(somarDias("2026-10-26", 1), "2026-10-27");
  assert.equal(somarDias("2026-10-31", 1), "2026-11-01");
  assert.equal(somarDias("2026-03-01", -1), "2026-02-28");
  assert.equal(diasEntre("2026-10-26", "2026-10-27"), 1);
  assert.equal(diasEntre("2026-10-26", "2026-10-26"), 0);
  assert.equal(diasEntre("2026-10-26", "2026-12-31"), 66);
  assert.equal(diaDaSemana("2026-10-26"), 1);
});
