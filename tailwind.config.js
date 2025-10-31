/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    // "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // This makes 'font-inter' available, like in your previous landing page
        inter: ['Inter', 'sans-serif'],
      },
      // You can add custom colors, animations, etc. here
    },
  },
  plugins: [
    // This is the plugin we added for the Help Page
    require('@tailwindcss/typography'),
  ],
};
