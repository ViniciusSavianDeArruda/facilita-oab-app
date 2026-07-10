/**
 * Última atividade — pra o Início mostrar cards de retomada.
 */

const K_CHAT = 'facilita-oab-last-chat'
const K_SIM = 'facilita-oab-last-sim'

export function saveLastChat({ pergunta, resposta, materia }) {
  const item = { pergunta, resposta, materia, updatedAt: new Date().toISOString() }
  localStorage.setItem(K_CHAT, JSON.stringify(item))
  window.dispatchEvent(new CustomEvent('activity:changed'))
}

export function loadLastChat() {
  try {
    const raw = localStorage.getItem(K_CHAT)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveLastSimulado({ acertos, total, materias }) {
  // materias é o dict porMateria; pega a "principal" (maior total)
  let materiaPrincipal = null
  if (materias) {
    let max = 0
    Object.entries(materias).forEach(([m, s]) => {
      if (s.total > max) { max = s.total; materiaPrincipal = m }
    })
  }
  const item = { acertos, total, materiaPrincipal, updatedAt: new Date().toISOString() }
  localStorage.setItem(K_SIM, JSON.stringify(item))
  window.dispatchEvent(new CustomEvent('activity:changed'))
}

export function loadLastSimulado() {
  try {
    const raw = localStorage.getItem(K_SIM)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function subscribeActivity(cb) {
  const handler = () => cb()
  window.addEventListener('activity:changed', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('activity:changed', handler)
    window.removeEventListener('storage', handler)
  }
}

export function tempoRelativo(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin} min atrás`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h atrás`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d atrás`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
