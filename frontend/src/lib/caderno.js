/**
 * Caderno de erros — cache em memória hidratado a partir da API.
 *
 * Itens de origem 'simulado' não são criados por aqui: o backend os cria
 * como efeito colateral de POST /me/simulados (ver lib/simulados.js).
 * Esse módulo cuida de leitura, criação a partir do chat, e edição/remoção.
 */

import { authFetchJson } from "./api";

let _items = [];

function sortByCreatedAtDesc(items) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
}

function notify() {
  window.dispatchEvent(new CustomEvent("caderno:changed"));
}

export function listar() {
  return _items;
}

export function contarPorStatus() {
  return {
    total: _items.length,
    aberto: _items.filter((i) => i.status === "aberto").length,
    revisando: _items.filter((i) => i.status === "revisando").length,
    dominado: _items.filter((i) => i.status === "dominado").length,
  };
}

export async function hydrateCaderno() {
  try {
    _items = sortByCreatedAtDesc(await authFetchJson("/me/caderno"));
  } catch {
    _items = [];
  }
  notify();
  return _items;
}

export async function salvarDoChat({ pergunta, resposta, materia }) {
  const optimistic = {
    id: `tmp-${Date.now()}`,
    createdAt: new Date().toISOString(),
    origin: "chat",
    status: "aberto",
    materia: materia || "Geral",
    anotacao: "",
    pergunta,
    resposta,
  };
  _items = sortByCreatedAtDesc([optimistic, ..._items]);
  notify();

  try {
    const saved = await authFetchJson("/me/caderno", {
      method: "POST",
      body: JSON.stringify({ pergunta, resposta, materia }),
    });
    _items = sortByCreatedAtDesc(
      _items.map((i) => (i.id === optimistic.id ? saved : i)),
    );
    notify();
    return saved;
  } catch (e) {
    console.error("Falha ao salvar no caderno:", e);
    _items = _items.filter((i) => i.id !== optimistic.id);
    notify();
    return null;
  }
}

export async function atualizarStatus(id, status) {
  const previous = _items;
  _items = _items.map((i) => (i.id === id ? { ...i, status } : i));
  notify();
  try {
    await authFetchJson(`/me/caderno/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  } catch (e) {
    console.error("Falha ao atualizar status:", e);
    _items = previous;
    notify();
  }
}

export async function atualizarAnotacao(id, anotacao) {
  const previous = _items;
  _items = _items.map((i) => (i.id === id ? { ...i, anotacao } : i));
  notify();
  try {
    await authFetchJson(`/me/caderno/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ anotacao }),
    });
  } catch (e) {
    console.error("Falha ao atualizar anotação:", e);
    _items = previous;
    notify();
  }
}

export async function remover(id) {
  const previous = _items;
  _items = _items.filter((i) => i.id !== id);
  notify();
  try {
    await authFetchJson(`/me/caderno/${id}`, { method: "DELETE" });
  } catch (e) {
    console.error("Falha ao remover item:", e);
    _items = previous;
    notify();
  }
}

export function subscribe(callback) {
  const handler = () => callback();
  window.addEventListener("caderno:changed", handler);
  return () => window.removeEventListener("caderno:changed", handler);
}
