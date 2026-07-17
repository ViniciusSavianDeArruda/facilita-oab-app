import { useState } from "react";
import { gerarSimulado } from "../lib/api";
import { mensagemErroAmigavel } from "../lib/erros";
import { MATERIAS_SIMULADO } from "../lib/materias";

export default function SimuladoLanding({ onStart }) {
  const [modo, setModo] = useState("rapido");
  const [materia, setMateria] = useState(MATERIAS_SIMULADO[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function iniciar() {
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
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto pt-24 px-6 text-center">
        <div
          className="font-serif text-2xl text-cream-50 mb-3"
          style={{ fontVariationSettings: '"opsz" 60' }}
        >
          Preparando as questões
        </div>
        <p className="text-cream-400 text-sm mb-8">
          O mentor está redigindo dez questões inéditas. Isso costuma levar
          10-20 segundos.
        </p>
        <div className="flex justify-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-brass animate-pulse"
            style={{ animationDelay: "0ms" }}
          ></span>
          <span
            className="w-2 h-2 rounded-full bg-brass animate-pulse"
            style={{ animationDelay: "200ms" }}
          ></span>
          <span
            className="w-2 h-2 rounded-full bg-brass animate-pulse"
            style={{ animationDelay: "400ms" }}
          ></span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pt-16 px-6">
      <h2
        className="font-serif text-3xl md:text-4xl text-cream-50 leading-tight tracking-tight mb-3"
        style={{ fontVariationSettings: '"opsz" 96' }}
      >
        Dez questões, quinze minutos.
      </h2>
      <p className="text-cream-400 leading-relaxed mb-10">
        Cada simulado tem dez questões inéditas geradas no estilo FGV. Ao final,
        você vê o gabarito, a explicação e pode conversar com o mentor sobre
        qualquer erro.
      </p>

      <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3">
        Modo
      </div>
      <div className="grid grid-cols-2 gap-2 mb-8">
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
          <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3">
            Matéria
          </div>
          <div className="flex flex-wrap gap-2 mb-8">
            {MATERIAS_SIMULADO.map((m) => (
              <button
                key={m}
                onClick={() => setMateria(m)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  materia === m
                    ? "border-brass bg-brass/10 text-brass"
                    : "border-ink-800 text-cream-50 hover:border-brass-dim"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <div className="text-sm text-alert border border-alert/30 bg-alert/5 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <button
        onClick={iniciar}
        className="w-full bg-brass hover:bg-brass-hover text-ink-950 font-medium py-3 rounded-xl transition-colors"
      >
        Começar simulado
      </button>
    </div>
  );
}

function ModoCard({ selected, onClick, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-4 py-3 rounded-xl border transition-colors ${
        selected
          ? "border-brass bg-brass/10"
          : "border-ink-800 bg-ink-900 hover:border-brass-dim"
      }`}
    >
      <div
        className={`font-serif text-lg ${selected ? "text-brass" : "text-cream-50"}`}
        style={{ fontVariationSettings: '"opsz" 60' }}
      >
        {title}
      </div>
      <div className="text-xs text-cream-400 mt-0.5">{subtitle}</div>
    </button>
  );
}
