/**
 * Última conversa — pro Início mostrar o card de retomada.
 * ("Último simulado" agora vive em lib/simulados.js, com histórico completo.)
 */

import { authFetchJson } from "./api";

let _lastChat = null;

function notify() {
  window.dispatchEvent(new CustomEvent("activity:changed"));
}

export function loadLastChat() {
  return _lastChat;
}

export async function hydrateLastActivity() {
  try {
    const data = await authFetchJson("/me");
    _lastChat = data.lastChat;
  } catch {
    _lastChat = null;
  }
  notify();
  return _lastChat;
}

export async function saveLastChat({ pergunta, resposta, materia }) {
  _lastChat = {
    pergunta,
    resposta,
    materia,
    updatedAt: new Date().toISOString(),
  };
  notify();
  try {
    await authFetchJson("/me/last-chat", {
      method: "PUT",
      body: JSON.stringify({ pergunta, resposta, materia }),
    });
  } catch {
    // não é crítico o bastante pra reverter a UI por causa disso
  }
}

export function subscribeActivity(cb) {
  const handler = () => cb();
  window.addEventListener("activity:changed", handler);
  return () => window.removeEventListener("activity:changed", handler);
}

export function tempoRelativo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin} min atrás`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  
  const diffD = Math.floor(diffH / 24);

  if (diffD < 7) return `${diffD}d atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
