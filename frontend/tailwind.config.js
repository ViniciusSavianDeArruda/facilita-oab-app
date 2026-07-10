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
          950: '#0F0E0C',
          900: '#1A1815',
          800: '#252220',
          700: '#3A3630',
        },
        cream: {
          50: '#F0E9D8',
          400: '#807A6D',
          600: '#4A473F',
        },
        brass: {
          DEFAULT: '#E4A853',
          hover: '#F0B85C',
          dim: '#8B6832',
        },
        alert: {
          DEFAULT: '#D4614A',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#F0E9D8',
          },
        },
      },
    },
  },
  plugins: [],
}
