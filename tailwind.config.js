module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}", 
  ],
  theme: { extend: {} },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
}
