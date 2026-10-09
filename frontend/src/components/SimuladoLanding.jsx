import { useRef, useState } from "react";
import { gerarSimulado } from "../lib/api";
import { mensagemErroAmigavel } from "../lib/erros";
import { MATERIAS_SIMULADO } from "../lib/materias";

export default function SimuladoLanding({ onStart }) {
  const [modo, setModo] = useState("rapido");
  const [materia, setMateria] = useState(MATERIAS_SIMULADO[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const iniciandoRef = useRef(false);

  async function iniciar() {
    if (iniciandoRef.current) return;

    iniciandoRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const sim = await gerarSimulado({
        modo,
        materia: modo === "materia" ? materia : null,
      });
      onStart(sim);
    } catch (e) {
      setError(mensagemErroAmigavel(e));
      setLoading(false);
    } finally {
      iniciandoRef.current = false;
    }
  }

  if (loading) {
    return (
      <div
        className="max-w-xl mx-auto px-4 pt-20 sm:px-6 md:pt-24 text-center"
        role="status"
        aria-live="polite"
      >
        <h1
          className="font-serif text-2xl text-cream-50 mb-3 leading-tight tracking-tight"
          style={{ fontVariationSettings: '"opsz" 60' }}
        >
          Preparando as questões
        </h1>
        <p className="text-cream-400 text-sm mb-8">
          O mentor está redigindo dez questões inéditas. Isso costuma levar
          10-20 segundos.
        </p>
        <div className="flex justify-center gap-2" aria-hidden="true">
          <span
            className="w-2 h-2 rounded-full bg-brass animate-pulse motion-reduce:animate-none"
            style={{ animationDelay: "0ms" }}
          ></span>
          <span
            className="w-2 h-2 rounded-full bg-brass animate-pulse motion-reduce:animate-none"
            style={{ animationDelay: "200ms" }}
          ></span>
          <span
            className="w-2 h-2 rounded-full bg-brass animate-pulse motion-reduce:animate-none"
            style={{ animationDelay: "400ms" }}
          ></span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[760px] mx-auto px-4 pt-8 pb-10 sm:px-6 md:px-8 md:pt-12 md:pb-14">
      {/* Page header — fora do card, ancora a seção sem virar banner. */}
      <header className="mb-6 md:mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass mb-2.5">
          Simulado
        </p>
        <h1
          className="font-serif text-3xl md:text-4xl text-cream-50 leading-tight tracking-tight"
          style={{ fontVariationSettings: '"opsz" 96' }}
        >
          Como você quer praticar hoje?
        </h1>
        <p className="mt-2 text-sm text-cream-400 leading-relaxed">
          10 questões inéditas · ~15 min · estilo FGV
        </p>
      </header>

      <div className="bg-ink-950 border border-ink-800 rounded-2xl p-5 sm:p-6">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          role="group"
          aria-label="Modo do simulado"
        >
          <ModoCard
            selected={modo === "rapido"}
            onClick={() => setModo("rapido")}
            title="Rápido"
            subtitle="10 questões variadas"
          />
          <ModoCard
            selected={modo === "materia"}
            onClick={() => setModo("materia")}
            title="Focar em matéria"
            subtitle="10 de uma área só"
          />
        </div>

        {modo === "materia" && (
          <div className="mt-6">
            <p
              id="materia-simulado"
              className="text-[11px] tracking-widest uppercase text-cream-400 font-medium mb-3"
            >
              Matéria
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="materia-simulado"
            >
              {MATERIAS_SIMULADO.map((m) => {
                const selected = materia === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMateria(m)}
                    aria-pressed={selected}
                    className={`min-h-10 text-xs px-3 py-2 rounded-full border transition-[background-color,border-color,color] duration-150 ease-out focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass ${
                      selected
                        ? "bg-brass-soft border-brass/25 text-brass font-medium"
                        : "bg-ink-950 border-surface-border-button text-cream-400 hover:bg-surface-button-hover hover:border-surface-border-button-hover hover:text-cream-50"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 border border-alert/30 bg-alert/5 rounded-lg px-4 py-3"
          >
            <p className="text-sm text-alert">{error}</p>
            <button
              type="button"
              onClick={iniciar}
              className="mt-3 inline-flex items-center gap-1.5 min-h-9 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-ink-950 border border-surface-border-button text-cream-50 hover:bg-surface-button-hover hover:border-surface-border-button-hover hover:text-brass transition-[background-color,border-color,color] duration-150 ease-out focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass"
            >
              Tentar novamente
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={iniciar}
          disabled={loading}
          className="mt-6 w-full inline-flex items-center justify-center gap-1.5 min-h-12 px-4 py-3 rounded-lg bg-brass text-ink-950 font-medium shadow-btn-primary hover:bg-brass-hover hover:shadow-btn-primary-hover disabled:bg-ink-800 disabled:text-cream-600 disabled:shadow-none disabled:cursor-not-allowed transition-[background-color,box-shadow,color] duration-150 ease-out focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40"
        >
          Começar simulado
        </button>
      </div>
    </div>
  );
}

function ModoCard({ selected, onClick, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative min-h-[112px] text-left px-4 py-4 rounded-xl border bg-ink-900 transition-[background-color,border-color,box-shadow] duration-200 ease-editorial focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 ${
        selected
          ? "border-brass"
          : "border-surface-border-subtle hover:bg-surface-subcard-hover hover:border-surface-border-hover hover:shadow-subcard-hover"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-3 right-3 h-2 w-2 rounded-full transition-colors duration-150 ease-out ${
          selected ? "bg-brass" : "bg-transparent"
        }`}
      />
      <div
        className="font-serif text-lg text-cream-50 leading-tight"
        style={{ fontVariationSettings: '"opsz" 60' }}
      >
        {title}
      </div>
      <div className="text-xs text-cream-400 mt-1">{subtitle}</div>
    </button>
  );
}
