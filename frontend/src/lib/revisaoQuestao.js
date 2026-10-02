// Reconhece a mensagem de "revisar questão que errei" que o App monta em
// `discussWithMentor` (src/App.jsx) antes de abrir o Chat.
//
// O Chat recebe só a string do prompt — não há tipo/origem estruturada na
// mensagem persistida. Como o texto é gerado por template determinístico do
// próprio app (e não digitado),

// IMPORTANTE: o conteúdo enviado à IA não passa por aqui. Isto é só
// apresentação — o payload continua sendo a string original.

const ABERTURA = "Estou revisando uma questão que errei:";

export function parseRevisaoQuestao(texto) {
  if (typeof texto !== "string" || !texto.startsWith(ABERTURA)) return null;

  const enunciado = texto.match(
    /\*\*Enunciado:\*\*\s*([\s\S]*?)\n\nMarquei a alternativa/,
  );
  const dada = texto.match(
    /Marquei a alternativa \*\*(.+?)\*\*:\s*"([\s\S]*?)"\n\nO gabarito/,
  );
  const correta = texto.match(/O gabarito é a \*\*(.+?)\*\*:\s*"([\s\S]*?)"/);

  // Sem as três partes essenciais não há bloco de revisão — cai no bubble.
  if (!enunciado || !dada || !correta) return null;

  const anotacao = texto.match(
    /\n\nMinha anotação sobre isso: ([\s\S]*?)\n\nMe explica/,
  );
  const pedido = texto.match(/\n\n(Me explica o raciocínio\?[\s\S]*)$/);

  return {
    enunciado: enunciado[1].trim(),
    letraDada: dada[1].trim(),
    respostaDada: dada[2].trim(),
    letraCorreta: correta[1].trim(),
    respostaCorreta: correta[2].trim(),
    anotacao: anotacao ? anotacao[1].trim() : null,
    pedido: pedido ? pedido[1].trim() : null,
  };
}
