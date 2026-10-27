export const LIMITE_MENSAGEM = 10_000;
export const LIMITE_HISTORICO = 100;

export const mensagemMuitoLonga = (texto) => texto.length > LIMITE_MENSAGEM;

/** Últimas mensagens do histórico, começando sempre por uma fala do usuário. */
export function recortarHistorico(mensagens, limite = LIMITE_HISTORICO) {
  if (mensagens.length <= limite) return mensagens;
  const recorte = mensagens.slice(-limite);
  const inicio = recorte.findIndex((m) => m.role === "user");
  return inicio === -1 ? recorte : recorte.slice(inicio);
}
