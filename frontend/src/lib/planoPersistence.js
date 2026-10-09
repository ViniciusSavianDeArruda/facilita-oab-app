// Serializa as escritas do plano. PUTs ainda não iniciados podem ser
// consolidados; DELETE permanece como barreira entre planos diferentes.
export function createPlanPersistence({ put, remove, onChange = () => {} }) {
  let local = null;
  let confirmed = null;
  let status = "idle";
  let version = 0;
  let failedType = null;
  let running = false;
  const queue = [];

  async function drain() {
    if (running) return;
    running = true;
    while (queue.length > 0) {
      const operation = queue.shift();
      try {
        const result =
          operation.type === "put"
            ? await put(operation.value)
            : await remove();
        confirmed = operation.type === "put" ? result : null;
        if (operation.version === version) {
          local = confirmed;
          status = "idle";
          failedType = null;
        }
        onChange();
        operation.waiters.forEach(({ resolve }) => resolve(result));
      } catch (error) {
        if (operation.version === version) {
          status = "error";
          failedType = operation.type;
        }
        onChange();
        operation.waiters.forEach(({ reject }) => reject(error));
      }
    }
    running = false;
  }

  function enqueue(type, value) {
    version += 1;
    local = type === "put" ? value : null;
    status = "pending";
    failedType = null;
    onChange();

    return new Promise((resolve, reject) => {
      const last = queue[queue.length - 1];
      if (type === "put" && last?.type === "put") {
        last.value = value;
        last.version = version;
        last.waiters.push({ resolve, reject });
      } else {
        queue.push({ type, value, version, waiters: [{ resolve, reject }] });
      }
      void drain();
    });
  }

  return {
    getLocal: () => local,
    getConfirmed: () => confirmed,
    getStatus: () => status,
    // Uma hidratação iniciada antes de uma edição não pode apagar essa edição.
    getVersion: () => version,
    hydrate(plan, startedAtVersion) {
      if (version !== startedAtVersion || status !== "idle") return;
      local = plan;
      confirmed = plan;
      onChange();
    },
    save: (plan) => enqueue("put", plan),
    clear: () => enqueue("delete", null),
    retry() {
      if (status !== "error" || !failedType) return Promise.resolve(local);
      return enqueue(failedType, local);
    },
  };
}
