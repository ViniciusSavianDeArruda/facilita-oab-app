/**
 * Caderno de erros — persistência em localStorage.
 *
 * Cada item tem:
 * {
 *   id: string,
 *   createdAt: ISO string,
 *   origin: 'simulado' | 'chat',
 *   status: 'aberto' | 'revisando' | 'dominado',
 *   materia: string,
 *   anotacao: string,  // pós-it dela
 *
 *   // Se origin === 'simulado':
 *   questao: { enunciado, alternativas: {A..E}, correta, explicacao, fundamento_legal },
 *   respostaDada: 'A'|'B'|'C'|'D'|'E'|null,
 *
 *   // Se origin === 'chat':
 *   pergunta: string,
 *   resposta: string,
 * }
 */

const STORAGE_KEY = 'oab-caderno-items'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeAll(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  // Dispatch event pra outras abas / componentes react a mudanças
  window.dispatchEvent(new CustomEvent('caderno:changed'))
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// --- API pública ---

export function listar() {
  return readAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function contarPorStatus() {
  const items = readAll()
  return {
    total: items.length,
    aberto: items.filter((i) => i.status === 'aberto').length,
    revisando: items.filter((i) => i.status === 'revisando').length,
    dominado: items.filter((i) => i.status === 'dominado').length,
  }
}

export function salvarErroSimulado({ questao, respostaDada }) {
  const items = readAll()
  // Evita duplicar exatamente o mesmo enunciado
  if (items.some((i) => i.origin === 'simulado' && i.questao?.enunciado === questao.enunciado)) {
    return null
  }
  const item = {
    id: newId(),
    createdAt: new Date().toISOString(),
    origin: 'simulado',
    status: 'aberto',
    materia: questao.materia,
    anotacao: '',
    questao,
    respostaDada,
  }
  writeAll([item, ...items])
  return item
}

export function salvarDoChat({ pergunta, resposta, materia }) {
  const items = readAll()
  const item = {
    id: newId(),
    createdAt: new Date().toISOString(),
    origin: 'chat',
    status: 'aberto',
    materia: materia || 'Geral',
    anotacao: '',
    pergunta,
    resposta,
  }
  writeAll([item, ...items])
  return item
}

export function atualizarStatus(id, status) {
  const items = readAll()
  const idx = items.findIndex((i) => i.id === id)
  if (idx === -1) return
  items[idx] = { ...items[idx], status }
  writeAll(items)
}

export function atualizarAnotacao(id, anotacao) {
  const items = readAll()
  const idx = items.findIndex((i) => i.id === id)
  if (idx === -1) return
  items[idx] = { ...items[idx], anotacao }
  writeAll(items)
}

export function remover(id) {
  const items = readAll().filter((i) => i.id !== id)
  writeAll(items)
}

export function subscribe(callback) {
  const handler = () => callback()
  window.addEventListener('caderno:changed', handler)
  window.addEventListener('storage', handler) // sincroniza entre abas
  return () => {
    window.removeEventListener('caderno:changed', handler)
    window.removeEventListener('storage', handler)
  }
}
