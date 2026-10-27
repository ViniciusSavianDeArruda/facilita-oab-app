import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calcularEvolucao,
  calcularMediaGeral,
  calcularMelhorNota,
  calcularQuestoesFeitas,
  faixaMateria,
  formatarDataCurta,
  formatarDataLonga,
  nomesMateriasFoco,
  priorizarMaterias,
  recortarTrend,
} from "../estatisticas.js";

const simulado = (acertos, total, data) => ({
  createdAt: `2026-10-${String(data).padStart(2, "0")}T12:00:00Z`,
  acertos,
  total,
});

test("agregados: tudo vazio devolve null, 0 e lista vazia", () => {
  assert.equal(calcularMediaGeral([]), null);
  assert.equal(calcularMelhorNota([]), null);
  assert.equal(calcularQuestoesFeitas([]), 0);
  assert.equal(calcularEvolucao([]), null);
  assert.deepEqual(priorizarMaterias([]), []);
  assert.equal(nomesMateriasFoco([]), null);
});

test("1 simulado: média é a nota do próprio e evolução ainda não existe", () => {
  const trend = [simulado(7, 10, 20)];
  assert.equal(calcularMediaGeral(trend), 70);
  assert.deepEqual(calcularMelhorNota(trend), {
    percentual: 70,
    data: "2026-10-20T12:00:00Z",
  });
  assert.equal(calcularQuestoesFeitas(trend), 10);
  assert.equal(calcularEvolucao(trend), null);
});

test("5 simulados ainda não habilitam o cálculo de evolução", () => {
  const trend = [
    simulado(4, 10, 10),
    simulado(5, 10, 12),
    simulado(6, 10, 14),
    simulado(7, 10, 16),
    simulado(8, 10, 18),
  ];
  assert.equal(calcularMediaGeral(trend), 60);
  assert.equal(calcularQuestoesFeitas(trend), 50);
  assert.deepEqual(calcularMelhorNota(trend), {
    percentual: 80,
    data: "2026-10-18T12:00:00Z",
  });
  assert.equal(calcularEvolucao(trend), null);
});

test("10 simulados: evolução compara 5 recentes contra 5 anteriores em pontos percentuais", () => {
  const anteriores = [40, 50, 50, 60, 60].map((p, i) =>
    simulado(p / 10, 10, 1 + i),
  );
  const recentes = [60, 70, 70, 80, 80].map((p, i) =>
    simulado(p / 10, 10, 10 + i),
  );
  const evol = calcularEvolucao([...anteriores, ...recentes]);
  assert.deepEqual(evol, { pontos: 20, atual: 72, baseline: 52 });
});

test("evolução negativa não vira elogio", () => {
  const bons = Array.from({ length: 5 }, (_, i) => simulado(8, 10, 1 + i));
  const ruins = Array.from({ length: 5 }, (_, i) => simulado(4, 10, 10 + i));
  const evol = calcularEvolucao([...bons, ...ruins]);
  assert.deepEqual(evol, { pontos: -40, atual: 40, baseline: 80 });
});

test("totais com tamanhos diferentes somam questões, não contam provas", () => {
  const trend = [simulado(6, 10, 1), simulado(12, 20, 2), simulado(18, 30, 3)];
  assert.equal(calcularQuestoesFeitas(trend), 60);
  assert.equal(calcularMediaGeral(trend), 60);
});

test("recorte respeita a janela e não quebra com poucos registros", () => {
  const dez = Array.from({ length: 10 }, (_, i) => simulado(5, 10, 1 + i));
  assert.equal(recortarTrend(dez, "10").length, 10);
  assert.equal(recortarTrend(dez, "30").length, 10);
  assert.equal(recortarTrend(dez, "tudo").length, 10);

  const quarenta = Array.from({ length: 40 }, (_, i) =>
    simulado(5, 10, (i % 28) + 1),
  );
  assert.equal(recortarTrend(quarenta, "10").length, 10);
  assert.equal(recortarTrend(quarenta, "30").length, 30);
  assert.equal(recortarTrend(quarenta, "tudo").length, 40);
});

test("faixas de matéria: ≥70 é alto, 50-69 atenção, <50 foco", () => {
  assert.equal(faixaMateria(90), "alto");
  assert.equal(faixaMateria(70), "alto");
  assert.equal(faixaMateria(69), "atencao");
  assert.equal(faixaMateria(50), "atencao");
  assert.equal(faixaMateria(49), "foco");
  assert.equal(faixaMateria(0), "foco");
});

test("prioridades: ignora matérias sem amostra mínima e pega as 3 piores", () => {
  const porMateria = [
    { materia: "Civil", acertos: 10, total: 20 }, // 50%
    { materia: "Penal", acertos: 3, total: 11 }, // 27%
    { materia: "Novata", acertos: 0, total: 2 }, // amostra insuficiente, fica fora
    { materia: "Ética", acertos: 3, total: 7 }, // 43%
    { materia: "Processo Penal", acertos: 6, total: 15 }, // 40%
    { materia: "Trabalho", acertos: 18, total: 30 }, // 60%
  ];
  const foco = priorizarMaterias(porMateria);
  assert.deepEqual(
    foco.map((f) => f.materia),
    ["Penal", "Processo Penal", "Ética"],
  );
  assert.equal(nomesMateriasFoco(porMateria), "Penal, Processo Penal e Ética");
});

test("prioridade única e dupla não forçam vírgula sintética", () => {
  const uma = [{ materia: "Penal", acertos: 3, total: 11 }];
  const duas = [
    { materia: "Penal", acertos: 3, total: 11 },
    { materia: "Processo Penal", acertos: 6, total: 15 },
  ];
  assert.equal(nomesMateriasFoco(uma), "Penal");
  assert.equal(nomesMateriasFoco(duas), "Penal e Processo Penal");
});

test("datas de simulado usam o dia de Brasília, não o fuso do navegador", () => {
  // 02:30 UTC de 10/06 ainda é 23:30 de 09/06 em Brasília.
  assert.equal(formatarDataLonga("2026-06-10T02:30:00Z"), "09/06/2026");
  assert.equal(formatarDataCurta("2026-06-10T02:30:00Z"), "09 jun");
  assert.equal(formatarDataLonga("2026-06-10T12:00:00Z"), "10/06/2026");
});

test("data civil pura não sofre deslocamento de fuso", () => {
  assert.equal(formatarDataLonga("2026-06-10"), "10/06/2026");
  assert.equal(formatarDataCurta("2026-06-10"), "10 jun");
});

test("data ausente ou inválida vira texto vazio", () => {
  for (const v of [null, undefined, "", "lixo"]) {
    assert.equal(formatarDataCurta(v), "");
    assert.equal(formatarDataLonga(v), "");
  }
});
