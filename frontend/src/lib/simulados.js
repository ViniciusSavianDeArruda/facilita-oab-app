/**
 * Histórico de simulados — antes só "o último" ficava em lastActivity.js;
 * agora o backend guarda o histórico completo (usado também pela página
 * de Estatísticas).
 */

import { authFetchJson } from "./api";
import { hydrateCaderno } from "./caderno";

let _historico = [];

function notify() {
  window.dispatchEvent(new CustomEvent("simulados:changed"));
}

export function listarSimulados() {
  return _historico;
}

/** Deriva o mesmo formato que o card "Início" usava antes (lastActivity.js). */
export function ultimoSimulado() {
  if (_historico.length === 0) return null;

  const r = _historico[0];
  let materiaPrincipal = null;
  let max = 0;
  Object.entries(r.porMateria || {}).forEach(([m, s]) => {
    if (s.total > max) {
      max = s.total;
      materiaPrincipal = m;
    }
  });
  return {
    acertos: r.acertos,
    total: r.total,
    materiaPrincipal,
    updatedAt: r.createdAt,
  };
}

export async function hydrateSimulados() {
  try {
    _historico = await authFetchJson("/me/simulados");
  } catch {
    _historico = [];
  }
  notify();
  return _historico;
}

/**
 * Envia o resultado computado (SimuladoResults.jsx já calcula acertos/
 * porMateria via useMemo, igual antes). O backend cuida de gravar o
 * histórico E inserir as questões erradas no caderno, com dedup.
 */
export async function enviarResultadoSimulado({
  simulado,
  answers,
  elapsedSec,
  acertos,
  total,
  porMateria,
}) {
  const saved = await authFetchJson("/me/simulados", {
    method: "POST",
    body: JSON.stringify({
      modo: simulado.modo,
      materiaFiltro: simulado.materia_filtro ?? null,
      questoes: simulado.questoes,
      answers,
      elapsedSec,
      acertos,
      total,
      porMateria,
    }),
  });
  _historico = [saved, ..._historico];
  notify();
  await hydrateCaderno(); // o backend pode ter inserido itens novos
  return saved;
}

export function subscribeSimulados(cb) {
  const handler = () => cb();
  window.addEventListener("simulados:changed", handler);
  return () => window.removeEventListener("simulados:changed", handler);
}
