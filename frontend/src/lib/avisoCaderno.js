export const AVISO_REMOCAO_FALHOU =
  "Não foi possível remover o item. Ele continua no Caderno. Tente novamente.";

// Só a falha de remoção produz aviso; qualquer outra ação do usuário o descarta.
export function reduzirAviso(_aviso, evento) {
  return evento === "remocao-falhou" ? AVISO_REMOCAO_FALHOU : null;
}
