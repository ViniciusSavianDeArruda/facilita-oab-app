/** Junta classes CSS ignorando valores falsy. */
export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/** Soma de minutos -> "1h20" (ou "45 min" se for menos de 1h). */
export function formatarDuracao(totalMinutos) {
  const h = Math.floor(totalMinutos / 60);
  const min = totalMinutos % 60;
  if (h === 0) return `${min} min`;
  if (min === 0) return `${h}h`;
  return `${h}h${String(min).padStart(2, "0")}`;
}
