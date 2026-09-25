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
        alert: {
          DEFAULT: '#C23B2E',
        },

        surface: {
          page: '#FBF9F5',
          raised: '#FFFFFF',
          subtle: '#FFFBF7',
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
