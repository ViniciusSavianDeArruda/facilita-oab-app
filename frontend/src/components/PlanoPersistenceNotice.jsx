export default function PlanoPersistenceNotice({ status, onRetry, className = "" }) {
  if (status === "idle") return null;

  if (status === "pending") {
    return (
      <p className={`text-xs text-cream-400 ${className}`} role="status">
        Salvando alterações do plano…
      </p>
    );
  }

  return (
    <div
      role="alert"
      className={`rounded-lg border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-alert ${className}`}
    >
      <p>
        Não foi possível confirmar o salvamento do plano. A alteração permanece
        nesta sessão, mas pode se perder ao recarregar a página.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 min-h-10 rounded-lg px-2 font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
      >
        Tentar sincronizar
      </button>
    </div>
  );
}
