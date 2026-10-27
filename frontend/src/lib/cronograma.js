/**
 * Cronograma de estudos.
 *
 * O algoritmo de geração (gerarPlano) continua 100% client-side — só
 * load/save de config e plano viram chamadas de API (cache em memória +
 * getters síncronos, mesmo padrão de settings.js/caderno.js).
 */

import { authFetchJson } from "./api";
import { dataCivilHoje, diaDaSemana, diasEntre, somarDias } from "./dataCivil";
import { MATERIAS_CRONO, PESO_FGV } from "./materias";
import { createPlanPersistence } from "./planoPersistence";

export { MATERIAS_CRONO };

const DEFAULT_CONFIG = {
  horasPorDia: 2,
  materiasFracas: [],
  atualizadoEm: null,
};

let _config = DEFAULT_CONFIG;
let _planoFoiCarregado = false;
let _planoLoadStatus = "loading";

function notify() {
  window.dispatchEvent(new CustomEvent("crono:changed"));
}

const planoPersistence = createPlanPersistence({
  put: async (plano) => {
    const saved = await authFetchJson("/me/cronograma/plano", {
      method: "PUT",
      body: JSON.stringify(plano),
    });
    _planoFoiCarregado = true;
    return saved;
  },
  remove: async () => {
    await authFetchJson("/me/cronograma/plano", { method: "DELETE" });
    _planoFoiCarregado = true;
  },
  onChange: notify,
});

// ============ CONFIG ============

export function loadConfig() {
  return _config;
}

export async function hydrateCronogramaConfig() {
  try {
    _config = await authFetchJson("/me/cronograma/config");
  } catch {
    _config = DEFAULT_CONFIG;
  }
  notify();
  return _config;
}

export async function saveConfig(patch, { throwOnError = false } = {}) {
  const previous = _config;
  const next = { ..._config, ...patch, atualizadoEm: new Date().toISOString() };
  _config = next;
  notify();
  try {
    _config = await authFetchJson("/me/cronograma/config", {
      method: "PUT",
      body: JSON.stringify({
        horasPorDia: next.horasPorDia,
        materiasFracas: next.materiasFracas,
      }),
    });
  } catch (e) {
    console.error("Falha ao salvar config do cronograma:", e);
    _config = previous;
    notify();
    if (throwOnError) throw e;
  }
  notify();
  return _config;
}

// ============ PLANO ============

export function loadPlano() {
  return planoPersistence.getLocal();
}

export function planoPersistenciaStatus() {
  return planoPersistence.getStatus();
}

export function planoFoiCarregado() {
  return _planoFoiCarregado;
}

export function planoLoadStatus() {
  return _planoLoadStatus;
}

export async function hydrateCronogramaPlano() {
  const startedAtVersion = planoPersistence.getVersion();
  _planoLoadStatus = "loading";
  notify();
  try {
    const plano = await authFetchJson("/me/cronograma/plano");
    planoPersistence.hydrate(plano, startedAtVersion);
    _planoFoiCarregado = true;
    _planoLoadStatus = "ready";
  } catch {
    _planoFoiCarregado = false;
    _planoLoadStatus = "error";
  }
  notify();
  return loadPlano();
}

export async function savePlano(plano, { throwOnError = false } = {}) {
  try {
    await planoPersistence.save(plano);
  } catch (e) {
    console.error("Falha ao salvar plano:", e);
    if (throwOnError) throw e;
  }
  return loadPlano();
}

export async function limparPlano({ throwOnError = false } = {}) {
  try {
    await planoPersistence.clear();
  } catch (e) {
    console.error("Falha ao limpar plano:", e);
    if (throwOnError) throw e;
  }
}

export async function retryPersistenciaPlano() {
  try {
    await planoPersistence.retry();
  } catch (e) {
    console.error("Falha ao tentar sincronizar o plano novamente:", e);
  }
  return loadPlano();
}

export function subscribeCrono(cb) {
  const handler = () => cb();
  window.addEventListener("crono:changed", handler);
  return () => window.removeEventListener("crono:changed", handler);
}

//ALGORITMO DE GERAÇÃO
// Quantos dias gerar de uma vez quando não há data da prova (rodízio sem fim definido).
const DIAS_ROTATIVO = 180;

/**
 * Gera plano do dia de hoje até a dataProva.
 * Distribui matérias respeitando peso FGV × (2 se fraca).
 * Cada 4º dia é simulado + revisão de caderno.
 *
 * Sem dataProva, gera um rodízio simples e contínuo pelas matérias (sem
 * simulados periódicos nem distribuição por peso proporcional) — usado
 * quando a estudante ainda não sabe a data da prova.
 */
export function gerarPlano(dataProvaStr, config) {
  if (!dataProvaStr) return gerarPlanoRotativo(config);
  const hoje = dataCivilHoje();
  const diasRestantes = diasEntre(hoje, dataProvaStr);
  if (diasRestantes <= 0) return null;

  const horasPorDia = Math.max(0.5, config.horasPorDia || 2);
  const fracas = new Set(config.materiasFracas || []);

  // Calcula peso final de cada matéria
  const pesos = {};
  let totalPeso = 0;
  Object.entries(PESO_FGV).forEach(([m, p]) => {
    const peso = p * (fracas.has(m) ? 2 : 1);
    pesos[m] = peso;
    totalPeso += peso;
  });

  // Distribui dias entre matérias proporcional ao peso
  // Reserva ~25% dos dias pra simulado
  const nSimulados = Math.max(1, Math.floor(diasRestantes / 4));
  const diasParaMaterias = diasRestantes - nSimulados;

  // Quantidade de dias que cada matéria deve receber
  const diasPorMateria = {};
  Object.entries(pesos).forEach(([m, p]) => {
    diasPorMateria[m] = Math.max(
      1,
      Math.round((p / totalPeso) * diasParaMaterias),
    );
  });

  // Constrói fila de matérias intercalando (não repetir seguidas)
  const filaMaterias = [];
  const pesoOrdenado = Object.entries(pesos)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);
  const contagem = { ...diasPorMateria };
  let seguranca = 0;
  while (Object.values(contagem).some((v) => v > 0) && seguranca++ < 10000) {
    let adicionou = false;
    for (const m of pesoOrdenado) {
      if (contagem[m] > 0 && filaMaterias[filaMaterias.length - 1] !== m) {
        filaMaterias.push(m);
        contagem[m]--;
        adicionou = true;
      }
    }
    // Se não conseguiu adicionar nada (todos empatados com o último), força
    if (!adicionou) {
      for (const m of pesoOrdenado) {
        if (contagem[m] > 0) {
          filaMaterias.push(m);
          contagem[m]--;
          break;
        }
      }
    }
  }

  // Constrói dias
  const dias = [];
  let idxMateria = 0;
  for (let d = 0; d < diasRestantes; d++) {
    const dataStr = somarDias(hoje, d);

    // A cada 4 dias, é simulado
    const isSimuladoDay = (d + 1) % 4 === 0;

    let itens;
    if (isSimuladoDay) {
      itens = [
        { tipo: "simulado", minutos: 25, concluido: false },
        { tipo: "caderno", minutos: 20, concluido: false },
      ];
    } else {
      const materia =
        filaMaterias[idxMateria % filaMaterias.length] || "Constitucional";
      idxMateria++;
      const totalMin = Math.round(horasPorDia * 60);
      // Se sobrar minutos, adiciona caderno curto
      if (totalMin >= 90) {
        itens = [
          {
            tipo: "revisar",
            materia,
            minutos: totalMin - 15,
            concluido: false,
          },
          { tipo: "caderno", minutos: 15, concluido: false },
        ];
      } else {
        itens = [
          { tipo: "revisar", materia, minutos: totalMin, concluido: false },
        ];
      }
    }

    dias.push({ data: dataStr, itens, concluido: false });
  }

  return {
    geradoEm: new Date().toISOString(),
    dataProva: dataProvaStr,
    horasPorDia,
    dias,
  };
}

/**
 * Rodízio contínuo pelas matérias, sem data de prova definida.
 * Passa por todas as matérias em ordem; as fracas aparecem de novo numa
 * segunda volta menor, dando o dobro de frequência a elas.
 */
function gerarPlanoRotativo(config) {
  const hoje = dataCivilHoje();

  const horasPorDia = Math.max(0.5, config.horasPorDia || 2);
  const fracas = Array.from(config.materiasFracas || []);

  const filaMaterias = [...MATERIAS_CRONO, ...fracas];

  const dias = [];
  for (let d = 0; d < DIAS_ROTATIVO; d++) {
    const dataStr = somarDias(hoje, d);

    const materia = filaMaterias[d % filaMaterias.length];
    const totalMin = Math.round(horasPorDia * 60);

    let itens;
    if (totalMin >= 90) {
      itens = [
        { tipo: "revisar", materia, minutos: totalMin - 15, concluido: false },
        { tipo: "caderno", minutos: 15, concluido: false },
      ];
    } else {
      itens = [
        { tipo: "revisar", materia, minutos: totalMin, concluido: false },
      ];
    }

    dias.push({ data: dataStr, itens, concluido: false });
  }

  return {
    geradoEm: new Date().toISOString(),
    dataProva: null,
    horasPorDia,
    dias,
  };
}

// ============ HELPERS ============

export function planoEstaValido(plano, dataProvaAtual) {
  if (!plano || !plano.dias || plano.dias.length === 0) return false;
  if (plano.dataProva !== dataProvaAtual) return false;
  const hoje = dataCivilHoje();
  // Plano ainda tem dias futuros ou de hoje — continua válido
  const ultimoDia = plano.dias[plano.dias.length - 1]?.data;
  return ultimoDia >= hoje;
}

export function planoDeHoje(plano) {
  if (!plano) return null;
  const hoje = dataCivilHoje();
  return plano.dias.find((d) => d.data === hoje) || null;
}

export function proximos7Dias(plano, qtd = 7) {
  if (!plano) return [];
  const hoje = dataCivilHoje();
  return plano.dias.filter((d) => d.data >= hoje).slice(0, qtd);
}

/** % de itens concluídos no plano inteiro (todos os dias, não só hoje). */
export function percentualConcluido(plano) {
  if (!plano || !plano.dias || plano.dias.length === 0) return null;
  let total = 0;
  let feitos = 0;
  for (const dia of plano.dias) {
    for (const item of dia.itens) {
      total++;
      if (item.concluido) feitos++;
    }
  }
  if (total === 0) return null;
  return Math.round((feitos / total) * 100);
}

/**
 * Marca item como concluído. Se todos os itens do dia estiverem concluídos,
 * marca o dia como concluído também.
 */
export function marcarItemConcluido(dataDia, idxItem, concluido) {
  marcarItensConcluidos(dataDia, [idxItem], concluido);
}

export function marcarItensConcluidos(dataDia, indices, concluido) {
  const plano = loadPlano();
  if (!plano) return;
  const novoPlano = {
    ...plano,
    dias: plano.dias.map((d) => ({
      ...d,
      itens: d.itens.map((i) => ({ ...i })),
    })),
  };
  const dia = novoPlano.dias.find((d) => d.data === dataDia);
  if (!dia || indices.some((idx) => !dia.itens[idx])) return;
  indices.forEach((idx) => {
    dia.itens[idx].concluido = concluido;
  });
  dia.concluido = dia.itens.every((i) => i.concluido);
  savePlano(novoPlano);
}

/**
 * Redistribui pendências dos dias passados sem excluir o histórico.
 * Prioriza dias com menos de 3 itens; quando todos estão cheios, usa o menos carregado.
 */
export async function recompactarPlano() {
  const plano = loadPlano();
  if (!plano) return;
  const hoje = dataCivilHoje();
  const novoPlano = {
    ...plano,
    dias: plano.dias.map((d) => ({
      ...d,
      itens: d.itens.map((i) => ({ ...i })),
    })),
  };
  const futuros = novoPlano.dias.filter((d) => d.data >= hoje);
  if (futuros.length === 0) return;

  let moveuItens = false;
  novoPlano.dias.forEach((diaPassado) => {
    if (diaPassado.data >= hoje) return;
    const pendentes = diaPassado.itens.filter((i) => !i.concluido);
    pendentes.forEach((item) => {
      // Sem vaga, usa o dia menos carregado; nenhuma tarefa é descartada.
      const destino =
        futuros.find((d) => d.itens.length < 3) ||
        futuros.reduce((menor, d) =>
          d.itens.length < menor.itens.length ? d : menor,
        );
      destino.itens.push(item);
      destino.concluido = false;
      moveuItens = true;
    });
    if (pendentes.length > 0) {
      // Mantém o dia no histórico, inclusive seus blocos já concluídos.
      diaPassado.itens = diaPassado.itens.filter((i) => i.concluido);
      diaPassado.concluido = diaPassado.itens.length > 0;
    }
  });

  if (moveuItens) await savePlano(novoPlano, { throwOnError: true });
}

// Utilities

export function tipoLabel(tipo) {
  return (
    {
      revisar: "Revisar",
      simulado: "Simulado",
      caderno: "Caderno",
    }[tipo] || tipo
  );
}

export function itemDescricao(item) {
  if (item.tipo === "revisar") return `${item.materia} · ${item.minutos} min`;
  if (item.tipo === "simulado") return `Simulado rápido · ${item.minutos} min`;
  if (item.tipo === "caderno") return `Revisar caderno · ${item.minutos} min`;
  return `${tipoLabel(item.tipo)} · ${item.minutos} min`;
}

export function nomeDiaSemana(dataStr, hoje = null) {
  const diff = diasEntre(hoje || dataCivilHoje(), dataStr);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  const nomes = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  return nomes[diaDaSemana(dataStr)];
}
