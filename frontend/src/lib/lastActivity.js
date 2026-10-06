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

// Tempo relativo compacto. "ontem" usa diferença de calendário, não de horas
// decorridas — 23h atrás pode ser hoje ou ontem dependendo do horário.
// Acima de uma semana volta à data real, para não ficar ambíguo.
export function tempoRelativo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;

  const inicioDoDia = (x) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diasDeCalendario = Math.round(
    (inicioDoDia(now) - inicioDoDia(d)) / 86400000,
  );

  if (diasDeCalendario === 0) return `há ${Math.floor(diffMin / 60)}h`;
  if (diasDeCalendario === 1) return "ontem";
  if (diasDeCalendario < 7) return `há ${diasDeCalendario}d`;

  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
