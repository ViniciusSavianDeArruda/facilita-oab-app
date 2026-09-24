import { useEffect, useRef, useState } from "react";
import QuestionCard from "./QuestionCard";

const STORAGE_KEY = "oab-simulado-current";

export default function SimuladoRun({ simulado, onFinish, onExit }) {
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
    <div className="h-full flex flex-col">
      {/* Barra superior fixa */}
      <div className="border-b border-ink-800 px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={sairComConfirmacao}
            className="text-xs text-cream-400 hover:text-cream-50 transition-colors flex items-center gap-1.5"
          >
            <span aria-hidden>←</span> sair
          </button>

          <div className="flex-1 flex justify-center gap-1.5">
            {simulado.questoes.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIdx
                    ? "bg-brass ring-2 ring-brass/30"
                    : answers[i] !== undefined
                      ? "bg-brass-dim"
                      : "bg-ink-800 hover:bg-ink-700"
                }`}
                aria-label={`Questão ${i + 1}`}
              />
            ))}
          </div>

          <div className="text-xs text-cream-400 font-mono tabular-nums w-12 text-right">
            {mm}:{ss}
          </div>
        </div>
      </div>

      {/* Área da questão */}
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <QuestionCard
            questao={questao}
            mode="answering"
            selected={answers[currentIdx]}
            onSelect={selecionar}
            index={currentIdx}
            total={total}
          />
        </div>
      </div>

      {/* Barra inferior */}
      <div className="border-t border-ink-800 bg-ink-950/80 backdrop-blur px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={anterior}
            disabled={currentIdx === 0}
            className="px-4 py-2 rounded-lg text-sm text-cream-400 hover:text-cream-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>

          <div className="text-xs text-cream-400">
            {respondidas} / {total} respondidas
          </div>

          {isLast ? (
            <button
              onClick={finalizar}
              disabled={respondidas < total}
              className="px-5 py-2 rounded-lg text-sm bg-brass hover:bg-brass-hover disabled:bg-ink-800 disabled:text-cream-600 text-ink-950 font-medium transition-colors"
              title={
                respondidas < total ? "Responda todas antes de finalizar" : ""
              }
            >
              Finalizar
            </button>
          ) : (
            <button
              onClick={proxima}
              className="px-5 py-2 rounded-lg text-sm bg-brass hover:bg-brass-hover text-ink-950 font-medium transition-colors"
            >
              Próxima
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
