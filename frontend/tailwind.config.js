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
          900: '#FFFBF7',
          800: '#EBE3DA',
          700: '#D8CCBD',
        },
        sand: {
          50: '#FBF9F5',
          100: '#EFECE6',
        },
        cream: {
          50: '#2A2422',
          400: '#5C524D',
          600: '#8A7E78',
        },
        brass: {
          DEFAULT: '#8B1E3F',
          hover: '#6F1731',
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
          page: '#FBF9F5',
          raised: '#FFFFFF',
          subtle: '#FFFBF7',
          // Nomenclatura da referência Stitch (valores próprios, conferidos
          // no HTML fornecido) — complementa os aliases acima sem removê-los.
          cream: '#FBF9F5',
          card: '#FFFFFF',
          border: '#EBE5DC',
          'border-subtle': '#F2ECE2',
          muted: '#736B63',
          dark: '#1C1917',
        },
        text: {
          primary: '#2A2422',
          secondary: '#5C524D',
          muted: '#8A7E78',
        },
        border: {
          default: '#EBE3DA',
          subtle: '#D8CCBD',
        },
        action: {
          primary: '#8B1E3F',
          hover: '#6F1731',
          muted: '#A8536A',
        },
        feedback: {
          danger: '#C23B2E',
          success: '#10B981',
          warning: '#F59E0B',

        },
      },
      boxShadow: {
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
