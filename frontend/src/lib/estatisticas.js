// Métricas derivadas de /me/stats. Puro, sem efeito colateral e sem rede —
// o backend devolve totalSimulados, porMateria, trend, streak e cadernoStatus,
// e o frontend monta a leitura editorial a partir desses campos.

import { dataCivilHoje } from "./dataCivil.js";

const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function percentual(acertos, total) {
  if (!total || total <= 0) return 0;
  return Math.round((acertos / total) * 100);
}

export function calcularMediaGeral(trend) {
  if (!Array.isArray(trend) || trend.length === 0) return null;
  let acertos = 0;
  let total = 0;
  for (const r of trend) {
    acertos += r.acertos || 0;
    total += r.total || 0;
  }
  if (total === 0) return null;
  return Math.round((acertos / total) * 100);
}

export function calcularQuestoesFeitas(trend) {
  if (!Array.isArray(trend) || trend.length === 0) return 0;
  return trend.reduce((acc, r) => acc + (r.total || 0), 0);
}

export function calcularMelhorNota(trend) {
  if (!Array.isArray(trend) || trend.length === 0) return null;
  let melhor = null;
  for (const r of trend) {
    const p = percentual(r.acertos, r.total);
    if (melhor === null || p > melhor.percentual) {
      melhor = { percentual: p, data: r.createdAt };
    }
  }
  return melhor;
}

export const MIN_SIMULADOS_PARA_EVOLUCAO = 10;

// Diferença em pontos percentuais entre os 5 simulados mais recentes e os 5
// anteriores. Retorna null quando não houver base suficiente — evita afirmar
// "você evoluiu" com dois ou três registros.
export function calcularEvolucao(trend) {
  if (!Array.isArray(trend) || trend.length < MIN_SIMULADOS_PARA_EVOLUCAO) {
    return null;
  }
  const recentes = trend.slice(-5);
  const anteriores = trend.slice(-10, -5);
  const media = (lista) => {
    let a = 0;
    let t = 0;
    for (const r of lista) {
      a += r.acertos || 0;
      t += r.total || 0;
    }
    return t > 0 ? Math.round((a / t) * 100) : 0;
  };
  const atual = media(recentes);
  const baseline = media(anteriores);
  return { pontos: atual - baseline, atual, baseline };
}

export const RECORTES = ["10", "30", "tudo"];

export function recortarTrend(trend, modo) {
  if (!Array.isArray(trend)) return [];
  if (modo === "tudo") return trend;
  const n = modo === "30" ? 30 : 10;
  return trend.length > n ? trend.slice(-n) : trend;
}

export function faixaMateria(p) {
  if (p >= 70) return "alto";
  if (p >= 50) return "atencao";
  return "foco";
}

// Mínimo de questões por matéria para entrar nas prioridades. Evita que uma
// matéria com 1/2 vire "a mais fraca" só por falta de amostra.
export const MIN_QUESTOES_PARA_PRIORIDADE = 5;

export function priorizarMaterias(
  porMateria,
  { minQuestoes = MIN_QUESTOES_PARA_PRIORIDADE, max = 3 } = {},
) {
  if (!Array.isArray(porMateria)) return [];
  return porMateria
    .filter((m) => (m.total || 0) >= minQuestoes)
    .map((m) => ({
      materia: m.materia,
      acertos: m.acertos || 0,
      total: m.total || 0,
      percentual: percentual(m.acertos, m.total),
    }))
    .sort((a, b) => a.percentual - b.percentual)
    .slice(0, max);
}

export function nomesMateriasFoco(porMateria) {
  const foco = priorizarMaterias(porMateria);
  if (foco.length === 0) return null;
  if (foco.length === 1) return foco[0].materia;
  if (foco.length === 2) return `${foco[0].materia} e ${foco[1].materia}`;
  return `${foco[0].materia}, ${foco[1].materia} e ${foco[2].materia}`;
}

// Data civil de Brasília para um instante (ISO/Date) ou uma data "YYYY-MM-DD".
// Evita que o fuso do navegador mude o dia exibido de um mesmo simulado.
function dataCivilDe(valor) {
  if (!valor) return null;
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor))
    return valor;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return dataCivilHoje(d);
}

export function formatarDataCurta(iso) {
  const civil = dataCivilDe(iso);
  if (!civil) return "";
  const [, mes, dia] = civil.split("-");
  return `${dia} ${MESES_CURTOS[Number(mes) - 1]}`;
}

export function formatarDataLonga(iso) {
  const civil = dataCivilDe(iso);
  if (!civil) return "";
  const [ano, mes, dia] = civil.split("-");
  return `${dia}/${mes}/${ano}`;
}
