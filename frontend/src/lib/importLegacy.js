/**
 * Import único dos dados que ficavam em localStorage antes da migração
 * pro backend. Roda só uma vez (flag facilita-oab-imported) no primeiro
 * boot autenticado onde ainda existam chaves antigas no navegador.
 */

import { authFetchJson } from "./api";

const IMPORTED_FLAG = "facilita-oab-imported";

const LEGACY_KEYS = {
  settings: "facilita-oab-settings",
  caderno: "oab-caderno-items",
  cronogramaConfig: "facilita-oab-crono-config",
  cronogramaPlano: "facilita-oab-crono-plano",
};

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasLegacyData() {
  if (localStorage.getItem(IMPORTED_FLAG)) return false;
  return Object.values(LEGACY_KEYS).some((key) => !!localStorage.getItem(key));
}

export function dismissLegacyImport() {
  localStorage.setItem(IMPORTED_FLAG, "true");
}

export async function importLegacyData() {
  const settings = readJson(LEGACY_KEYS.settings);
  const caderno = readJson(LEGACY_KEYS.caderno) || [];
  const cronogramaConfig = readJson(LEGACY_KEYS.cronogramaConfig);
  const cronogramaPlano = readJson(LEGACY_KEYS.cronogramaPlano);

  const payload = {
    nome: settings?.nome ?? null,
    dataProva: settings?.dataProva ?? null,
    caderno,
    cronogramaConfig: cronogramaConfig
      ? {
          horasPorDia: cronogramaConfig.horasPorDia,
          materiasFracas: cronogramaConfig.materiasFracas || [],
        }
      : null,
    cronogramaPlano,
  };

  const result = await authFetchJson("/me/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  dismissLegacyImport();
  return result;
}
