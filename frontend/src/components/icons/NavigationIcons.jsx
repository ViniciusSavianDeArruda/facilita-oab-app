/**
 * Ícones personalizados da navegação principal (Sidebar no desktop e
 * BottomNav no mobile). Ficam fora do @heroicons porque têm gramática
 * própria: 24×24 de viewBox renderizado em 18/20px, traço 1.6 e, no mobile,
 * engrossamento para 2 quando a rota está ativa.
 *
 * Ícones de interface em geral continuam vindo de @heroicons/react/24/outline
 * — esta pasta é só para o que a biblioteca não cobre.
 *
 * As duas navegações diferem apenas em `size` (18 na Sidebar, 20 na
 * BottomNav) e no uso de `active`. Os traçados são os mesmos.
 */

// Casca comum: mantém viewBox, traço e junções iguais em todos os ícones.
// `active` só é usado pela BottomNav; na Sidebar o padrão `false` reproduz
// exatamente o strokeWidth 1.6 que já existia.
function NavIcon({ size = 18, active = false, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props) {
  return (
    <NavIcon {...props}>
      <path d="M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </NavIcon>
  );
}

export function PlanIcon(props) {
  return (
    <NavIcon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
    </NavIcon>
  );
}

export function ChatIcon(props) {
  return (
    <NavIcon {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </NavIcon>
  );
}

export function SimuladoIcon(props) {
  return (
    <NavIcon {...props}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </NavIcon>
  );
}

export function CadernoIcon(props) {
  return (
    <NavIcon {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </NavIcon>
  );
}

// Usados só pela Sidebar hoje, mas seguem a mesma casca.
export function StatsIcon(props) {
  return (
    <NavIcon {...props}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-5" />
    </NavIcon>
  );
}

export function CogIcon(props) {
  return (
    <NavIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </NavIcon>
  );
}
