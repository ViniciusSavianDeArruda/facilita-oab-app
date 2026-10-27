import { useEffect, useMemo, useState } from "react";
import {
  getResultSaveState,
  retrySaveResult,
  saveResultOnce,
} from "../lib/simulados";
import QuestionCard from "./QuestionCard";

export default function SimuladoResults({ result, onRetry, onExit, onDiscussWithMentor }) {
  const { simulado, answers, elapsedSec } = result;
  const [expandedIdx, setExpandedIdx] = useState(null);
  const stats = useMemo(() => {
    const total = simulado.questoes.length;
    let acertos = 0;
    const porMateria = {};
    simulado.questoes.forEach((q, i) => {
      const acertou = answers[i] === q.correta;
      if (acertou) acertos++;
      if (!porMateria[q.materia]) porMateria[q.materia] = { total: 0, acertos: 0 };
      porMateria[q.materia].total++;
      if (acertou) porMateria[q.materia].acertos++;
    });
    return { total, acertos, porMateria };
  }, [simulado, answers]);
  const percent = Math.round((stats.acertos / stats.total) * 100);
  const eticaStats = stats.porMateria["Ética"];
  const eticaAlerta = eticaStats && eticaStats.acertos / eticaStats.total < 0.5;
  const [saveState, setSaveState] = useState(() =>
    getResultSaveState(simulado.id) ?? { status: "saving", savedCount: 0 },
  );
  const payload = { simulado, answers, elapsedSec, acertos: stats.acertos, total: stats.total, porMateria: stats.porMateria };
  useEffect(() => {
    let cancelled = false;
    saveResultOnce({ simulado, answers, elapsedSec, acertos: stats.acertos, total: stats.total, porMateria: stats.porMateria })
      .then((state) => { if (!cancelled) setSaveState(state); });
    return () => { cancelled = true; };
  }, [simulado, answers, elapsedSec, stats]);
  const tentarSalvarDeNovo = () => {
    const tentativa = retrySaveResult(payload);
    if (!tentativa) return;
    setSaveState({ status: "saving", savedCount: 0 });
    tentativa.then(setSaveState);
  };
  const savedCount = saveState.status === "saved" ? saveState.savedCount : 0;
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 md:px-8">
        <div className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)] md:gap-12">
          <section>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-widest text-brass-dim">Resultado do simulado</div>
            <div className="flex items-baseline gap-4">
              <div className="font-serif text-6xl leading-none text-text-primary" style={{ fontVariationSettings: '"opsz" 144' }}>{stats.acertos}</div>
              <div className="font-serif text-3xl leading-none text-text-secondary" style={{ fontVariationSettings: '"opsz" 96' }}>/ {stats.total}</div>
            </div>
            <p className="mt-2 text-sm text-text-secondary">questões certas no simulado {simulado.modo === "materia" ? "focado" : "rápido"}</p>
            <div className="mt-6 grid grid-cols-2 border-y border-border-subtle">
              <div className="py-3 pr-4"><div className="text-[11px] text-text-secondary">Aproveitamento</div><div className="mt-1 font-serif text-2xl text-text-primary">{percent}%</div></div>
              <div className="border-l border-border-subtle py-3 pl-4"><div className="text-[11px] text-text-secondary">Tempo</div><div className="mt-1 font-serif text-2xl text-text-primary">{mm}:{ss}</div></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1.5"><span className="text-feedback-success-text" aria-hidden="true">✓</span>{stats.acertos} corretas</span>
              <span className="inline-flex items-center gap-1.5"><span className="text-alert" aria-hidden="true">×</span>{stats.total - stats.acertos} incorretas</span>
            </div>
            <p role={saveState.status === "unconfirmed" ? "alert" : "status"} className={`mt-5 text-sm leading-relaxed ${saveState.status === "saved" ? "text-feedback-success-text" : saveState.status === "unconfirmed" ? "text-alert" : "text-text-secondary"}`}>
              {saveState.status === "saved" ? "Resultado salvo." : saveState.status === "unconfirmed" ? "Não foi possível confirmar o salvamento. O resultado pode ter sido registrado; confira o histórico antes de iniciar outra prova." : "Salvando resultado…"}
            </p>
            {saveState.status === "unconfirmed" && <button type="button" onClick={tentarSalvarDeNovo} className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-surface-border-button bg-surface-raised px-3.5 py-2 text-[13px] font-medium text-text-primary transition-[background-color,border-color,color] duration-150 ease-out hover:border-surface-border-button-hover hover:bg-surface-button-hover hover:text-brass focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass">Tentar salvar novamente</button>}
            {eticaAlerta && <div className="mt-5 rounded-xl border border-alert/40 bg-alert/5 p-4"><div className="mb-1.5 text-[11px] font-medium uppercase tracking-widest text-alert">Atenção — Ética</div><p className="text-sm leading-relaxed text-text-primary">Você acertou {eticaStats.acertos} de {eticaStats.total} em Ética. Ética tem peso alto na aprovação — vale revisar as questões erradas e treinar essa matéria antes de outros temas.</p></div>}
            {savedCount > 0 && <p className="mt-4 text-xs text-brass-dim">{savedCount === 1 ? "1 questão foi para o seu caderno." : `${savedCount} questões foram para o seu caderno.`}</p>}
          </section>
          {Object.keys(stats.porMateria).length > 1 && <section>
            <div className="font-serif text-xl text-text-primary">Desempenho por matéria</div>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">Cada matéria teve uma questão neste simulado. Use como sinal do que revisar, não como medida de domínio.</p>
            <div className="mt-4 grid grid-cols-1 gap-x-8 md:grid-cols-2">
              {Object.entries(stats.porMateria).sort((a, b) => a[1].acertos / a[1].total - b[1].acertos / b[1].total).map(([materia, s]) => <div key={materia} className="flex items-center gap-2 border-t border-border-subtle py-2 text-xs"><span className={s.acertos === s.total ? "text-feedback-success-text" : "text-alert"} aria-hidden="true">{s.acertos === s.total ? "✓" : "×"}</span><span className="min-w-0 flex-1 text-text-primary">{materia}</span><span className="tabular-nums text-text-secondary">{s.acertos}/{s.total}</span></div>)}
            </div>
          </section>}
        </div>
        <div className="mb-4 mt-10 flex flex-wrap items-end justify-between gap-3 md:mt-14"><span className="font-serif text-xl text-text-primary">Revisão das questões</span><span className="text-xs text-text-secondary">Abra uma questão para ver alternativas, gabarito e explicação.</span></div>
        <div className="mb-10 overflow-hidden rounded-xl border border-border-default">
          {simulado.questoes.map((q, i) => {
            const acertou = answers[i] === q.correta;
            const isExpanded = expandedIdx === i;
            return <div key={i} className="border-b border-border-default last:border-b-0">
              <button onClick={() => setExpandedIdx(isExpanded ? null : i)} className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-sand-100">
                <span className="w-7 shrink-0 font-serif text-lg text-text-primary">{String(i + 1).padStart(2, "0")}</span>
                <span className={`shrink-0 text-[10px] font-medium uppercase tracking-widest ${acertou ? "text-feedback-success-text" : "text-alert"}`}>{acertou ? "✓ Correta" : "× Incorreta"}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{q.enunciado.slice(0, 80)}{q.enunciado.length > 80 && "…"}</span>
                <span className="hidden shrink-0 text-[10px] uppercase tracking-wider text-text-secondary sm:inline">{q.materia}</span>
                <span className="shrink-0 text-[10px] text-brass">{isExpanded ? "Fechar ↑" : "Ver revisão ↓"}</span>
              </button>
              {isExpanded && <div className="border-t border-border-default px-4 py-6 sm:px-8"><div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_180px]"><QuestionCard questao={q} mode="review" selected={answers[i]} /><aside className="border-t border-border-subtle pt-4 text-xs md:border-l md:border-t-0 md:pl-5 md:pt-0"><div className="text-text-secondary">Sua resposta</div><div className={answers[i] === q.correta ? "mt-1 font-medium text-feedback-success-text" : "mt-1 font-medium text-alert"}>{answers[i] || "Não respondida"} {answers[i] === q.correta ? "· correta" : "· incorreta"}</div><div className="mt-4 border-t border-border-subtle pt-3 text-text-secondary">Gabarito</div><div className="mt-1 font-medium text-feedback-success-text">{q.correta} · correta</div>{!acertou && <button onClick={() => onDiscussWithMentor(q, answers[i])} className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-brass-dim px-3.5 py-2 text-xs text-brass transition-[background-color,border-color] duration-150 hover:bg-surface-subtle">Discutir com o Mentor</button>}</aside></div></div>}
            </div>;
          })}
        </div>
        <div className="flex justify-end gap-3 border-t border-border-subtle pt-6"><button onClick={onExit} className="order-1 rounded-lg border border-border-default px-5 py-3 text-text-secondary transition-colors hover:bg-sand-100 hover:text-text-primary">Voltar ao início</button><button onClick={onRetry} className="order-2 rounded-lg bg-brass px-5 py-3 font-medium text-ink-950 transition-colors hover:bg-brass-hover">Outro simulado</button></div>
      </div>
    </div>
  );
}
