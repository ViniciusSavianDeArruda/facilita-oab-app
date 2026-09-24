import { useState } from "react";
import Brand from "./Brand";
import { login } from "../lib/authClient";

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    try {
      await login(password);
      onSuccess?.();
    } catch (err) {
      setError(err.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex items-center justify-center px-6 bg-sand-50">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Brand size="login" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] tracking-widest uppercase text-brass-dim font-medium block mb-2">
              Senha
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha de acesso"
              className="w-full bg-ink-900 border border-ink-800 rounded-xl px-4 py-3 text-cream-50 placeholder:text-cream-600 focus:border-brass-dim focus:outline-none"
            />
          </div>

          {error && (
            <div className="text-sm text-alert border border-alert/30 bg-alert/5 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!password || loading}
            className="w-full bg-brass hover:bg-brass-hover disabled:bg-ink-800 disabled:text-cream-600 text-ink-950 font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
