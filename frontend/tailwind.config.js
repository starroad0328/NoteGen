/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // GoodNotes 감성 색상
        cream: '#FFFEF8',
        charcoal: '#2C2C2C',
        highlight: {
          yellow: '#FFF4B3',
          pink: '#FFE5E5',
          blue: '#E3F2FD',
          orange: '#FFE0B2',
        },
      },
      fontFamily: {
        handwriting: ['Gowun Batang', 'Nanum Pen Script', 'serif'],
      },
    },
  },
  plugins: [],
}
