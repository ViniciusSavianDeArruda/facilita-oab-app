/**
 * Cronograma de estudos.
 *
 * Config (armazenada):
 *   { horasPorDia, materiasFracas: [nomes], atualizadoEm }
 *
 * Plano (armazenado):
 *   { geradoEm, dataProva, dias: [{ data, itens: [{tipo, materia?, minutos, concluido}], concluido }] }
 */

const K_CONFIG = 'facilita-oab-crono-config'
const K_PLANO = 'facilita-oab-crono-plano'

// Distribuição de peso da 1ª fase (aproxima FGV real)
const PESO_FGV = {
  'Civil': 10,
  'Processo Civil': 10,
  'Constitucional': 8,
  'Ética': 8,
  'Penal': 8,
  'Trabalho': 6,
  'Administrativo': 5,
  'Tributário': 5,
  'Processo Penal': 5,
  'Empresarial': 4,
  'Processo do Trabalho': 3,
  'Filosofia': 2,
  'Direitos Humanos': 2,
  'Internacional': 2,
  'Ambiental': 1,
  'Financeiro': 1,
  'ECA': 1,
}

export const MATERIAS_CRONO = Object.keys(PESO_FGV)

const DEFAULT_CONFIG = {
  horasPorDia: 2,
  materiasFracas: [],
  atualizadoEm: null,
}

// ============ CONFIG ============

export function loadConfig() {
  try {
    const raw = localStorage.getItem(K_CONFIG)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(patch) {
  const current = loadConfig()
  const next = { ...current, ...patch, atualizadoEm: new Date().toISOString() }
  localStorage.setItem(K_CONFIG, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('crono:changed'))
  return next
}

// ============ PLANO ============

export function loadPlano() {
  try {
    const raw = localStorage.getItem(K_PLANO)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function savePlano(plano) {
  localStorage.setItem(K_PLANO, JSON.stringify(plano))
  window.dispatchEvent(new CustomEvent('crono:changed'))
}

export function limparPlano() {
  localStorage.removeItem(K_PLANO)
  window.dispatchEvent(new CustomEvent('crono:changed'))
}

export function subscribeCrono(cb) {
  const handler = () => cb()
  window.addEventListener('crono:changed', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('crono:changed', handler)
    window.removeEventListener('storage', handler)
  }
}

// ============ ALGORITMO DE GERAÇÃO ============

/**
 * Gera plano do dia de hoje até a dataProva.
 * Distribui matérias respeitando peso FGV × (2 se fraca).
 * Cada 4º dia é simulado + revisão de caderno.
 */
export function gerarPlano(dataProvaStr, config) {
  if (!dataProvaStr) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const prova = new Date(dataProvaStr + 'T00:00:00')
  const diasRestantes = Math.ceil((prova - hoje) / (1000 * 60 * 60 * 24))
  if (diasRestantes <= 0) return null

  const horasPorDia = Math.max(0.5, config.horasPorDia || 2)
  const fracas = new Set(config.materiasFracas || [])

  // Calcula peso final de cada matéria
  const pesos = {}
  let totalPeso = 0
  Object.entries(PESO_FGV).forEach(([m, p]) => {
    const peso = p * (fracas.has(m) ? 2 : 1)
    pesos[m] = peso
    totalPeso += peso
  })

  // Distribui dias entre matérias proporcional ao peso
  // Reserva ~25% dos dias pra simulado
  const nSimulados = Math.max(1, Math.floor(diasRestantes / 4))
  const diasParaMaterias = diasRestantes - nSimulados

  // Quantidade de dias que cada matéria deve receber
  const diasPorMateria = {}
  Object.entries(pesos).forEach(([m, p]) => {
    diasPorMateria[m] = Math.max(1, Math.round((p / totalPeso) * diasParaMaterias))
  })

  // Constrói fila de matérias intercalando (não repetir seguidas)
  const filaMaterias = []
  const pesoOrdenado = Object.entries(pesos).sort((a, b) => b[1] - a[1]).map(([m]) => m)
  const contagem = { ...diasPorMateria }
  let seguranca = 0
  while (Object.values(contagem).some((v) => v > 0) && seguranca++ < 10000) {
    let adicionou = false
    for (const m of pesoOrdenado) {
      if (contagem[m] > 0 && filaMaterias[filaMaterias.length - 1] !== m) {
        filaMaterias.push(m)
        contagem[m]--
        adicionou = true
      }
    }
    // Se não conseguiu adicionar nada (todos empatados com o último), força
    if (!adicionou) {
      for (const m of pesoOrdenado) {
        if (contagem[m] > 0) {
          filaMaterias.push(m)
          contagem[m]--
          break
        }
      }
    }
  }

  // Constrói dias
  const dias = []
  let idxMateria = 0
  for (let d = 0; d < diasRestantes; d++) {
    const data = new Date(hoje)
    data.setDate(data.getDate() + d)
    const dataStr = data.toISOString().slice(0, 10)

    // A cada 4 dias, é simulado
    const isSimuladoDay = (d + 1) % 4 === 0

    let itens
    if (isSimuladoDay) {
      itens = [
        { tipo: 'simulado', minutos: 25, concluido: false },
        { tipo: 'caderno', minutos: 20, concluido: false },
      ]
    } else {
      const materia = filaMaterias[idxMateria % filaMaterias.length] || 'Constitucional'
      idxMateria++
      const totalMin = Math.round(horasPorDia * 60)
      // Se sobrar minutos, adiciona caderno curto
      if (totalMin >= 90) {
        itens = [
          { tipo: 'revisar', materia, minutos: totalMin - 15, concluido: false },
          { tipo: 'caderno', minutos: 15, concluido: false },
        ]
      } else {
        itens = [{ tipo: 'revisar', materia, minutos: totalMin, concluido: false }]
      }
    }

    dias.push({ data: dataStr, itens, concluido: false })
  }

  return {
    geradoEm: new Date().toISOString(),
    dataProva: dataProvaStr,
    horasPorDia,
    dias,
  }
}

// ============ HELPERS ============

export function planoEstaValido(plano, dataProvaAtual) {
  if (!plano || !plano.dias || plano.dias.length === 0) return false
  if (plano.dataProva !== dataProvaAtual) return false
  const hoje = new Date().toISOString().slice(0, 10)
  const primeiroDia = plano.dias[0]?.data
  // Se o primeiro dia é anterior a hoje, precisa recompactar
  return primeiroDia >= hoje
}

export function planoDeHoje(plano) {
  if (!plano) return null
  const hoje = new Date().toISOString().slice(0, 10)
  return plano.dias.find((d) => d.data === hoje) || null
}

export function proximos7Dias(plano) {
  if (!plano) return []
  const hoje = new Date().toISOString().slice(0, 10)
  return plano.dias.filter((d) => d.data >= hoje).slice(0, 7)
}

/**
 * Marca item como concluído. Se todos os itens do dia estiverem concluídos,
 * marca o dia como concluído também.
 */
export function marcarItemConcluido(dataDia, idxItem, concluido) {
  const plano = loadPlano()
  if (!plano) return
  const dia = plano.dias.find((d) => d.data === dataDia)
  if (!dia || !dia.itens[idxItem]) return
  dia.itens[idxItem].concluido = concluido
  dia.concluido = dia.itens.every((i) => i.concluido)
  savePlano(plano)
}

/**
 * Redistribui dias não-concluídos que já passaram.
 * Coloca cada item pendente no próximo dia disponível.
 */
export function recompactarPlano() {
  const plano = loadPlano()
  if (!plano) return
  const hoje = new Date().toISOString().slice(0, 10)

  const passados = plano.dias.filter((d) => d.data < hoje && !d.concluido)
  const futuros = plano.dias.filter((d) => d.data >= hoje)

  // Move itens pendentes dos passados pros primeiros dias futuros com espaço
  passados.forEach((diaPassado) => {
    diaPassado.itens.filter((i) => !i.concluido).forEach((item) => {
      // Só adiciona se não sobrecarregar (max 3 itens por dia)
      const diaLivre = futuros.find((d) => d.itens.length < 3)
      if (diaLivre) diaLivre.itens.push(item)
    })
  })

  plano.dias = futuros
  savePlano(plano)
}

// ============ Utilities ============

export function tipoLabel(tipo) {
  return {
    revisar: 'Revisar',
    simulado: 'Simulado',
    caderno: 'Caderno',
  }[tipo] || tipo
}

export function itemDescricao(item) {
  if (item.tipo === 'revisar') return `${item.materia} · ${item.minutos} min`
  if (item.tipo === 'simulado') return `Simulado rápido · ${item.minutos} min`
  if (item.tipo === 'caderno') return `Revisar caderno · ${item.minutos} min`
  return `${tipoLabel(item.tipo)} · ${item.minutos} min`
}

export function nomeDiaSemana(dataStr, hoje = null) {
  const d = new Date(dataStr + 'T00:00:00')
  const h = hoje ? new Date(hoje + 'T00:00:00') : new Date()
  h.setHours(0, 0, 0, 0)
  const diff = Math.round((d - h) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  return nomes[d.getDay()]
}
