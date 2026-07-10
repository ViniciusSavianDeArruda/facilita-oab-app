import { useState } from 'react'
import { loadConfig, saveConfig, MATERIAS_CRONO, gerarPlano, savePlano, limparPlano } from '../lib/cronograma'
import { loadSettings } from '../lib/settings'

export default function CronogramaConfig({ onBack, onPlanGerado }) {
  const initial = loadConfig()
  const [horasPorDia, setHorasPorDia] = useState(initial.horasPorDia)
  const [fracas, setFracas] = useState(new Set(initial.materiasFracas || []))
  const [error, setError] = useState(null)

  const settings = loadSettings()

  function toggleFraca(m) {
    const next = new Set(fracas)
    if (next.has(m)) next.delete(m)
    else next.add(m)
    setFracas(next)
  }

  function gerar() {
    if (!settings.dataProva) {
      setError('Configure a data da prova nos Ajustes antes.')
      return
    }
    const config = {
      horasPorDia,
      materiasFracas: Array.from(fracas),
    }
    saveConfig(config)
    const plano = gerarPlano(settings.dataProva, config)
    if (!plano) {
      setError('Não foi possível gerar o plano. Verifique se a data da prova está no futuro.')
      return
    }
    savePlano(plano)
    onPlanGerado()
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-md mx-auto px-6 py-8">
        <button
          onClick={onBack}
          className="text-xs text-cream-400 hover:text-cream-50 transition-colors mb-8 flex items-center gap-1.5"
        >
          <span aria-hidden>←</span> voltar
        </button>

        <h2 className="font-serif text-3xl text-cream-50 leading-tight tracking-tight mb-2" style={{ fontVariationSettings: '"opsz" 96' }}>
          Como você estuda?
        </h2>
        <p className="text-cream-400 text-sm mb-10">
          Duas informações e o plano se molda ao seu ritmo. Você pode regenerar quando quiser.
        </p>

        {/* Horas por dia */}
        <div className="mb-8">
          <label className="text-[11px] tracking-widest uppercase text-brass-dim font-medium block mb-3">
            Horas por dia
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.5"
              max="6"
              step="0.5"
              value={horasPorDia}
              onChange={(e) => setHorasPorDia(parseFloat(e.target.value))}
              className="flex-1 accent-brass"
            />
            <div className="w-16 text-right">
              <span className="font-serif text-2xl text-brass" style={{ fontVariationSettings: '"opsz" 60' }}>
                {horasPorDia}h
              </span>
            </div>
          </div>
          <p className="text-xs text-cream-600 mt-2">
            Média realista, não o ideal. Vale mais consistência que quantidade.
          </p>
        </div>

        {/* Matérias fracas */}
        <div className="mb-10">
          <label className="text-[11px] tracking-widest uppercase text-brass-dim font-medium block mb-2">
            Matérias em que você está mais fraca
          </label>
          <p className="text-xs text-cream-600 mb-4">
            Selecione as que precisam de mais atenção — receberão o dobro de dias no plano.
          </p>
          <div className="flex flex-wrap gap-2">
            {MATERIAS_CRONO.map((m) => (
              <button
                key={m}
                onClick={() => toggleFraca(m)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  fracas.has(m)
                    ? 'border-brass bg-brass/10 text-brass'
                    : 'border-ink-800 text-cream-400 hover:border-brass-dim hover:text-cream-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {fracas.size > 0 && (
            <p className="text-xs text-cream-400 mt-3">
              {fracas.size} matéria{fracas.size > 1 ? 's' : ''} priorizada{fracas.size > 1 ? 's' : ''}.
            </p>
          )}
        </div>

        {error && (
          <div className="text-sm text-alert border border-alert/30 bg-alert/5 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={gerar}
          className="w-full bg-brass hover:bg-brass-hover text-ink-950 font-medium py-3 rounded-xl transition-colors"
        >
          Gerar plano
        </button>

        {loadConfig().atualizadoEm && (
          <button
            onClick={() => {
              if (confirm('Apagar o plano atual? Você poderá gerar outro depois.')) {
                limparPlano()
                onBack()
              }
            }}
            className="w-full mt-3 text-xs text-cream-600 hover:text-alert transition-colors py-2"
          >
            Apagar plano atual
          </button>
        )}
      </div>
    </div>
  )
}
