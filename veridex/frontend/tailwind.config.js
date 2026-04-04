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
        // Worldcoin brand colors
        worldcoin: {
          black: '#000000',
          white: '#FFFFFF',
          gray: {
            100: '#F5F5F5',
            200: '#E5E5E5',
            300: '#D4D4D4',
            400: '#A3A3A3',
            500: '#737373',
            600: '#525252',
            700: '#404040',
            800: '#262626',
            900: '#171717',
          },
        },
        // Veridex accent colors
        veridex: {
          primary: '#8B5CF6', // Purple
          secondary: '#06B6D4', // Cyan
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
