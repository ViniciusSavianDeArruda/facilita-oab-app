/** Uma tentativa por simulado nesta sessão; POST não é idempotente no backend. */
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
          attempt.state = { status: "saved", savedCount: saved.savedCount ?? 0 };
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

  return { peek, start };
}
