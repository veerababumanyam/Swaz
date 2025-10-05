/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary-light': '#E63946',
        'secondary-light': '#D62828',
        'background-light': '#F8F9FA',
        'text-light': '#1B1B1B',
        'primary-dark': '#E63946',
        'secondary-dark': '#D62828',
        'background-dark': '#1B1B1B',
        'text-dark': '#F8F9FA',
        'accent': '#457B9D',
      },
      keyframes: {
        'pulse-fast': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: .7 },
        },
        'slide-in': {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'glowing': {
          '0%': { boxShadow: '0 0 3px #E63946' },
          '50%': { boxShadow: '0 0 15px #E63946' },
          '100%': { boxShadow: '0 0 3px #E63946' },
        }
      },
      animation: {
       'pulse-fast': 'pulse-fast 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
       'slide-in': 'slide-in 0.5s ease-out forwards',
       'glowing': 'glowing 3s ease-in-out infinite',
      }
    }
  },
  plugins: [],
}
