import { useEffect, useRef, useState } from "react";
import QuestionCard from "./QuestionCard";

const STORAGE_KEY = "oab-simulado-current";

export default function SimuladoRun({ simulado, onFinish, onExit }) {
	const contentRef = useRef(null);
  // Restaura estado do localStorage se for o mesmo simulado
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && saved.id === simulado.id) return saved.answers;
    } catch {}
    return {};
  });
  const [currentIdx, setCurrentIdx] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && saved.id === simulado.id) return saved.currentIdx;
    } catch {}
    return 0;
  });
  const startedAtRef = useRef(null);
  if (startedAtRef.current === null) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (
        saved &&
        saved.id === simulado.id &&
        Number.isFinite(saved.startedAt)
      ) {
        startedAtRef.current = saved.startedAt;
      }
    } catch {}
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
  }
  const startedAt = startedAtRef.current;

  const [elapsedSec, setElapsedSec] = useState(() =>
    Math.floor((Date.now() - startedAt) / 1000),
  );

  // Timer
  useEffect(() => {
    const iv = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentIdx]);

  // Persistir estado
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: simulado.id,
        answers,
        currentIdx,
        startedAt,
      }),
    );
  }, [answers, currentIdx, startedAt, simulado.id]);

  const total = simulado.questoes.length;
  const questao = simulado.questoes[currentIdx];
  const respondidas = Object.keys(answers).length;
  const isLast = currentIdx === total - 1;

  function selecionar(letra) {
    setAnswers({ ...answers, [currentIdx]: letra });
  }

  function proxima() {
    if (isLast) {
      finalizar();
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  }

  function anterior() {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  }

  function finalizar() {
    localStorage.removeItem(STORAGE_KEY);
    onFinish({ simulado, answers, elapsedSec });
  }

  function sairComConfirmacao() {
    if (
      respondidas === 0 ||
      confirm(
        "Sair do simulado? Esta tentativa será abandonada.",
      )
    ) {
      onExit();
    }
  }

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div className="h-full min-h-0 flex flex-col bg-surface-page">
      <header className="shrink-0 border-b border-border-default bg-surface-raised">
        <div className="max-w-3xl mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <button
			type="button"
            onClick={sairComConfirmacao}
            className="min-h-11 inline-flex items-center gap-2 px-2 -ml-2 rounded-lg text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
          >
			<span aria-hidden="true" className="text-base leading-none">←</span>
			Sair
          </button>

          <div className="order-3 w-full grid grid-cols-10 gap-1.5 sm:order-none sm:w-auto sm:flex-1 sm:max-w-md" aria-label="Navegação entre questões">
            {simulado.questoes.map((_, i) => (
              <button
                key={i}
				type="button"
                onClick={() => setCurrentIdx(i)}
                aria-current={i === currentIdx ? "step" : undefined}
                aria-label={`Questão ${i + 1}${i === currentIdx ? ", atual" : ""}${answers[i] !== undefined ? ", respondida" : ", pendente"}`}
                className={`min-h-9 rounded-lg border text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised ${
                  i === currentIdx
                    ? "border-action-primary bg-action-primary text-ink-950"
                    : answers[i] !== undefined
                      ? "border-brass-dim bg-brass/10 text-action-primary"
                      : "border-border-default bg-surface-subtle text-text-muted hover:border-brass-dim hover:text-text-primary"
                }`}
              >
                {answers[i] !== undefined && i !== currentIdx ? "✓" : i + 1}
              </button>
            ))}
          </div>

          <div className="min-h-11 inline-flex items-center rounded-lg bg-surface-subtle border border-border-default px-3 font-mono text-sm tabular-nums text-text-secondary" aria-label={`Tempo decorrido: ${mm} minutos e ${ss} segundos`}>
            {mm}:{ss}
          </div>
        </div>
          <p className="mt-2 text-[11px] text-text-muted sm:hidden">
            ✓ indica questão respondida; o destaque indica a questão atual.
          </p>
        </div>
      </header>

      <main ref={contentRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-8 sm:px-6 sm:py-10 md:py-12">
        <div className="max-w-3xl mx-auto">
          <QuestionCard
            questao={questao}
            mode="answering"
            selected={answers[currentIdx]}
            onSelect={selecionar}
            index={currentIdx}
            total={total}
          />
        </div>
      </main>

      <footer className="shrink-0 border-t border-border-default bg-surface-raised/95 backdrop-blur px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-3xl mx-auto grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
          <button
			type="button"
            onClick={anterior}
            disabled={currentIdx === 0}
            className="min-h-11 justify-self-start inline-flex items-center rounded-xl px-3 sm:px-4 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
          >
            Anterior
          </button>

          <p className="text-center text-xs text-text-muted whitespace-nowrap" aria-live="polite">
            {respondidas} de {total}
          </p>

          {isLast ? (
            <button
				type="button"
              onClick={finalizar}
              disabled={respondidas < total}
              className="min-h-11 justify-self-end inline-flex items-center rounded-xl bg-action-primary hover:bg-action-hover disabled:bg-ink-800 disabled:text-text-muted disabled:cursor-not-allowed px-3 sm:px-5 text-sm font-medium text-ink-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
              title={
                respondidas < total ? "Responda todas antes de finalizar" : ""
              }
            >
              Finalizar
            </button>
          ) : (
            <button
				type="button"
              onClick={proxima}
              className="min-h-11 justify-self-end inline-flex items-center rounded-xl bg-action-primary hover:bg-action-hover px-3 sm:px-5 text-sm font-medium text-ink-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
            >
              Próxima
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
