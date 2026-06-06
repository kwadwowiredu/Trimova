/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{tsx,ts}',
    './components/**/*.{tsx,ts}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#fdb276',
          light: '#3f5159',
          lighter: '#2a363b',
        },
        accent: {
          DEFAULT: '#3c3cb9',
          light: '#EBF4FF',
        },
        success: '#38A169',
        warning: '#D69E2E',
        danger: '#E53E3E',
        neutral: {
          50: '#ffffff',
          100: '#f1f2f3',
          200: '#E2E8F0',
          300: '#CBD5E0',
          400: '#A0AEC0',
          500: '#718096',
          600: '#4A5568',
          700: '#2D3748',
          800: '#1A202C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'System'],
      },
    },
  },
  plugins: [],
};
