/**
 * Cliente da API do backend.
 * - apiUrl: resolve caminho -> URL (proxy /api em dev, VITE_API_URL em produção)
 * - authFetch: fetch com Authorization + tratamento de 401
 * - streamChat: stream SSE do chat mentor
 * - gerarSimulado: cria simulado com N questões
 */

import { getToken, handleAuthExpired } from "./authClient";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

// Manda o offset de fuso do navegador em todo request — o backend usa isso
// pra saber o "hoje" do usuário (streak, registro de atividade), em vez do
// relógio do próprio servidor.
function tzHeader() {
  return { "X-Tz-Offset-Minutes": String(new Date().getTimezoneOffset()) };
}

async function parseErrorMessage(res) {
  const text = await res.text();
  try {
    const body = JSON.parse(text);
    if (body?.detail) return body.detail;
  } catch {
    // não era JSON — usa o texto cru mesmo
  }
  return text || `Erro ${res.status}`;
}

export async function authFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...tzHeader(), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl(path), { ...options, headers });

  if (res.status === 401) {
    handleAuthExpired();
  }

  return res;
}

export async function authFetchJson(path, options = {}) {
  const res = await authFetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  if (res.status === 204) return null;
  return res.json();
}

// Cada evento SSE vira { type: 'conversaId', conversaId } ou { type: 'text', text }.
export async function* streamChat({
  messages,
  materia,
  conversaId,
  tituloConversa,
  signal,
}) {
  const token = getToken();
  const res = await fetch(apiUrl("/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...tzHeader(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, materia, conversaId, tituloConversa }),
    signal,
  });

  if (res.status === 401) handleAuthExpired();
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop();
    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.conversaId !== undefined) {
          yield { type: "conversaId", conversaId: parsed.conversaId };
        }
        if (parsed.text) yield { type: "text", text: parsed.text };
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

export async function gerarSimulado({ modo, materia }) {
  return authFetchJson("/simulado", {
    method: "POST",
    body: JSON.stringify({ modo, materia }),
  });
}
