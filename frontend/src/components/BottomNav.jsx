import {
  CadernoIcon,
  ChatIcon,
  HomeIcon,
  PlanIcon,
  SimuladoIcon,
} from "./icons/NavigationIcons";

export default function BottomNav({ current, cadernoBadge, onGoto }) {
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
  ];

  return (
    <nav
      className="border-t border-ink-800 bg-ink-950 flex-shrink-0 flex"
      style={{ paddingBottom: "max(4px, env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-md mx-auto w-full flex">
        {items.map((item) => {
          const isActive = current === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onGoto(item.key)}
              className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors relative ${
                isActive ? "text-brass" : "text-cream-600 hover:text-cream-400"
              }`}
            >
              <div className="relative">
                <Icon active={isActive} size={20} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-brass text-ink-950 text-[9px] font-semibold min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center tabular-nums">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-medium tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
