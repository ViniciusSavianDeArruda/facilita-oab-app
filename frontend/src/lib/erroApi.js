/** `detail` do FastAPI é texto, ou uma lista de objetos nos erros de validação (422). */
export function mensagemDeDetalhe(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return "Algum dado enviado é inválido ou grande demais.";
  }
  return null;
}
