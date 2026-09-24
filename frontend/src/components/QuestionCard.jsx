/**
 * QuestionCard — apresentação da questão.
 * Dois modos:
 *   - answering: alternativas clicáveis, sem revelar gabarito
 *   - reviewing: mostra gabarito, resposta dada, explicação
 */

export default function QuestionCard({
  questao,
  mode,
  selected,
  onSelect,
  index,
  total,
}) {
  const isReview = mode === "review";
	const isAnswering = mode === "answering";
  const respostaCorreta = questao.correta;
	const QuestionText = isAnswering ? "h1" : "div";

  return (
    <div>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${isAnswering ? "mb-5" : "justify-between mb-4"}`}>
        <span className={`text-[11px] tracking-widest uppercase font-medium ${isAnswering ? "text-action-muted" : "text-brass-dim"}`}>
          {questao.materia}
        </span>
        {index !== undefined && total !== undefined && (
          <span className={`text-xs ${isAnswering ? "text-text-muted" : "text-cream-400"}`}>
            {isAnswering ? "Questão " : ""}{index + 1} de {total}
          </span>
        )}
      </div>

      <QuestionText
        className={isAnswering
          ? "font-serif text-xl sm:text-2xl md:text-[1.7rem] leading-relaxed text-text-primary break-words"
          : "font-serif text-lg md:text-xl leading-relaxed text-cream-50 mb-8"}
        style={{ fontVariationSettings: '"opsz" 60' }}
      >
        {questao.enunciado}
      </QuestionText>

      <div className={isAnswering ? "mt-8 sm:mt-10 space-y-3" : "space-y-2"} role={isAnswering ? "radiogroup" : undefined} aria-label={isAnswering ? "Alternativas da questão" : undefined}>
        {["A", "B", "C", "D"].map((letra) => {
          const texto = questao.alternativas[letra];
          const isSelected = selected === letra;
          const isCorrect = isReview && letra === respostaCorreta;
          const isWrong = isReview && isSelected && !isCorrect;

          let cls = isAnswering
            ? "border-border-default bg-surface-raised hover:border-brass-dim hover:bg-surface-subtle"
            : "border-ink-800 bg-ink-900 hover:border-brass-dim";
          if (isSelected && !isReview) cls = isAnswering ? "border-action-primary bg-brass/10" : "border-brass bg-brass/10";
          if (isCorrect) cls = "border-emerald-600/60 bg-emerald-500/10";
          if (isWrong) cls = "border-alert/60 bg-alert/10";

          return (
            <button
              key={letra}
              disabled={isReview}
				role={isAnswering ? "radio" : undefined}
				aria-checked={isAnswering ? isSelected : undefined}
              onClick={() => onSelect?.(letra)}
              className={isAnswering
                ? `w-full min-h-[76px] text-left flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${cls}`
                : `w-full text-left flex gap-4 items-start px-4 py-3 rounded-xl border transition-colors ${cls} ${isReview ? "cursor-default" : "cursor-pointer"}`}
            >
              <span
                aria-hidden={isAnswering ? "true" : undefined}
                className={isAnswering
                  ? `mt-0.5 shrink-0 w-7 h-7 rounded-full border flex items-center justify-center font-serif text-sm ${isSelected ? "border-action-primary bg-action-primary text-ink-950" : "border-border-subtle text-action-muted"}`
                  : `shrink-0 font-serif text-lg mt-0.5 ${isCorrect ? "text-emerald-500" : isWrong ? "text-alert" : isSelected ? "text-brass" : "text-brass-dim"}`}
              >
                {isAnswering && isSelected ? "✓" : letra}
              </span>
              <span className={isAnswering ? "min-w-0 flex-1 text-sm sm:text-[15px] leading-relaxed text-text-primary break-words" : "text-cream-50 leading-snug"}>
                {isAnswering && <span className="sr-only">Alternativa {letra}. </span>}
                {texto}
              </span>
              {isAnswering && isSelected && (
                <span className="shrink-0 hidden sm:inline text-[10px] tracking-widest uppercase font-medium text-action-primary">
                  Selecionada
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isReview && (
        <div className="mt-6 pl-4 border-l-2 border-brass-dim">
          <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2">
            Fundamento
          </div>
          <p className="text-sm text-cream-50 leading-relaxed mb-3">
            <span className="text-brass">{questao.fundamento_legal}</span>
          </p>
          <p className="text-sm text-cream-50 leading-relaxed">
            {questao.explicacao}
          </p>
        </div>
      )}
    </div>
  );
}
