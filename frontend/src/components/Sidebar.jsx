import { useEffect, useState } from "react";
import Brand from "./Brand";
import { loadSettings, subscribeSettings } from "../lib/settings";

export default function Sidebar({
  current,
  cadernoBadge,
  onGoto,
  onOpenSettings,
}) {
  const [settings, setSettings] = useState(loadSettings());

  useEffect(() => {
    return subscribeSettings(() => {
      setSettings(loadSettings());
    });
  }, []);

  const nome = settings.nome || "Usuário";

  const items = [
    { key: "inicio", label: "Início", icon: HomeIcon },
    { key: "cronograma", label: "Plano", icon: PlanIcon },
    { key: "chat", label: "Chat", icon: ChatIcon },
    { key: "simulado", label: "Simulado", icon: SimuladoIcon },
    {
      key: "caderno",
      label: "Caderno",
      icon: CadernoIcon,
      badge: cadernoBadge,
    },
    { key: "estatisticas", label: "Estatísticas", icon: StatsIcon },
  ];

  return (
    <aside className="hidden md:flex w-60 flex-col gap-5 border-r border-ink-800 p-4 flex-shrink-0 bg-sand-50">
      <div className="flex items-center justify-between px-2 pb-3 border-b border-ink-800">
        <Brand size="sidebar" />
        <button
          onClick={onOpenSettings}
          className="text-cream-400 hover:text-cream-50 transition-colors p-1"
          aria-label="Ajustes"
        >
          <CogIcon />
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = current === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onGoto(item.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? "text-brass bg-[#F7E4EA]"
                  : "text-cream-400 hover:text-cream-50 hover:bg-[#F3ECE4]"
              }`}
            >
              <Icon />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className="ml-auto bg-brass text-ink-950 text-[10px] font-semibold min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center tabular-nums">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Perfil do usuário */}
      <div className="mt-auto border-t border-ink-800 pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brass/10 text-brass font-semibold text-sm">
            {nome.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-cream-50 truncate">
              {nome}
            </p>

            <p className="text-xs text-cream-400">
              1ª fase • OAB
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SimuladoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function CadernoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-5" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
