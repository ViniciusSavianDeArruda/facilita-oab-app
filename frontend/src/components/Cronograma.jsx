import { useState, useEffect } from 'react'
import {
  loadPlano, planoDeHoje, proximos7Dias, marcarItemConcluido,
  itemDescricao, nomeDiaSemana, subscribeCrono, recompactarPlano,
  planoEstaValido, gerarPlano, savePlano, loadConfig, tipoLabel,
} from '../lib/cronograma'
import { loadSettings } from '../lib/settings'

export default function Cronograma({ onOpenConfig, onGoto }) {
  const [plano, setPlano] = useState(loadPlano())
  const [expandedData, setExpandedData] = useState(null)

  useEffect(() => {
    // Recompacta ao entrar (se ela pulou dias)
    recompactarPlano()
    setPlano(loadPlano())
    const unsub = subscribeCrono(() => setPlano(loadPlano()))
    return unsub
  }, [])

  // Se plano é inválido (data mudou), oferecer regeração
  const settings = loadSettings()
  const planoValido = plano ? planoEstaValido(plano, settings.dataProva) : false

  if (!plano || !planoValido) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-md mx-auto px-6 pt-16 pb-8">
          <h2 className="font-serif text-3xl text-cream-50 leading-tight tracking-tight mb-3" style={{ fontVariationSettings: '"opsz" 96' }}>
            {plano && !planoValido ? 'Seu plano ficou desatualizado.' : 'Seu plano está vazio.'}
          </h2>
          <p className="text-cream-400 text-sm mb-8 leading-relaxed">
            {plano && !planoValido
              ? 'A data da prova mudou desde que ele foi gerado. Você pode regenerar mantendo suas configurações.'
              : 'Gera um plano automático baseado na data da prova, suas horas por dia disponíveis e nas matérias em que você tá mais fraca.'}
          </p>

          {!settings.dataProva && (
            <div className="text-sm text-alert border border-alert/30 bg-alert/5 rounded-xl px-4 py-3 mb-4">
              Primeiro configure a data da prova nos Ajustes.
            </div>
          )}

          <button
            onClick={onOpenConfig}
            disabled={!settings.dataProva}
            className="w-full bg-brass hover:bg-brass-hover disabled:bg-ink-800 disabled:text-cream-600 text-ink-950 font-medium py-3 rounded-xl transition-colors"
          >
            {plano && !planoValido ? 'Regenerar plano' : 'Gerar meu plano'}
          </button>
        </div>
      </div>
    )
  }

  const dias = proximos7Dias(plano)
  const hoje = dias[0]
  const proximos = dias.slice(1)

  const totalItens = plano.dias.reduce((acc, d) => acc + d.itens.length, 0)
  const concluidos = plano.dias.reduce((acc, d) => acc + d.itens.filter(i => i.concluido).length, 0)
  const progresso = Math.round((concluidos / totalItens) * 100)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-md mx-auto px-6 py-8">
        {/* Header do plano */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-1">
              Plano
            </p>
            <h2 className="font-serif text-3xl text-cream-50 leading-tight tracking-tight" style={{ fontVariationSettings: '"opsz" 96' }}>
              Próximos dias
            </h2>
          </div>
          <button
            onClick={onOpenConfig}
            className="text-xs text-cream-400 hover:text-cream-50 border border-ink-800 hover:border-brass-dim px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 shrink-0 mt-2"
          >
            Ajustar
          </button>
        </div>

        {/* Progresso total */}
        <div className="mb-8">
          <div className="flex items-center gap-3 text-xs text-cream-400 mb-2">
            <span>{concluidos} de {totalItens} concluídos</span>
            <div className="flex-1 h-1 bg-ink-800 rounded-full overflow-hidden">
              <div className="h-full bg-brass transition-all duration-500" style={{ width: `${progresso}%` }}></div>
            </div>
            <span className="tabular-nums">{progresso}%</span>
          </div>
        </div>

        {/* Hoje (destacado) */}
        {hoje && (
          <DiaCard
            dia={hoje}
            isHoje={true}
            expanded={true}
            onToggle={() => {}}
            onGoto={onGoto}
          />
        )}

        {/* Próximos dias */}
        <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mt-8 mb-3">
          Próximos
        </p>
        <div className="space-y-2">
          {proximos.map((dia) => (
            <DiaCard
              key={dia.data}
              dia={dia}
              isHoje={false}
              expanded={expandedData === dia.data}
              onToggle={() => setExpandedData(expandedData === dia.data ? null : dia.data)}
              onGoto={onGoto}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function DiaCard({ dia, isHoje, expanded, onToggle, onGoto }) {
  const nomeDia = nomeDiaSemana(dia.data)
  const dataObj = new Date(dia.data + 'T00:00:00')
  const dataFormatada = `${dataObj.getDate().toString().padStart(2, '0')}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}`
  const totalItens = dia.itens.length
  const concluidos = dia.itens.filter(i => i.concluido).length

  const cls = isHoje
    ? 'border-brass bg-brass/[0.03]'
    : 'border-ink-800 bg-ink-900'

  return (
    <div className={`rounded-2xl border ${cls} ${dia.concluido ? 'opacity-60' : ''}`}>
      <button
        onClick={onToggle}
        disabled={isHoje}
        className={`w-full flex items-center justify-between gap-3 px-5 py-4 ${isHoje ? 'cursor-default' : 'cursor-pointer hover:bg-ink-800/40'} transition-colors rounded-2xl`}
      >
        <div className="flex items-baseline gap-3">
          <span className={`font-serif text-lg ${isHoje ? 'text-brass' : 'text-cream-50'}`} style={{ fontVariationSettings: '"opsz" 60' }}>
            {nomeDia}
          </span>
          <span className="text-xs text-cream-400">{dataFormatada}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-cream-400">
          <span>{concluidos}/{totalItens}</span>
          {!isHoje && (
            <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>›</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-ink-800 px-5 py-4 space-y-2">
          {dia.itens.map((item, idx) => (
            <ItemRow
              key={idx}
              item={item}
              dataDia={dia.data}
              idxItem={idx}
              onGoto={onGoto}
              isHoje={isHoje}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, dataDia, idxItem, onGoto, isHoje }) {
  const desc = itemDescricao(item)

  function toggle() {
    marcarItemConcluido(dataDia, idxItem, !item.concluido)
  }

  function irPra() {
    if (item.tipo === 'simulado') onGoto('simulado-landing')
    else if (item.tipo === 'caderno') onGoto('caderno')
    else if (item.tipo === 'revisar') onGoto('chat') // Chat pra tirar dúvidas da matéria
  }

  return (
    <div className="flex items-center gap-3 group">
      <button
        onClick={toggle}
        className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
          item.concluido
            ? 'bg-brass border-brass'
            : 'bg-transparent border-ink-700 hover:border-brass-dim'
        }`}
        aria-label={item.concluido ? 'Desmarcar' : 'Marcar concluído'}
      >
        {item.concluido && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="#1a1408" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className={`flex-1 text-sm ${item.concluido ? 'text-cream-600 line-through' : 'text-cream-50'}`}>
        {desc}
      </span>
      {isHoje && !item.concluido && (
        <button
          onClick={irPra}
          className="text-xs text-brass-dim hover:text-brass opacity-0 group-hover:opacity-100 transition-all"
          title="Ir agora"
        >
          →
        </button>
      )}
    </div>
  )
}
