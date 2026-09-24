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
          className="font-serif text-2xl text-cream-50 mb-3"
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
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-10 sm:px-6 md:px-8 md:pt-12 md:pb-14">
      <div className="bg-surface-raised border border-ink-800 rounded-3xl shadow-[0_10px_35px_rgba(42,36,34,0.04)] p-5 sm:p-8 md:p-10">
        <div className="max-w-xl mx-auto">
          <h1
            className="font-serif text-3xl md:text-4xl text-cream-50 leading-tight tracking-tight mb-4"
            style={{ fontVariationSettings: '"opsz" 96' }}
          >
            Dez questões, cerca de quinze minutos.
          </h1>
          <p className="text-cream-400 leading-relaxed mb-10 max-w-lg">
            Cada simulado tem dez questões inéditas geradas no estilo FGV. Ao final,
            você vê o gabarito, a explicação e pode conversar com o mentor sobre
            qualquer erro.
          </p>

          <div id="modo-simulado" className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3">
            Modo
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8" role="group" aria-labelledby="modo-simulado">
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
            <>
              <div id="materia-simulado" className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3">
                Matéria
              </div>
              <div className="flex flex-wrap gap-2.5 mb-8" role="group" aria-labelledby="materia-simulado">
                {MATERIAS_SIMULADO.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMateria(m)}
                    aria-pressed={materia === m}
                    className={`min-h-10 text-xs px-3 py-2 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 ${
                      materia === m
                        ? "border-brass bg-brass text-ink-950 font-medium"
                        : "border-ink-800 text-cream-400 hover:border-brass-dim hover:text-cream-50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}

          {error && (
            <div role="alert" className="text-sm text-alert border border-alert/30 bg-alert/5 rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={iniciar}
            disabled={loading}
            className="w-full min-h-12 bg-brass hover:bg-brass-hover disabled:bg-ink-800 disabled:text-cream-600 disabled:cursor-not-allowed text-ink-950 font-medium py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
          >
            Começar simulado
          </button>
        </div>
      </div>
    </div>
  );
}

function ModoCard({ selected, onClick, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-[120px] text-left px-4 py-4 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 ${
        selected
          ? "border-brass bg-brass/10 shadow-[0_6px_16px_rgba(139,30,63,0.08)]"
          : "border-ink-800 bg-ink-900 hover:border-brass-dim hover:bg-ink-800/60"
      }`}
    >
      <div
        className={`font-serif text-lg ${selected ? "text-brass" : "text-cream-50"}`}
        style={{ fontVariationSettings: '"opsz" 60' }}
      >
        {title}
      </div>
      <div className="text-xs text-cream-400 mt-0.5">{subtitle}</div>
      {selected && (
        <span className="inline-block mt-3 text-[10px] tracking-widest uppercase text-brass font-medium">
          Selecionado
        </span>
      )}
    </button>
  );
}
