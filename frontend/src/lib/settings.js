/**
 * Settings — dados pessoais/config, agora vindos da API (/me).
 *
 * Padrão cache-em-memória + getters síncronos: `loadSettings()` continua
 * síncrono (lê o cache) pra não quebrar componentes que chamam ele direto
 * no corpo do render / useState inicial. `hydrateSettings()` é chamado uma
 * vez no boot autenticado do App e popula o cache de verdade.
 */

import { authFetchJson } from "./api";

const DEFAULT = { nome: "", dataProva: null };

let _settings = DEFAULT;

export function loadSettings() {
  return _settings;
}

export async function hydrateSettings() {
  try {
    const data = await authFetchJson("/me");
    _settings = { nome: data.nome, dataProva: data.dataProva };
  } catch {
    _settings = DEFAULT;
  }
  window.dispatchEvent(new CustomEvent("settings:changed"));
  return _settings;
}

export async function saveSettings(patch) {
  const previous = _settings;
  _settings = { ..._settings, ...patch };
  window.dispatchEvent(new CustomEvent("settings:changed"));

  try {
    const data = await authFetchJson("/me", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    _settings = { nome: data.nome, dataProva: data.dataProva };
  } catch (e) {
    console.error("Falha ao salvar settings:", e);
    _settings = previous;
  }
  window.dispatchEvent(new CustomEvent("settings:changed"));
  return _settings;
}

export function subscribeSettings(cb) {
  const handler = () => cb(loadSettings());
  window.addEventListener("settings:changed", handler);
  return () => window.removeEventListener("settings:changed", handler);
}

// Utility: dias restantes até a prova
export function diasAteProva(dataProvaStr) {
  if (!dataProvaStr) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prova = new Date(dataProvaStr + "T00:00:00");
  const ms = prova - hoje;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// Utility: saudação por horário
export function saudacao() {
  const h = new Date().getHours();
  if (h < 6) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
