/**
 * Executa uma gravação e devolve `true`/`false` em vez de lançar, para que a
 * interface possa avisar a falha. `aoFalhar` desfaz alterações otimistas.
 */
export async function executarMutacao({ enviar, aoSucesso, aoFalhar }) {
  try {
    const resultado = await enviar();
    aoSucesso?.(resultado);
    return true;
  } catch (erro) {
    aoFalhar?.(erro);
    return false;
  }
}
