import assert from "node:assert/strict";
import { test } from "node:test";

import { cx, formatarDuracao } from "../format.js";

test("cx ignora valores falsy e junta com espaço", () => {
  assert.equal(cx("a", false, null, undefined, "", "b"), "a b");
  assert.equal(cx(), "");
});

test("formatarDuracao cobre minutos, horas cheias e horas com minutos", () => {
  assert.equal(formatarDuracao(0), "0 min");
  assert.equal(formatarDuracao(45), "45 min");
  assert.equal(formatarDuracao(60), "1h");
  assert.equal(formatarDuracao(80), "1h20");
  assert.equal(formatarDuracao(65), "1h05");
});
