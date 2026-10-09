import { useEffect, useState } from "react";
import Brand from "./Brand";
import {
  CadernoIcon,
  ChatIcon,
  CogIcon,
  HomeIcon,
  PlanIcon,
  SimuladoIcon,
  StatsIcon,
} from "./icons/NavigationIcons";
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
    <aside className="hidden md:flex w-72 flex-col gap-6 border-r border-ink-800 p-5 flex-shrink-0 bg-sand-50">
      <div className="px-2 pb-4 border-b border-ink-800">
        <Brand size="sidebar" />
      </div>

      <nav className="flex-1 flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = current === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => onGoto(item.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent text-sm font-medium transition-colors duration-200 ease-in-out text-left ${
                isActive
                  ? "bg-brass text-white shadow-nav-active"
                  : "text-cream-400 hover:bg-surface-nav-hover hover:border-surface-nav-hover-border hover:text-cream-50"
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

      {/* Perfil do usuário + ajustes */}
      <div className="mt-auto border-t border-ink-800 pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brass/10 text-brass font-semibold text-sm shrink-0">
            {nome.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-cream-50 truncate">
              {nome}
            </p>

            <p className="text-xs text-cream-400">
              1ª fase • OAB
            </p>
          </div>

          <button
            onClick={onOpenSettings}
            className="shrink-0 text-cream-400 hover:text-cream-50 hover:bg-ink-900 transition-colors p-1.5 rounded-lg"
            aria-label="Ajustes"
          >
            <CogIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}
