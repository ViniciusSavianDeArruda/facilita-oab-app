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
import { contarPorStatus, subscribe as subscribeCaderno } from './lib/caderno'

// Views:
//   'inicio' | 'chat' | 'caderno' | 'settings' | 'cronograma' | 'cronograma-config'
//   'simulado-landing' | 'simulado-run' | 'simulado-results'

const HIDE_BOTTOM_NAV_ON = ['simulado-run', 'settings', 'cronograma-config']

export default function App() {
  const [view, setView] = useState('inicio')
  const [simulado, setSimulado] = useState(null)
  const [result, setResult] = useState(null)
  const [prefillChat, setPrefillChat] = useState(null)
  const [cadCount, setCadCount] = useState(() => contarPorStatus())

  useEffect(() => {
    const unsub = subscribeCaderno(() => setCadCount(contarPorStatus()))
    return unsub
  }, [])

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

  function discussWithMentor(questao, respostaDada, customPrompt) {
    let prompt
    if (customPrompt) {
      prompt = customPrompt
    } else {
      const dada = respostaDada ? questao.alternativas[respostaDada] : '(não respondi)'
      const correta = questao.alternativas[questao.correta]
      prompt = `Estou revisando uma questão que errei:

**Enunciado:** ${questao.enunciado}

Marquei a alternativa **${respostaDada || '—'}**: "${dada}"

O gabarito é a **${questao.correta}**: "${correta}"

Me explica o raciocínio? Quero entender o que me confundiu.`
    }
    setPrefillChat(prompt)
    setResult(null)
    setSimulado(null)
    setView('chat')
  }

  const currentNavKey = view.startsWith('simulado')
    ? 'simulado'
    : view.startsWith('cronograma')
      ? 'cronograma'
      : view
  const showBottomNav = !HIDE_BOTTOM_NAV_ON.includes(view)

  return (
    <div className="h-full flex flex-col md:flex-row bg-ink-950">
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
            onInitialConsumed={() => setPrefillChat(null)}
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
