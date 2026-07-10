/**
 * Settings — dados pessoais/config.
 * { nome: string, dataProva: 'YYYY-MM-DD' | null, criadoEm: ISO }
 */

const KEY = 'facilita-oab-settings'

const DEFAULT = {
  nome: '',
  dataProva: null,
  criadoEm: new Date().toISOString(),
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT
    return { ...DEFAULT, ...JSON.parse(raw) }
  } catch {
    return DEFAULT
  }
}

export function saveSettings(patch) {
  const current = loadSettings()
  const next = { ...current, ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('settings:changed'))
  return next
}

export function subscribeSettings(cb) {
  const handler = () => cb(loadSettings())
  window.addEventListener('settings:changed', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('settings:changed', handler)
    window.removeEventListener('storage', handler)
  }
}

// Utility: dias restantes até a prova
export function diasAteProva(dataProvaStr) {
  if (!dataProvaStr) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const prova = new Date(dataProvaStr + 'T00:00:00')
  const ms = prova - hoje
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

// Utility: saudação por horário
export function saudacao() {
  const h = new Date().getHours()
  if (h < 6) return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
