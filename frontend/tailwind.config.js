/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#FFFFFF',
          900: '#FDFCFB',
          800: '#EAE4DC',
          700: '#D8CCBD',
        },
        sand: {
          50: '#FAF8F5',
          100: '#EFECE6',
        },
        cream: {
          50: '#1A1816',
          200: '#3A342F',
          400: '#6E6760',
          // Tom de metadados da referência Stitch — um passo mais claro que
          // o secundário; hoje só o turno no cabeçalho usa.
          450: '#736B63',
          600: '#9E978E',
        },
        brass: {
          DEFAULT: '#7A1B38',
          hover: '#64142E',
          // Hover de link de ação — um passo mais escuro que o hover do
          // botão primário, conforme a referência.
          'link-hover': '#540F24',
          soft: '#FDF2F4',
          dim: '#A8536A',
        },
        // Escala de vinho inspirada na referência Stitch — usada no redesign
        // visual do Dashboard (Inicio/Sidebar), ao lado do token `brass`
        // já usado no restante do app.
        brand: {
          50: '#FDF7F8',
          100: '#FBECEF',
          200: '#F5CBD4',
          300: '#EE9FB1',
          600: '#A42045',
          700: '#851936',
          800: '#6C142C',
          900: '#4D0C1D',
          950: '#2A050F',
        },
        alert: {
          DEFAULT: '#C23B2E',
        },

        surface: {
          page: '#FAF8F5',
          raised: '#FFFFFF',
          subtle: '#FDFCFB',
          // Hovers por papel — cada um tem valor próprio (subcard, nav e
          // botão secundário não compartilham tom).
          'subcard-hover': '#FFFFFF',
          'nav-hover': '#F2ECE2',
          'nav-hover-border': '#EAE4DC',
          'button-hover': '#FBF9F6',
          // Borda de hover exclusiva dos botões outlined — separada de
          // `border-hover`, que os subcards do Dashboard também usam.
          'border-button-hover': '#E6DED3',
          'border-hover': '#DFD7CB',
          // Trilha de progresso (barra de matéria e anel) — distinta da
          // borda de card, conforme a referência.
          track: '#EFEAE2',
          // Rosado sólido da pill de data/turno no cabeçalho — calibrado
          // para ser mais perceptível que a composição translúcida do brass.
          pill: '#FCF6F7',
          'pill-border': '#F0D9DE',
          'border-button': '#E2DBD0',
          // Nomenclatura da referência Stitch (valores próprios, conferidos
          // no HTML fornecido) — complementa os aliases acima sem removê-los.
          cream: '#FAF8F5',
          card: '#FFFFFF',
          border: '#EAE4DC',
          'border-subtle': '#E8DCCA',
          muted: '#6E6760',
          dark: '#1A1816',
        },
        text: {
          primary: '#1A1816',
          secondary: '#6E6760',
          muted: '#9E978E',
        },
        border: {
          default: '#EAE4DC',
          subtle: '#F0EAE1',
        },
        action: {
          primary: '#7A1B38',
          hover: '#64142E',
          soft: '#FDF2F4',
          muted: '#A8536A',
        },
        feedback: {
          danger: '#C23B2E',
          success: '#10B981',
          warning: '#F59E0B',

        },
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        'subcard-hover': '0 4px 14px rgba(122, 27, 56, 0.04)',
        'btn-primary': '0 1px 3px rgba(122, 27, 56, 0.15)',
        'btn-primary-hover': '0 2px 6px rgba(122, 27, 56, 0.25)',
        'nav-active': '0 2px 6px rgba(122, 27, 56, 0.20)',
        'card-subtle': '0 2px 10px -2px rgba(115, 107, 99, 0.05), 0 1px 3px 0 rgba(115, 107, 99, 0.04)',
        'card-hover': '0 12px 24px -6px rgba(133, 25, 54, 0.08), 0 4px 8px -2px rgba(115, 107, 99, 0.05)',
        pill: '0 2px 8px -2px rgba(133, 25, 54, 0.25)',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#241A0F',
          },
        },
      },
    },
  },
  plugins: [],
}
