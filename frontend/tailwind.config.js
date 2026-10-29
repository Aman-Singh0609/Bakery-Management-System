/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cocoa: { DEFAULT: '#3A1F17', soft: '#6B4A3F', muted: '#8C7068' },
        paper: '#FFF8F6',
        box: { DEFAULT: '#F4C9D2', light: '#FBE6EA' },
        berry: { DEFAULT: '#B4234F', dark: '#8E1A3D', light: '#FBE3EA' },
        pistachio: { DEFAULT: '#6F8F3E', light: '#EAF1DF' },
        butter: { DEFAULT: '#F5D27A', light: '#FDF3D6' },
        line: '#EBDCD8',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Figtree Variable"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      maxWidth: { page: '72rem' },
    },
  },
  plugins: [],
};
