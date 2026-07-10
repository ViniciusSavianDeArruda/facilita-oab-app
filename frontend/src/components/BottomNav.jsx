export default function BottomNav({ current, cadernoBadge, onGoto }) {
  const items = [
    { key: 'inicio', label: 'Início', icon: HomeIcon },
    { key: 'cronograma', label: 'Plano', icon: PlanIcon },
    { key: 'chat', label: 'Chat', icon: ChatIcon },
    { key: 'simulado', label: 'Simulado', icon: SimuladoIcon },
    { key: 'caderno', label: 'Caderno', icon: CadernoIcon, badge: cadernoBadge },
  ]

  return (
    <nav className="border-t border-ink-800 bg-ink-950 flex-shrink-0 flex" style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}>
      <div className="max-w-md mx-auto w-full flex">
        {items.map((item) => {
          const isActive = current === item.key
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => onGoto(item.key)}
              className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors relative ${
                isActive ? 'text-brass' : 'text-cream-600 hover:text-cream-400'
              }`}
            >
              <div className="relative">
                <Icon active={isActive} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-brass text-ink-950 text-[9px] font-semibold min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center tabular-nums">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function HomeIcon({ active }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>
}
function PlanIcon({ active }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></svg>
}
function ChatIcon({ active }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function SimuladoIcon({ active }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
}
function CadernoIcon({ active }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
}
