/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        sidebar: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
        },
      },
      backgroundImage: {
        'gradient-bg': 'linear-gradient(145deg, #e8ecf6 0%, #eef1f7 40%, #e6eaf4 100%)',
        'gradient-card': 'linear-gradient(145deg, #ffffff 0%, #fafbfd 100%)',
        'gradient-blue': 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(15,23,42,.06)',
        'sm': '0 1px 3px rgba(15,23,42,.08), 0 4px 8px rgba(15,23,42,.06)',
        'DEFAULT': '0 2px 4px rgba(15,23,42,.06), 0 8px 20px rgba(15,23,42,.08), 0 0 0 1px rgba(15,23,42,.04)',
        'md': '0 4px 8px rgba(15,23,42,.08), 0 16px 40px rgba(15,23,42,.12), 0 0 0 1px rgba(15,23,42,.05)',
        'lg': '0 8px 16px rgba(15,23,42,.10), 0 32px 64px rgba(15,23,42,.18), 0 0 0 1px rgba(15,23,42,.05)',
        'blue': '0 4px 14px rgba(59,130,246,.25), 0 1px 3px rgba(15,23,42,.08)',
        'green': '0 4px 14px rgba(34,197,94,.2), 0 1px 3px rgba(15,23,42,.08)',
      },
    },
  },
  plugins: [],
};
