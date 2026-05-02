/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        // Alvéo Brand Colors - Luxury neutral palette
        cream: {
          50: "#fefdf9",
          100: "#fef7ed",
          200: "#fde4c7",
          300: "#f9c99b",
          400: "#c9a87c", // warm caramel tan  (was orange #f4a261)
          500: "#a8845c", // medium warm brown (was coral  #e76f51)
        },
        taupe: {
          50: "#f9f7f4",
          100: "#f2ede6",
          200: "#e8ddd0",
          300: "#d4c2a8",
          400: "#b59d7a",
          500: "#8d6e63",
        },
        charcoal: {
          50: "#f8f8f8",
          100: "#f0f0f0",
          200: "#dddddd",
          300: "#bbbbbb",
          400: "#666666",
          500: "#2e2e2e",
          600: "#1a1a1a",
        },
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
    },
  },
  plugins: [],
};
