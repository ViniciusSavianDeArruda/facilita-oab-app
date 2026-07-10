import { useState, useEffect } from 'react'
import { loadSettings, subscribeSettings, diasAteProva, saudacao } from '../lib/settings'
import { loadLastChat, loadLastSimulado, subscribeActivity, tempoRelativo } from '../lib/lastActivity'
import { listar as listarCaderno, contarPorStatus, subscribe as subscribeCaderno } from '../lib/caderno'
import { loadPlano, planoDeHoje, subscribeCrono, itemDescricao, planoEstaValido } from '../lib/cronograma'

export default function Inicio({ onGoto, onOpenSettings, onDiscussCadItem }) {
  const [settings, setSettings] = useState(loadSettings())
  const [lastChat, setLastChat] = useState(loadLastChat())
  const [lastSim, setLastSim] = useState(loadLastSimulado())
  const [cadItems, setCadItems] = useState(listarCaderno())
  const [cadCounts, setCadCounts] = useState(contarPorStatus())
  const [plano, setPlano] = useState(loadPlano())

  useEffect(() => {
    const u1 = subscribeSettings(() => setSettings(loadSettings()))
    const u2 = subscribeActivity(() => {
      setLastChat(loadLastChat())
      setLastSim(loadLastSimulado())
    })
    const u3 = subscribeCaderno(() => {
      setCadItems(listarCaderno())
      setCadCounts(contarPorStatus())
    })
    const u4 = subscribeCrono(() => setPlano(loadPlano()))
    return () => { u1(); u2(); u3(); u4() }
  }, [])

  const dias = diasAteProva(settings.dataProva)
  const nome = settings.nome
  const itensAbertos = cadItems.filter((i) => i.status === 'aberto').slice(0, 3)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-md mx-auto px-6 pt-6 pb-8">
        {/* Header interno com wordmark + settings — mobile only, sidebar cobre desktop */}
        <div className="flex items-baseline justify-between mb-8 md:hidden">
          <div>
            <span className="font-serif text-xl text-cream-50" style={{ fontVariationSettings: '"opsz" 144' }}>
              Facilita
            </span>
            <span className="font-serif text-xl text-brass ml-1.5" style={{ fontVariationSettings: '"opsz" 144' }}>
              OAB
            </span>
          </div>
          <button
            onClick={onOpenSettings}
            className="text-cream-400 hover:text-cream-50 transition-colors p-1"
            aria-label="Ajustes"
          >
            <CogIcon />
          </button>
        </div>

        {/* Saudação */}
        <h1 className="font-serif text-3xl md:text-4xl text-cream-50 leading-tight tracking-tight mb-8" style={{ fontVariationSettings: '"opsz" 96' }}>
          {nome ? (
            <>
              {saudacao()},<br />
              <span className="text-brass">{nome}.</span>
            </>
          ) : (
            'Bom estudo hoje.'
          )}
        </h1>

        {/* Countdown */}
        {dias !== null && dias >= 0 && (
          <div className="bg-ink-900 border border-ink-800 rounded-2xl p-5 mb-6">
            <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2">
              Próxima prova
            </div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-serif text-6xl text-brass leading-none" style={{ fontVariationSettings: '"opsz" 144' }}>
                {dias}
              </span>
              <span className="text-sm text-cream-400 leading-tight">
                {dias === 1 ? 'dia' : 'dias'}<br />restante{dias === 1 ? '' : 's'}
              </span>
            </div>
            <div className="text-xs text-cream-400">
              {formatarDataLonga(settings.dataProva)}
            </div>
          </div>
        )}
        {(dias === null || dias < 0) && (
          <button
            onClick={onOpenSettings}
            className="w-full bg-ink-900 border border-ink-800 border-dashed rounded-2xl p-5 mb-6 text-left hover:border-brass-dim transition-colors"
          >
            <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-1">
              Próxima prova
            </div>
            <div className="text-sm text-cream-400">
              {dias === null ? 'Configure a data da prova pra ver a contagem regressiva →' : 'A data configurada já passou. Atualize nos ajustes.'}
            </div>
          </button>
        )}

        {/* Estude hoje (do cronograma) */}
        {plano && planoEstaValido(plano, settings.dataProva) && (() => {
          const diaHoje = planoDeHoje(plano)
          if (!diaHoje) return null
          const pendentes = diaHoje.itens.filter(i => !i.concluido)
          const totalItens = diaHoje.itens.length
          return (
            <button
              onClick={() => onGoto('cronograma')}
              className="w-full text-left bg-ink-900 border border-brass-dim rounded-2xl p-5 mb-6 hover:bg-ink-800/40 transition-colors group"
            >
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <span className="text-[11px] tracking-widest uppercase text-brass font-medium">
                  Estude hoje
                </span>
                <span className="text-xs text-cream-400 tabular-nums">
                  {diaHoje.itens.filter(i => i.concluido).length}/{totalItens}
                </span>
              </div>
              {pendentes.length === 0 ? (
                <p className="text-sm text-cream-400 italic">
                  Tudo concluído hoje. Bom trabalho.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {pendentes.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-cream-50">
                      <span className="w-1 h-1 rounded-full bg-brass mt-2 shrink-0"></span>
                      <span>{itemDescricao(item)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-xs text-brass-dim mt-3 flex items-center gap-1.5 group-hover:text-brass transition-colors">
                Abrir o plano <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </button>
          )
        })()}

        {/* Continuar hoje */}
        <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3">
          Continuar hoje
        </div>

        {/* Card: Caderno */}
        <button
          onClick={() => onGoto('caderno')}
          className="w-full text-left bg-ink-900 border border-ink-800 rounded-2xl p-5 mb-2 hover:border-brass-dim hover:bg-ink-800/40 transition-colors group"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="font-serif text-lg text-cream-50" style={{ fontVariationSettings: '"opsz" 60' }}>
              Revisar no caderno
            </span>
            {cadCounts.aberto > 0 && (
              <span className="bg-brass/15 text-brass text-[11px] font-medium px-2 py-0.5 rounded-full">
                {cadCounts.aberto} aberto{cadCounts.aberto > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {itensAbertos.length > 0 ? (
            <>
              <div className="space-y-1.5">
                {itensAbertos.map((item) => {
                  const preview = (item.origin === 'simulado' ? item.questao.enunciado : item.pergunta).slice(0, 60)
                  return (
                    <div key={item.id} className="flex items-start gap-2 text-sm text-cream-400">
                      <span className="w-1 h-1 rounded-full bg-brass mt-2 shrink-0"></span>
                      <span className="truncate">{preview}…</span>
                    </div>
                  )
                })}
              </div>
              <div className="text-xs text-brass-dim mt-3 flex items-center gap-1.5 group-hover:text-brass transition-colors">
                Ver todos <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-cream-400">
              Nada por revisar ainda. Erros de simulado vêm parar aqui automaticamente.
            </div>
          )}
        </button>

        {/* Card: Simulado (destaque) */}
        <button
          onClick={() => onGoto('simulado-landing')}
          className="w-full text-left rounded-2xl p-5 mb-2 border border-brass-dim hover:border-brass transition-colors group"
          style={{
            background: 'linear-gradient(135deg, rgba(228, 168, 83, 0.08) 0%, transparent 60%)',
          }}
        >
          <div className="font-serif text-lg text-brass mb-2" style={{ fontVariationSettings: '"opsz" 60' }}>
            Fazer um simulado
          </div>
          {lastSim ? (
            <div className="flex gap-4 text-xs text-cream-400 mb-3">
              <span>último: <span className="text-cream-50 font-medium">{lastSim.acertos}/{lastSim.total}</span></span>
              {lastSim.materiaPrincipal && (
                <span>{tempoRelativo(lastSim.updatedAt)}</span>
              )}
            </div>
          ) : (
            <div className="text-xs text-cream-400 mb-3">Primeiro simulado — 10 questões variadas</div>
          )}
          <div className="text-xs text-brass flex items-center gap-1.5 group-hover:gap-2 transition-all">
            10 questões, ~15 min <span>→</span>
          </div>
        </button>

        {/* Card: Última conversa */}
        {lastChat && (
          <button
            onClick={() => onGoto('chat')}
            className="w-full text-left bg-ink-900 border border-ink-800 rounded-2xl p-5 mb-2 hover:border-brass-dim hover:bg-ink-800/40 transition-colors group"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm text-cream-50 font-medium">Última conversa</span>
              <span className="text-[11px] text-cream-600">{tempoRelativo(lastChat.updatedAt)}</span>
            </div>
            <div className="text-sm text-cream-400 italic line-clamp-2">
              &ldquo;{lastChat.pergunta.slice(0, 100)}{lastChat.pergunta.length > 100 ? '…' : ''}&rdquo;
            </div>
            <div className="text-xs text-brass-dim mt-3 flex items-center gap-1.5 group-hover:text-brass transition-colors">
              Voltar pra conversa <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </button>
        )}

        {!lastChat && !lastSim && (
          <button
            onClick={() => onGoto('chat')}
            className="w-full text-left bg-ink-900 border border-ink-800 rounded-2xl p-5 hover:border-brass-dim transition-colors"
          >
            <div className="font-serif text-lg text-cream-50 mb-1" style={{ fontVariationSettings: '"opsz" 60' }}>
              Ou apenas conversar
            </div>
            <div className="text-sm text-cream-400">Pergunte qualquer coisa sobre a 1ª fase →</div>
          </button>
        )}
      </div>
    </div>
  )
}

function formatarDataLonga(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}

function CogIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  )
}
