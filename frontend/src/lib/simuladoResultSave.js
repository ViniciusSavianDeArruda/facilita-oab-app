/**
 * Uma tentativa por simulado nesta sessão. O POST não é idempotente no
 * backend, então o reenvio só acontece via `retry` (ação explícita do usuário)
 * e quem o chama deve antes conferir se o resultado já foi gravado.
 */
export function createResultSaveRegistry({ onError = () => {} } = {}) {
  const attempts = new Map();

  function peek(id) {
    return attempts.get(id)?.state ?? null;
  }

  function start(id, submit) {
    const existing = attempts.get(id);
    if (existing) return existing.promise;

    const attempt = {
      state: { status: "saving", savedCount: 0 },
      promise: null,
    };
    attempts.set(id, attempt);
    attempt.promise = Promise.resolve()
      .then(submit)
      .then(
        (saved) => {
          attempt.state = {
            status: "saved",
            savedCount: saved.savedCount ?? 0,
          };
          return attempt.state;
        },
        (error) => {
          onError(error);
          attempt.state = { status: "unconfirmed", savedCount: 0 };
          return attempt.state;
        },
      );
    return attempt.promise;
  }

  function retry(id, submit) {
    const existing = attempts.get(id);
    if (!existing) return null;
    if (existing.state.status !== "unconfirmed") return existing.promise;
    attempts.delete(id);
    return start(id, submit);
  }

  return { peek, start, retry };
}

const normalizarRespostas = (answers) =>
  JSON.stringify(
    Object.entries(answers ?? {})
      .map(([indice, resposta]) => [String(indice), resposta])
      .sort(([a], [b]) => Number(a) - Number(b)),
  );

const enunciados = (lista) => (lista ?? []).map((q) => q.enunciado);

/** Um resultado do histórico corresponde ao payload que tentamos enviar? */
export function mesmoResultado(registro, payload) {
  const { simulado, answers, elapsedSec, acertos, total } = payload;
  if (registro.modo !== simulado.modo) return false;
  if (registro.acertos !== acertos || registro.total !== total) return false;
  if (registro.elapsedSec !== elapsedSec) return false;
  if (
    JSON.stringify(enunciados(registro.questoes)) !==
    JSON.stringify(enunciados(simulado.questoes))
  )
    return false;
  return normalizarRespostas(registro.answers) === normalizarRespostas(answers);
}
