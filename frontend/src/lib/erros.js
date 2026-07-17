/**
 * Traduz erros de rede/API (Gemini, backend) em mensagens que fazem
 * sentido pra quem usa o app, em vez do JSON/traceback cru da exceção.
 */
export function mensagemErroAmigavel(erro) {
  const msg = erro?.message || "";
  if (/503|UNAVAILABLE|overloaded/i.test(msg)) {
    return "O mentor está sobrecarregado agora. Tenta de novo em alguns segundos.";
  }
  if (/429|RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(msg)) {
    return "Muitas mensagens em pouco tempo. Espera um instante e tenta de novo.";
  }
  if (/timeout|timed out/i.test(msg)) {
    return "A resposta demorou demais. Tenta de novo.";
  }
  return "Algo deu errado. Tenta de novo.";
}
