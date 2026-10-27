export function mensagemErroLogin(status) {
  if (status === 401) return "Senha incorreta.";
  if (status === 429)
    return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return "Não foi possível entrar agora. Tente novamente em instantes.";
}
