/**
 * Cliente da API do backend.
 * - streamChat: stream SSE do chat mentor
 * - gerarSimulado: cria simulado com N questões
 */

export async function* streamChat({ messages, materia, signal }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, materia }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Erro ${res.status}: ${text}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop()
    for (const event of events) {
      const line = event.trim()
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (parsed.error) throw new Error(parsed.error)
        if (parsed.text) yield parsed.text
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
}

export async function gerarSimulado({ modo, materia }) {
  const res = await fetch('/api/simulado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modo, materia }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Erro ${res.status}: ${text}`)
  }
  return res.json()
}
