import type { Config } from 'tailwindcss';

/**
 * MehrWearingShop design tokens.
 * Menswear editorial direction: warm ink/graphite neutrals carry the UI,
 * camel is the accent for CTAs, badges and seasonal highlights.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f7f6f4',
          100: '#edebe7',
          200: '#dcd9d3',
          300: '#c2beb5',
          400: '#9e9a90',
          500: '#7d7970',
          600: '#5f5c54',
          700: '#47443e',
          800: '#33312d',
          900: '#211f1c',
          950: '#141311',
        },
        camel: {
          50: '#faf6ee',
          100: '#f5ecd9',
          200: '#ebd9b4',
          300: '#dfc38a',
          400: '#d3aa5f',
          500: '#c69540',
          600: '#ad7c33',
          700: '#8c612c',
          800: '#734e29',
          900: '#604125',
        },
      },
      fontFamily: {
        sans: ['Vazirmatn', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Latin glyphs render in Playfair Display; Persian falls through to Vazirmatn.
        display: ['"Playfair Display"', 'Georgia', 'Vazirmatn', 'serif'],
      },
      letterSpacing: {
        editorial: '0.18em',
      },
      boxShadow: {
        card: '0 1px 3px rgba(20,19,17,.05), 0 12px 32px rgba(20,19,17,.07)',
        lift: '0 4px 12px rgba(20,19,17,.08), 0 24px 48px rgba(20,19,17,.12)',
      },
    },
  },
  plugins: [],
};
export default config;
