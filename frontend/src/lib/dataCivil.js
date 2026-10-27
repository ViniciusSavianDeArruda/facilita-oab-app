// Datas civis ("YYYY-MM-DD") não têm fuso. "Hoje" é o dia civil de Brasília;
// a aritmética usa UTC apenas como calendário puro, sem deslocamento.

export const FUSO_NEGOCIO = "America/Sao_Paulo";

const MS_DIA = 24 * 60 * 60 * 1000;

const formatadorNegocio = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_NEGOCIO,
  year: "numeric",
  
  month: "2-digit",
  day: "2-digit",
});

export function dataCivilHoje(agora = new Date()) {
  const partes = {};
  for (const { type, value } of formatadorNegocio.formatToParts(agora)) {
    partes[type] = value;
  }
  return `${partes.year}-${partes.month}-${partes.day}`;
}

function paraUtc(dataStr) {
  const [a, m, d] = dataStr.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

export function somarDias(dataStr, dias) {
  return new Date(paraUtc(dataStr) + dias * MS_DIA).toISOString().slice(0, 10);
}

export function diasEntre(de, ate) {
  return Math.round((paraUtc(ate) - paraUtc(de)) / MS_DIA);
}

export function diaDaSemana(dataStr) {
  return new Date(paraUtc(dataStr)).getUTCDay();
}
