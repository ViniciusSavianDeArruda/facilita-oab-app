import { useState, useEffect } from 'react'
import Chat from './components/Chat'
import SimuladoLanding from './components/SimuladoLanding'
import SimuladoRun from './components/SimuladoRun'
import SimuladoResults from './components/SimuladoResults'
import Caderno from './components/Caderno'
import Inicio from './components/Inicio'
import Settings from './components/Settings'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'
import Cronograma from './components/Cronograma'
import CronogramaConfig from './components/CronogramaConfig'
import CronogramaCalendario from './components/CronogramaCalendario'
import Estatisticas from './components/Estatisticas'
import Login from './components/Login'
import { contarPorStatus, subscribe as subscribeCaderno, hydrateCaderno } from './lib/caderno'
import { isAuthenticated, subscribeAuth } from './lib/authClient'
import { hydrateSettings } from './lib/settings'
import { hydrateCronogramaConfig, hydrateCronogramaPlano } from './lib/cronograma'
import { hydrateSimulados } from './lib/simulados'
import { hydrateLastActivity } from './lib/lastActivity'
import { hasLegacyData, importLegacyData, dismissLegacyImport } from './lib/importLegacy'

// Views:
//   'inicio' | 'chat' | 'caderno' | 'settings' | 'cronograma' | 'cronograma-config' | 'cronograma-completo'
//   'simulado-landing' | 'simulado-run' | 'simulado-results' | 'estatisticas'

const HIDE_BOTTOM_NAV_ON = ['simulado-run', 'settings', 'cronograma-config']

export default function App() {
  const [authStatus, setAuthStatus] = useState(isAuthenticated() ? 'hydrating' : 'unauthenticated')
  const [showImportPrompt, setShowImportPrompt] = useState(false)

  const [view, setView] = useState('inicio')
  const [simulado, setSimulado] = useState(null)
  const [result, setResult] = useState(null)
  const [prefillChat, setPrefillChat] = useState(null)
  const [prefillTitle, setPrefillTitle] = useState(null)
  const [cadCount, setCadCount] = useState(() => contarPorStatus())

  useEffect(() => {
    const unsub = subscribeCaderno(() => setCadCount(contarPorStatus()))
    return unsub
  }, [])

  useEffect(() => {
    const unsub = subscribeAuth(() => {
      setAuthStatus(isAuthenticated() ? 'hydrating' : 'unauthenticated')
    })
    return unsub
  }, [])

  useEffect(() => {
    if (authStatus !== 'hydrating') return
    let cancelled = false
    Promise.all([
      hydrateSettings(),
      hydrateCaderno(),
      hydrateCronogramaConfig(),
      hydrateCronogramaPlano(),
      hydrateSimulados(),
      hydrateLastActivity(),
    ]).then(() => {
      if (cancelled) return
      setAuthStatus('ready')
      if (hasLegacyData()) setShowImportPrompt(true)
    })
    return () => {
      cancelled = true
    }
  }, [authStatus])

  function goto(key) {
    // Mapeia chave da bottom nav pra view real
    if (key === 'simulado') {
      // Se tá no meio de um simulado, volta pra ele; senão, landing
      if (view === 'simulado-run' || view === 'simulado-results') return
      setView('simulado-landing')
      return
    }
    if (key === 'cronograma' && view === 'cronograma-config') return
    setView(key)
  }

  function startSimulado(sim) {
    setSimulado(sim)
    setView('simulado-run')
  }

  function finishSimulado(res) {
    setResult(res)
    setView('simulado-results')
  }

  function retrySimulado() {
    setSimulado(null)
    setResult(null)
    setView('simulado-landing')
  }

  function exitSimulado() {
    setSimulado(null)
    setResult(null)
    setView('inicio')
  }

  function discussWithMentor(questao, respostaDada, customPrompt, extras = {}) {
    const { anotacao, tituloOverride } = extras
    let prompt
    let titulo
    if (customPrompt) {
      prompt = customPrompt
      titulo = tituloOverride
    } else {
      const dada = respostaDada ? questao.alternativas[respostaDada] : '(não respondi)'
      const correta = questao.alternativas[questao.correta]
      prompt = `Estou revisando uma questão que errei:

**Enunciado:** ${questao.enunciado}

Marquei a alternativa **${respostaDada || '—'}**: "${dada}"

O gabarito é a **${questao.correta}**: "${correta}"` +
        (anotacao ? `\n\nMinha anotação sobre isso: ${anotacao}` : '') +
        `\n\nMe explica o raciocínio? Quero entender o que me confundiu.`
      titulo = tituloOverride || `Dúvida: ${questao.enunciado.slice(0, 40)}`
    }
    setPrefillChat(prompt)
    setPrefillTitle(titulo)
    setResult(null)
    setSimulado(null)
    setView('chat')
  }

  if (authStatus === 'unauthenticated') {
    return <Login onSuccess={() => setAuthStatus('hydrating')} />
  }

  if (authStatus === 'hydrating') {
    return (
      <div className="h-full flex items-center justify-center bg-ink-950">
        <div className="text-cream-400 text-sm">Carregando…</div>
      </div>
    )
  }

  const currentNavKey = view.startsWith('simulado')
    ? 'simulado'
    : view.startsWith('cronograma')
      ? 'cronograma'
      : view
  const showBottomNav = !HIDE_BOTTOM_NAV_ON.includes(view)

  return (
    <div className="h-full flex flex-col md:flex-row bg-ink-950">
      {showImportPrompt && (
        <ImportBanner
          onImported={() => setShowImportPrompt(false)}
          onDismiss={() => {
            dismissLegacyImport()
            setShowImportPrompt(false)
          }}
        />
      )}

      {showBottomNav && (
        <Sidebar
          current={currentNavKey}
          cadernoBadge={cadCount.aberto}
          onGoto={goto}
          onOpenSettings={() => setView('settings')}
        />
      )}
      <main className="flex-1 min-h-0 flex flex-col">
        {view === 'inicio' && (
          <Inicio
            onGoto={goto}
            onOpenSettings={() => setView('settings')}
          />
        )}
        {view === 'chat' && (
          <Chat
            materia={null}
            initialMessage={prefillChat}
            initialTitle={prefillTitle}
            onInitialConsumed={() => {
              setPrefillChat(null)
              setPrefillTitle(null)
            }}
          />
        )}
        {view === 'simulado-landing' && <SimuladoLanding onStart={startSimulado} />}
        {view === 'simulado-run' && simulado && (
          <SimuladoRun simulado={simulado} onFinish={finishSimulado} onExit={exitSimulado} />
        )}
        {view === 'simulado-results' && result && (
          <SimuladoResults
            result={result}
            onRetry={retrySimulado}
            onExit={exitSimulado}
            onDiscussWithMentor={discussWithMentor}
          />
        )}
        {view === 'caderno' && (
          <Caderno onDiscussWithMentor={discussWithMentor} />
        )}
        {view === 'settings' && (
          <Settings onBack={() => setView('inicio')} />
        )}
        {view === 'cronograma' && (
          <Cronograma
            onOpenConfig={() => setView('cronograma-config')}
            onGoto={goto}
          />
        )}
        {view === 'cronograma-config' && (
          <CronogramaConfig
            onBack={() => setView('cronograma')}
            onPlanGerado={() => setView('cronograma')}
          />
        )}
        {view === 'cronograma-completo' && (
          <CronogramaCalendario onBack={() => setView('cronograma')} />
        )}
        {view === 'estatisticas' && <Estatisticas />}
      </main>

      {showBottomNav && (
        <div className="md:hidden">
          <BottomNav
            current={currentNavKey}
            cadernoBadge={cadCount.aberto}
            onGoto={goto}
          />
        </div>
      )}
    </div>
  )
}

function ImportBanner({ onImported, onDismiss }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleImport() {
    setLoading(true)
    setError(null)
    try {
      await importLegacyData()
      onImported()
    } catch (e) {
      setError(e.message || 'Não foi possível importar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-sm bg-ink-900 border border-ink-800 rounded-2xl p-6">
        <div className="font-serif text-xl text-cream-50 mb-2" style={{ fontVariationSettings: '"opsz" 60' }}>
          Encontramos dados deste navegador
        </div>
        <p className="text-sm text-cream-400 leading-relaxed mb-6">
          Seu caderno, cronograma e ajustes salvos localmente ainda não estão na sua conta. Quer importar tudo agora?
        </p>
        {error && (
          <div className="text-sm text-alert border border-alert/30 bg-alert/5 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleImport}
            disabled={loading}
            className="flex-1 bg-brass hover:bg-brass-hover disabled:bg-ink-800 text-ink-950 font-medium py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Importando…' : 'Importar'}
          </button>
          <button
            onClick={onDismiss}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-ink-800 text-cream-400 hover:text-cream-50 transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
