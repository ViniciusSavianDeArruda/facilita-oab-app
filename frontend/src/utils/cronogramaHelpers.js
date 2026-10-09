// Pra onde o botão de ação de cada item deve levar.
export function destinoPorTipo(tipo) {
  if (tipo === "simulado") return "simulado-landing";
  if (tipo === "caderno") return "caderno";
  return "chat"; // revisar -> Chat pra tirar dúvidas da matéria
}

// Agrupa itens idênticos (mesmo tipo/matéria/duração) pra exibição
// compacta — ex.: "2× Revisar caderno · 15 min cada". Guarda os índices
// originais (idxs) pra permitir marcar/desmarcar o grupo inteiro de uma
// vez em ItemRowGroup, e se todos os itens do grupo já estão concluídos.
export function agruparItens(itens) {
  const grupos = [];
  itens.forEach((item, idx) => {
    const chave = `${item.tipo}|${item.materia || ""}|${item.minutos}`;
    const existente = grupos.find((g) => g.chave === chave);
    if (existente) {
      existente.count++;
      existente.idxs.push(idx);
      if (!item.concluido) existente.todasConcluidas = false;
    } else {
      grupos.push({
        chave,
        item,
        count: 1,
        idxs: [idx],
        todasConcluidas: item.concluido,
      });
    }
  });
  return grupos;
}
