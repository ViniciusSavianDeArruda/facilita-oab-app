import { useEffect, useRef, useState } from "react";
import { gerarSimulado } from "../lib/api";
import { mensagemErroAmigavel } from "../lib/erros";
import { MATERIAS_SIMULADO } from "../lib/materias";

// Uma geração por vez, mesmo que o usuário saia da tela e volte: evita novas
// chamadas ao Gemini (cota de 30/h) e permite reaproveitar o simulado pronto.
let geracaoPendente = null;

function obterGeracao(params) {
  if (!geracaoPendente) {
    const geracao = gerarSimulado(params);
    geracaoPendente = geracao;
    geracao.catch(() => {
      if (geracaoPendente === geracao) geracaoPendente = null;
    });
  }
  return geracaoPendente;
}

export default function SimuladoLanding({
  onStart,
}) {
  const [modo, setModo] = useState("rapido");
  const [materia, setMateria] = useState(MATERIAS_SIMULADO[0]);
  const [loading, setLoading] = useState(() => geracaoPendente !== null);
  const [error, setError] = useState(null);
  const iniciandoRef = useRef(false);
  const onStartRef = useRef(onStart);
  const montadoRef = useRef(false);
  useEffect(() => {
    onStartRef.current = onStart;
  });

  // Só a instância montada consome o resultado; sair da tela não o descarta.
  function concluir(geracao, sim) {
    if (!montadoRef.current || geracaoPendente !== geracao) return;
    geracaoPendente = null;
    onStartRef.current(sim);
  }

  function falhar(e) {
    if (!montadoRef.current) return;
    setError(mensagemErroAmigavel(e));
    setLoading(false);
  }

  useEffect(() => {
    montadoRef.current = true;
    const geracao = geracaoPendente;
    if (geracao) {
      geracao.then(
        (sim) => concluir(geracao, sim),
        (e) => falhar(e),
      );
    }
    return () => {
      montadoRef.current = false;
    };
  }, []);

  function iniciar() {
    if (iniciandoRef.current || geracaoPendente) return;

    iniciandoRef.current = true;
    setLoading(true);
    setError(null);
    const geracao = obterGeracao({
      modo,
      materia: modo === "materia" ? materia : null,
    });
    geracao
      .then(
        (sim) => concluir(geracao, sim),
        (e) => falhar(e),
      )
      .finally(() => {
        iniciandoRef.current = false;
      });
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

  const resumo =
    modo === "materia"
      ? `10 questões de ${materia} · ~15 min`
      : "10 questões variadas · ~15 min";

  return (
    <div className="w-full max-w-[900px] mx-auto px-4 pt-8 pb-10 sm:px-6 md:px-8 md:pt-12 md:pb-14">
      <header className="mb-8 md:mb-12">
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

      <div>
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          role="group"
          aria-label="Modo do simulado"
        >
          <ModoCard
            selected={modo === "rapido"}
            onClick={() => setModo("rapido")}
            title="Rápido"
            description="Uma amostra variada da prova, como um treino geral."
            detail="10 questões variadas"
          />
          <ModoCard
            selected={modo === "materia"}
            onClick={() => setModo("materia")}
            title="Focar em matéria"
            description="Todas as questões de uma única área, para aprofundar."
            detail="10 de uma área só"
          />
        </div>

        {modo === "materia" && (
          <div className="mt-8">
            <p
              id="materia-simulado"
              className="font-serif text-lg text-cream-50 leading-tight"
              style={{ fontVariationSettings: '"opsz" 60' }}
            >
              Qual matéria?
            </p>
            <p className="mt-1 text-sm text-cream-400">
              Escolha uma — as 10 questões virão dela.
            </p>
            <div
              className="mt-4 flex flex-wrap gap-2"
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
                        ? "bg-surface-subtle border-brass text-brass font-medium"
                        : "bg-ink-950 border-surface-border-button text-cream-400 hover:bg-surface-button-hover hover:border-surface-border-button-hover hover:text-cream-50"
                    }`}
                  >
                    {selected && <span aria-hidden="true">✓ </span>}
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-10 border-t border-border-subtle pt-6 md:mt-12 md:flex md:items-end md:justify-between md:gap-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream-400">
              Seu simulado
            </p>
            <p className="mt-2 font-serif text-lg text-cream-50">
              {resumo}
            </p>
          </div>

          <div className="mt-5 md:mt-0 md:shrink-0">
            <button
              type="button"
              onClick={iniciar}
              disabled={loading}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-lg bg-brass text-ink-950 font-medium shadow-btn-primary hover:bg-brass-hover hover:shadow-btn-primary-hover active:translate-y-px disabled:bg-ink-800 disabled:text-cream-600 disabled:shadow-none disabled:cursor-not-allowed transition-[background-color,box-shadow,color,transform] duration-150 ease-out focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40"
            >
              Começar simulado <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

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
      </div>
    </div>
  );
}

function ModoCard({ selected, onClick, title, description, detail }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative min-h-[138px] text-left px-5 py-5 rounded-xl border bg-ink-900 transition-[background-color,border-color,box-shadow] duration-200 ease-editorial focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 ${
        selected
          ? "border-brass"
          : "border-surface-border-subtle hover:bg-surface-subcard-hover hover:border-surface-border-hover hover:shadow-subcard-hover"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-5 right-5 h-5 w-5 rounded-full border transition-[border-color,background-color] duration-150 ease-out ${
          selected
            ? "border-brass bg-brass"
            : "border-surface-border-button bg-ink-950"
        }`}
      >
        {selected && (
          <span className="absolute inset-1 rounded-full bg-ink-950" />
        )}
      </span>
      <div
        className="pr-8 font-serif text-2xl text-cream-50 leading-tight"
        style={{ fontVariationSettings: '"opsz" 60' }}
      >
        {title}
      </div>
      <p className="mt-2 max-w-[34rem] text-sm leading-relaxed text-cream-400">
        {description}
      </p>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">
        {detail}
      </p>
    </button>
  );
}
