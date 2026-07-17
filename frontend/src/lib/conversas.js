/**
 * Histórico de conversas do chat — sidebar interna, estilo ChatGPT/Claude.
 */

import { authFetchJson } from "./api";

const CONVERSA_ATIVA_KEY = "facilita-oab-conversa-atual";

let _conversas = [];

function notify() {
  window.dispatchEvent(new CustomEvent("conversas:changed"));
}

export function listarConversas() {
  return _conversas;
}

export async function hydrateConversas() {
  try {
    _conversas = await authFetchJson("/chat/conversas");
  } catch {
    _conversas = [];
  }
  notify();
  return _conversas;
}

export async function carregarConversa(id) {
  return authFetchJson(`/chat/conversas/${id}`);
}

export async function renomearConversa(id, titulo) {
  return authFetchJson(`/chat/conversas/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ titulo }),
  });
}

export async function deletarConversa(id) {
  await authFetchJson(`/chat/conversas/${id}`, { method: "DELETE" });
}

export function lerConversaAtivaStorage() {
  const raw = localStorage.getItem(CONVERSA_ATIVA_KEY);
  return raw ? Number(raw) : null;
}

export function salvarConversaAtivaStorage(id) {
  if (id === null) {
    localStorage.removeItem(CONVERSA_ATIVA_KEY);
  } else {
    localStorage.setItem(CONVERSA_ATIVA_KEY, String(id));
  }
}

export function subscribeConversas(cb) {
  const handler = () => cb();
  window.addEventListener("conversas:changed", handler);
  return () => window.removeEventListener("conversas:changed", handler);
}

// "hoje" / "ontem" / "N dias atrás" / "dd/mm" — agrupamento por dia de calendário,
// diferente do tempoRelativo() de lastActivity.js (que é tempo decorrido contínuo).
export function formatarDataRelativa(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hoje = new Date();

  const dZero = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const hojeZero = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
  ).getTime();
  const diffDias = Math.round((hojeZero - dZero) / 86400000);

  if (diffDias === 0) return "hoje";
  if (diffDias === 1) return "ontem";
  if (diffDias > 1 && diffDias < 7) return `${diffDias} dias atrás`;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}
