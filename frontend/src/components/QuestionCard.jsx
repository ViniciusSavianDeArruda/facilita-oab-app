/**
 * QuestionCard — apresentação da questão.
 * Dois modos:
 *   - answering: alternativas clicáveis, sem revelar gabarito
 *   - reviewing: mostra gabarito, resposta dada, explicação
 */

export default function QuestionCard({ questao, mode, selected, onSelect, index, total }) {
  const isReview = mode === 'review'
  const respostaCorreta = questao.correta

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] tracking-widest uppercase text-brass-dim font-medium">
          {questao.materia}
        </span>
        {index !== undefined && total !== undefined && (
          <span className="text-xs text-cream-400">
            {index + 1} de {total}
          </span>
        )}
      </div>

      <div className="font-serif text-lg md:text-xl leading-relaxed text-cream-50 mb-8" style={{ fontVariationSettings: '"opsz" 60' }}>
        {questao.enunciado}
      </div>

      <div className="space-y-2">
        {['A', 'B', 'C', 'D', 'E'].map((letra) => {
          const texto = questao.alternativas[letra]
          const isSelected = selected === letra
          const isCorrect = isReview && letra === respostaCorreta
          const isWrong = isReview && isSelected && !isCorrect

          let cls = 'border-ink-800 bg-ink-900 hover:border-brass-dim'
          if (isSelected && !isReview) cls = 'border-brass bg-brass/10'
          if (isCorrect) cls = 'border-emerald-700/60 bg-emerald-950/40'
          if (isWrong) cls = 'border-alert/60 bg-alert/10'

          return (
            <button
              key={letra}
              disabled={isReview}
              onClick={() => onSelect?.(letra)}
              className={`w-full text-left flex gap-4 items-start px-4 py-3 rounded-xl border transition-colors ${cls} ${isReview ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className={`shrink-0 font-serif text-lg mt-0.5 ${isCorrect ? 'text-emerald-500' : isWrong ? 'text-alert' : isSelected ? 'text-brass' : 'text-brass-dim'}`}>
                {letra}
              </span>
              <span className="text-cream-50 leading-snug">{texto}</span>
            </button>
          )
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
  )
}
