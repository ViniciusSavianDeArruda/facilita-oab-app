import { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { listar, atualizarStatus, atualizarAnotacao, remover, subscribe } from '../lib/caderno'
import QuestionCard from './QuestionCard'

const STATUS_LABELS = {
  aberto: 'Aberto',
  revisando: 'Revisando',
  dominado: 'Dominado',
}

const STATUS_ORDER = ['aberto', 'revisando', 'dominado']

export default function Caderno({ onDiscussWithMentor }) {
  const [items, setItems] = useState(() => listar())
  const [expandedId, setExpandedId] = useState(null)
  const [filtroMateria, setFiltroMateria] = useState('todas')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  useEffect(() => {
    const unsub = subscribe(() => setItems(listar()))
    return unsub
  }, [])

  const materias = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.materia))).sort()
  }, [items])

  const filtered = items.filter((i) => {
    if (filtroMateria !== 'todas' && i.materia !== filtroMateria) return false
    if (filtroStatus !== 'todos' && i.status !== filtroStatus) return false
    return true
  })

  const contagens = {
    aberto: items.filter((i) => i.status === 'aberto').length,
    revisando: items.filter((i) => i.status === 'revisando').length,
    dominado: items.filter((i) => i.status === 'dominado').length,
  }

  if (items.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 pt-24 text-center">
          <p className="font-serif text-3xl text-cream-50 leading-tight tracking-tight mb-3" style={{ fontVariationSettings: '"opsz" 96' }}>
            Seu caderno está vazio.
          </p>
          <p className="text-cream-400 leading-relaxed">
            Toda vez que você errar uma questão num simulado, ela vem parar aqui automaticamente.
            No chat, use o botão "salvar no caderno" nas respostas que você quer guardar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header do caderno */}
        <div className="mb-8">
          <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2">
            Caderno
          </p>
          <div className="flex items-baseline gap-6 flex-wrap">
            <div>
              <span className="font-serif text-4xl text-cream-50" style={{ fontVariationSettings: '"opsz" 144' }}>
                {items.length}
              </span>
              <span className="text-cream-400 ml-2 text-sm">
                {items.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-cream-400">
              <span><span className="text-brass">{contagens.aberto}</span> aberto</span>
              <span><span className="text-cream-50">{contagens.revisando}</span> revisando</span>
              <span><span className="text-cream-600">{contagens.dominado}</span> dominado</span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] tracking-widest uppercase text-brass-dim font-medium mr-1">Status</span>
            <FilterPill selected={filtroStatus === 'todos'} onClick={() => setFiltroStatus('todos')}>Todos</FilterPill>
            {STATUS_ORDER.map((s) => (
              <FilterPill key={s} selected={filtroStatus === s} onClick={() => setFiltroStatus(s)}>
                {STATUS_LABELS[s]}
              </FilterPill>
            ))}
          </div>
          {materias.length > 1 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] tracking-widest uppercase text-brass-dim font-medium mr-1">Matéria</span>
              <FilterPill selected={filtroMateria === 'todas'} onClick={() => setFiltroMateria('todas')}>Todas</FilterPill>
              {materias.map((m) => (
                <FilterPill key={m} selected={filtroMateria === m} onClick={() => setFiltroMateria(m)}>
                  {m}
                </FilterPill>
              ))}
            </div>
          )}
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <p className="text-cream-400 text-sm text-center py-12">
            Nenhum item nos filtros selecionados.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <CadernoRow
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onDiscussWithMentor={onDiscussWithMentor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterPill({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
        selected
          ? 'border-brass bg-brass/10 text-brass'
          : 'border-ink-800 text-cream-400 hover:border-brass-dim hover:text-cream-50'
      }`}
    >
      {children}
    </button>
  )
}

function CadernoRow({ item, expanded, onToggle, onDiscussWithMentor }) {
  const [anotacao, setAnotacao] = useState(item.anotacao)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => setAnotacao(item.anotacao), [item.anotacao])

  const preview = item.origin === 'simulado'
    ? item.questao.enunciado.slice(0, 90) + (item.questao.enunciado.length > 90 ? '…' : '')
    : item.pergunta.slice(0, 90) + (item.pergunta.length > 90 ? '…' : '')

  const dataStr = new Date(item.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short'
  })

  const statusColor = {
    aberto: 'bg-brass',
    revisando: 'bg-cream-50',
    dominado: 'bg-cream-600',
  }[item.status]

  function salvarAnotacao() {
    atualizarAnotacao(item.id, anotacao)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  function discutir() {
    if (item.origin === 'simulado') {
      onDiscussWithMentor(item.questao, item.respostaDada)
    } else {
      onDiscussWithMentor(null, null, `Sobre esta dúvida antiga do meu caderno:\n\n${item.pergunta}\n\nMe ajuda a fixar de vez?`)
    }
  }

  return (
    <div className={`border rounded-xl transition-colors ${
      item.status === 'dominado' ? 'border-ink-800 opacity-70' : 'border-ink-800'
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-ink-900/50 transition-colors rounded-xl"
      >
        <span className={`shrink-0 w-2 h-2 rounded-full ${statusColor}`}></span>
        <span className="flex-1 text-sm text-cream-50 truncate">{preview}</span>
        <span className="text-[10px] text-cream-400 tracking-wider uppercase shrink-0 hidden sm:inline">
          {item.materia}
        </span>
        <span className="text-[10px] text-cream-600 shrink-0">{dataStr}</span>
      </button>

      {expanded && (
        <div className="border-t border-ink-800 p-6 space-y-6">
          {/* Conteúdo */}
          {item.origin === 'simulado' ? (
            <QuestionCard questao={item.questao} mode="review" selected={item.respostaDada} />
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2">
                  Pergunta
                </div>
                <p className="text-sm text-cream-50 leading-relaxed">{item.pergunta}</p>
              </div>
              <div className="pl-4 border-l-2 border-brass-dim">
                <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2">
                  Resposta do mentor
                </div>
                <div className="markdown text-sm text-cream-50">
                  <ReactMarkdown>{item.resposta}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Anotação pessoal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium">
                Minha anotação
              </div>
              {savedFlash && (
                <span className="text-[11px] text-brass">salvo</span>
              )}
            </div>
            <textarea
              value={anotacao}
              onChange={(e) => setAnotacao(e.target.value)}
              onBlur={salvarAnotacao}
              placeholder="Ex.: confundi com o art. 5º / lembrar que decadência não interrompe"
              rows={2}
              className="w-full bg-ink-900 border border-ink-800 rounded-lg p-3 text-sm text-cream-50 placeholder:text-cream-600 focus:border-brass-dim focus:outline-none resize-none"
            />
          </div>

          {/* Ações */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => atualizarStatus(item.id, s)}
                  className={`text-xs py-2 rounded-lg border transition-colors ${
                    item.status === s
                      ? 'border-brass bg-brass/10 text-brass'
                      : 'border-ink-800 text-cream-400 hover:border-brass-dim'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={discutir}
                className="flex-1 text-sm px-4 py-2.5 rounded-lg border border-brass-dim text-brass hover:bg-brass/10 transition-colors"
              >
                Conversar com o mentor →
              </button>
              <button
                onClick={() => {
                  if (confirm('Remover este item do caderno?')) remover(item.id)
                }}
                className="px-4 py-2.5 rounded-lg text-sm text-cream-600 hover:text-alert transition-colors"
                title="Remover"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
