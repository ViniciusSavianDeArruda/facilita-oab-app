
export const SIMULADO_STORAGE_KEY = "oab-simulado-current";
const VALIDADE_MS = 24 * 60 * 60 * 1000;

const questaoValida = (q) =>
  q &&
  typeof q.enunciado === "string" &&
  q.alternativas &&
  typeof q.alternativas === "object" &&
  typeof q.correta === "string";

/** Devolve o simulado salvo se a sessão persistida ainda puder ser retomada. */
export function sessaoRetomavel(saved, agora = Date.now()) {
  const sim = saved?.simulado;
  if (!sim || typeof sim.id !== "string" || saved.id !== sim.id) return null;
  if (!Array.isArray(sim.questoes) || sim.questoes.length === 0) return null;
  if (!sim.questoes.every(questaoValida)) return null;
  if (!Number.isFinite(saved.startedAt)) return null;
  if (agora - saved.startedAt > VALIDADE_MS) return null;
  return sim;
}

export function lerSimuladoSalvo(storage = globalThis.localStorage) {
  try {
    return sessaoRetomavel(JSON.parse(storage.getItem(SIMULADO_STORAGE_KEY)));
  } catch {
    return null;
  }
}

export function limparSimuladoSalvo(storage = globalThis.localStorage) {
  try {
    storage.removeItem(SIMULADO_STORAGE_KEY);
  } catch {
    // Armazenamento indisponível: não há o que limpar.
  }
}
