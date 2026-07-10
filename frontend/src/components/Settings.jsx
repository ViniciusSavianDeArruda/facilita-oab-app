import { useState } from 'react'
import { loadSettings, saveSettings } from '../lib/settings'

export default function Settings({ onBack }) {
  const initial = loadSettings()
  const [nome, setNome] = useState(initial.nome)
  const [dataProva, setDataProva] = useState(initial.dataProva || '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    saveSettings({ nome: nome.trim(), dataProva: dataProva || null })
    setSaved(true)
    setTimeout(() => onBack(), 500)
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
          Ajustes
        </h2>
        <p className="text-cream-400 text-sm mb-10">
          O que aparece no seu Início.
        </p>

        <div className="space-y-6">
          <div>
            <label className="text-[11px] tracking-widest uppercase text-brass-dim font-medium block mb-2">
              Seu nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como quer que eu te chame?"
              className="w-full bg-ink-900 border border-ink-800 rounded-xl px-4 py-3 text-cream-50 placeholder:text-cream-600 focus:border-brass-dim focus:outline-none"
            />
            <p className="text-xs text-cream-600 mt-2">
              Aparece na saudação do Início.
            </p>
          </div>

          <div>
            <label className="text-[11px] tracking-widest uppercase text-brass-dim font-medium block mb-2">
              Data da prova
            </label>
            <input
              type="date"
              value={dataProva}
              onChange={(e) => setDataProva(e.target.value)}
              className="w-full bg-ink-900 border border-ink-800 rounded-xl px-4 py-3 text-cream-50 placeholder:text-cream-600 focus:border-brass-dim focus:outline-none"
              style={{ colorScheme: 'dark' }}
            />
            <p className="text-xs text-cream-600 mt-2">
              Usada pra contagem regressiva no Início.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saved}
          className="w-full mt-10 bg-brass hover:bg-brass-hover disabled:bg-brass-dim text-ink-950 font-medium py-3 rounded-xl transition-colors"
        >
          {saved ? 'Salvo ✓' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
