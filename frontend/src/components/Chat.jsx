import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { streamChat } from '../lib/api'
import { salvarDoChat } from '../lib/caderno'
import { saveLastChat } from '../lib/lastActivity'

const SUGGESTIONS = [
  'qual o prazo do mandado de segurança?',
  'diferença entre prescrição e decadência',
  'cai muito CPC na prova?',
  'resume os pontos-chave de ética profissional',
]

export default function Chat({ materia, initialMessage, onInitialConsumed }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [input])

  // Deep-link: quando a tela de resultado passa uma mensagem inicial,
  // envia automaticamente ao entrar no chat.
  useEffect(() => {
    if (initialMessage && messages.length === 0 && !isStreaming) {
      send(initialMessage)
      onInitialConsumed?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage])

  async function send(text) {
    const content = text.trim()
    if (!content || isStreaming) return

    setError(null)
    setInput('')

    const newMessages = [...messages, { role: 'user', content }]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      let accumulated = ''
      for await (const token of streamChat({
        messages: newMessages,
        materia,
        signal: controller.signal,
      })) {
        accumulated += token
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: accumulated }
          return copy
        })
      }
      // Salvar como "última conversa" pra aparecer no Início
      if (accumulated) {
        saveLastChat({ pergunta: content, resposta: accumulated, materia })
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message || 'Algo deu errado. Tenta de novo.')
        setMessages((prev) => prev.slice(0, -1))
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  function cancel() {
    abortRef.current?.abort()
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-10 py-8">
        <div className="max-w-2xl mx-auto">
          {isEmpty ? (
            <EmptyState onPick={send} />
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <Message
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  streaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
                  pergunta={msg.role === 'assistant' ? messages[i - 1]?.content : null}
                  materia={materia}
                />
              ))}
              {error && (
                <div className="text-sm text-alert border border-alert/30 bg-alert/5 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-ink-800 bg-ink-950/80 backdrop-blur px-6 md:px-10 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 bg-ink-900 border border-ink-800 rounded-2xl px-4 py-3 focus-within:border-brass-dim transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={materia ? `Pergunte sobre ${materia}...` : 'Sua dúvida jurídica...'}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none placeholder:text-cream-600 text-cream-50 leading-relaxed py-1"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                onClick={cancel}
                className="shrink-0 h-9 w-9 rounded-full bg-ink-800 hover:bg-ink-700 text-cream-400 flex items-center justify-center transition-colors"
                aria-label="Parar"
                title="Parar"
              >
                <StopIcon />
              </button>
            ) : (
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="shrink-0 h-9 w-9 rounded-full bg-brass hover:bg-brass-hover disabled:bg-ink-800 disabled:text-cream-600 text-ink-950 flex items-center justify-center transition-colors"
                aria-label="Enviar"
                title="Enviar (Enter)"
              >
                <ArrowIcon />
              </button>
            )}
          </div>
          <p className="text-xs text-cream-600 mt-2 px-1">
            Enter envia · Shift+Enter quebra linha · o mentor pode errar em jurisprudência específica, sempre confira números de súmula.
          </p>
        </div>
      </div>
    </div>
  )
}

function Message({ role, content, streaming, pergunta, materia }) {
  const [saved, setSaved] = useState(false)

  if (role === 'user') {
    return (
      <div className="flex justify-end fade-in">
        <div className="max-w-[85%] bg-brass text-ink-950 px-4 py-3 rounded-2xl rounded-br-md">
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
      </div>
    )
  }

  function salvar() {
    if (!pergunta || !content) return
    salvarDoChat({ pergunta, resposta: content, materia })
    setSaved(true)
  }

  return (
    <div className="flex fade-in">
      <div className="max-w-[92%] pl-4 border-l-2 border-brass-dim">
        <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2 font-sans">
          Mentor
        </div>
        <div className={`markdown text-cream-50 ${streaming ? 'typing-cursor' : ''}`}>
          {content ? <ReactMarkdown>{content}</ReactMarkdown> : null}
        </div>
        {!streaming && content && pergunta && (
          <div className="mt-3">
            {saved ? (
              <span className="text-[11px] text-brass tracking-wide">salvo no caderno ✓</span>
            ) : (
              <button
                onClick={salvar}
                className="text-[11px] text-cream-400 hover:text-brass tracking-wide transition-colors"
              >
                salvar no caderno
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onPick }) {
  return (
    <div className="pt-16 pb-8">
      <p className="font-serif text-3xl md:text-4xl text-cream-50 leading-tight tracking-tight" style={{ fontVariationSettings: '"opsz" 96' }}>
        Bom estudo hoje.
      </p>
      <p className="text-cream-400 mt-3 leading-relaxed max-w-md">
        Pergunte qualquer coisa sobre a 1ª fase. O mentor cita artigo, resume o essencial e alerta sobre o que a FGV cobra.
      </p>
      <div className="mt-10">
        <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3">
          Sugestões
        </p>
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => onPick(s)}
              className="text-left px-4 py-3 rounded-xl bg-ink-900 border border-ink-800 hover:border-brass-dim hover:bg-ink-800/60 transition-colors text-cream-50 text-sm leading-snug"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L8 14M8 2L3 7M8 2L13 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="2" width="8" height="8" rx="1.5" />
    </svg>
  )
}
