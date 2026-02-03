export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: {
        primary: "#06B6D4",
        secondary: "#8B5CF6",
        accent: "#EC4899",

        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",

        bg: "#09090B",
        card: "#18181B",
        textlight: "#FAFAFA",
      },

      boxShadow: {
        glow: "0 0 20px #06B6D4",
      },
    },
  },

  plugins: [],
};
