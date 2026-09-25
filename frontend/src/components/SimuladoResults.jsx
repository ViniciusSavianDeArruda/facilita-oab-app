import { useEffect, useMemo, useRef, useState } from "react";
import { enviarResultadoSimulado } from "../lib/simulados";
import QuestionCard from "./QuestionCard";

export default function SimuladoResults({
  result,
  onRetry,
  onExit,
  onDiscussWithMentor,
}) {
  const { simulado, answers, elapsedSec } = result;
  const [expandedIdx, setExpandedIdx] = useState(null);

  const stats = useMemo(() => {
    const total = simulado.questoes.length;
    let acertos = 0;
    const porMateria = {};

    simulado.questoes.forEach((q, i) => {
      const acertou = answers[i] === q.correta;
      if (acertou) acertos++;
      if (!porMateria[q.materia])
        porMateria[q.materia] = { total: 0, acertos: 0 };
      porMateria[q.materia].total++;
      if (acertou) porMateria[q.materia].acertos++;
    });

    return { total, acertos, porMateria };
  }, [simulado, answers]);

  const percent = Math.round((stats.acertos / stats.total) * 100);
  const eticaStats = stats.porMateria["Ética"];
  const eticaAlerta = eticaStats && eticaStats.acertos / eticaStats.total < 0.5;

  // Envia o resultado pro backend: grava histórico + insere erros no caderno (com dedup).
  // sentRef evita disparo duplicado sob o double-invoke de efeitos do StrictMode em dev
  // (cada POST cria uma linha de histórico nova — não é seguro deixar isso repetir).
  const [savedCount, setSavedCount] = useState(0);
  const sentRef = useRef(false);
  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    let cancelled = false;
    enviarResultadoSimulado({
      simulado,
      answers,
      elapsedSec,
      acertos: stats.acertos,
      total: stats.total,
      porMateria: stats.porMateria,
    })
      .then((saved) => {
        if (!cancelled) setSavedCount(saved.savedCount);
      })
      .catch((e) => console.error("Falha ao salvar resultado do simulado:", e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Placar */}
        <div className="mb-10">
          <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2">
            Resultado
          </div>
          <div className="flex items-baseline gap-4 mb-1">
            <div
              className="font-serif text-6xl text-cream-50 leading-none"
              style={{ fontVariationSettings: '"opsz" 144' }}
            >
              {stats.acertos}
            </div>
            <div
              className="font-serif text-3xl text-cream-400 leading-none"
              style={{ fontVariationSettings: '"opsz" 96' }}
            >
              / {stats.total}
            </div>
            <div className="text-cream-400 text-sm ml-auto">
              {percent}% · {mm}:{ss}
            </div>
          </div>
        </div>

        {/* Alerta de Ética */}
        {eticaAlerta && (
          <div className="mb-6 border border-alert/40 bg-alert/5 rounded-xl p-4">
            <div className="text-[11px] tracking-widest uppercase text-alert font-medium mb-1.5">
              Atenção — Ética
            </div>
            <p className="text-sm text-cream-50 leading-relaxed">
              Você acertou {eticaStats.acertos} de {eticaStats.total} em Ética.
              Ética tem peso alto na aprovação — vale revisar as questões
              erradas e treinar essa matéria antes de outros temas.
            </p>
          </div>
        )}

        {/* Badge caderno */}
        {savedCount > 0 && (
          <p className="text-xs text-brass-dim mb-6">
            {savedCount === 1
              ? "1 questão foi para o seu caderno."
              : `${savedCount} questões foram para o seu caderno.`}
          </p>
        )}

        {/* Breakdown por matéria */}
        {Object.keys(stats.porMateria).length > 1 && (
          <div className="mb-10">
            <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3">
              Desempenho por matéria
            </div>
            <div className="space-y-1">
              {Object.entries(stats.porMateria)
                .sort(
                  (a, b) =>
                    a[1].acertos / a[1].total - b[1].acertos / b[1].total,
                )
                .map(([materia, s]) => {
                  const p = Math.round((s.acertos / s.total) * 100);
                  return (
                    <div
                      key={materia}
                      className="flex items-center gap-3 text-sm py-1.5"
                    >
                      <span className="w-40 text-cream-50">{materia}</span>
                      <div className="flex-1 h-1 bg-ink-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brass transition-all"
                          style={{ width: `${p}%` }}
                        />
                      </div>
                      <span className="w-14 text-right text-cream-400 tabular-nums">
                        {s.acertos}/{s.total}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Questões */}
        <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3">
          Revisão
        </div>
        <div className="space-y-2 mb-10">
          {simulado.questoes.map((q, i) => {
            const acertou = answers[i] === q.correta;
            const isExpanded = expandedIdx === i;
            return (
              <div
                key={i}
                className={`border rounded-xl transition-colors ${
                  acertou ? "border-ink-800" : "border-alert/30"
                }`}
              >
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-ink-900/50 transition-colors rounded-xl"
                >
                  <span
                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      acertou
                        ? "bg-emerald-950/60 text-emerald-500 border border-emerald-700/60"
                        : "bg-alert/10 text-alert border border-alert/40"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-cream-50 truncate">
                    {q.enunciado.slice(0, 80)}
                    {q.enunciado.length > 80 && "…"}
                  </span>
                  <span className="text-[10px] text-cream-400 tracking-wider uppercase shrink-0">
                    {q.materia}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-ink-800 p-6">
                    <QuestionCard
                      questao={q}
                      mode="review"
                      selected={answers[i]}
                    />
                    {!acertou && (
                      <button
                        onClick={() => onDiscussWithMentor(q, answers[i])}
                        className="mt-6 w-full text-sm px-4 py-2.5 rounded-lg border border-brass-dim text-brass hover:bg-brass/10 transition-colors"
                      >
                        Discutir esta questão com o mentor →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 bg-brass hover:bg-brass-hover text-ink-950 font-medium py-3 rounded-xl transition-colors"
          >
            Outro simulado
          </button>
          <button
            onClick={onExit}
            className="px-6 py-3 rounded-xl border border-ink-800 text-cream-400 hover:text-cream-50 hover:border-brass-dim transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    </div>
  );
}
