/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Official Surprise Solution Group palette. Anchor points at their
        // given hex values: 700=Primary Blue, 800=Dark Blue, 900=Deep Navy,
        // 500=Bright Blue, 400=Cyan; 50/100/200/300/600/950 are interpolated
        // to complete a full Tailwind-style scale. brand-600 is the default
        // used for buttons/links/active-states throughout the app.
        brand: {
          50: '#EAF4FB',
          100: '#D0E7F6',
          200: '#A8D2ED',
          300: '#6EB8E0',
          400: '#00A8D8', // Cyan
          500: '#0078C8', // Bright Blue
          600: '#00529B', // Primary Blue
          700: '#003A6B', // Dark Blue
          800: '#002956', // Deep Navy
          900: '#001B3D',
          950: '#00101F',
        },
        // Teal → Emerald, used sparingly for gradient accents (brand marks,
        // hero touches, positive/success emphasis) — never a full
        // replacement for `brand` in ordinary UI.
        accent: {
          50: '#E8FBF6',
          100: '#CFF7EC',
          200: '#9FEFDA',
          300: '#5FE4C4',
          400: '#20D89A', // Emerald
          500: '#00D4C0', // Teal
          600: '#00A89B',
          700: '#007D74',
          800: '#00544D',
          900: '#002E2A',
        },
        // The palette's metallic neutral — used sparingly for premium
        // borders/dividers/decorative touches, never as a full replacement
        // for the slate scale that carries the app's actual text contrast.
        silver: '#B8C0C8',
      },
    },
  },
  plugins: [],
};
