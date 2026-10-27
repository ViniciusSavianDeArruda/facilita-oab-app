/**
 * Registra quais cargas iniciais (hidratação) falharam. Sem isso, uma falha
 * de rede vira lista vazia e a pessoa acredita que perdeu os dados.
 */
const falhas = new Set();

export function registrarFalha(nome) {
  falhas.add(nome);
}

export function limparFalha(nome) {
  falhas.delete(nome);
}

export function temFalhasDeCarga() {
  return falhas.size > 0;
}

export function listarFalhasDeCarga() {
  return [...falhas];
}
