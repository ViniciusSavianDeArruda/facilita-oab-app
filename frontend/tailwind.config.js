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
          950: '#FFF8F8',
          900: '#FFF8F8',
          800: '#F0DEDE',
          700: '#DCBDBD',
        },
        cream: {
          50: '#241A0F',
          400: '#6B5D46',
          600: '#9C8D72',
        },
        brass: {
          DEFAULT: '#BA1E4A',
          hover: '#9E1A3F',
          dim: '#C15D78',
        },
        alert: {
          DEFAULT: '#C23B2E',
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
