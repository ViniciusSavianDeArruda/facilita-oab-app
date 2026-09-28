/**
 * Traduz erros de rede/API (Gemini, backend) em mensagens que fazem
 * sentido pra quem usa o app, em vez do JSON/traceback cru da exceção.
 */
export function mensagemErroAmigavel(erro) {
  const msg = erro?.message || "";

  if (/429|RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(msg)) {
    return "O limite de geração foi atingido no momento. Tente novamente mais tarde.";
  }

  if (/503|UNAVAILABLE|overloaded/i.test(msg)) {
    return "O serviço de geração está temporariamente indisponível. Tente novamente em alguns minutos.";
  }

  if (/504|timeout|timed out/i.test(msg)) {
    return "A geração demorou mais que o esperado. Tente novamente.";
  }

  return "Não foi possível concluir a solicitação. Tente novamente.";
}
