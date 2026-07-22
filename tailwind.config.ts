import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blossom: "#F48FB1",
        blush: "#FCE4EC",
        stem: "#43A047",
        ink: "#2D2D2D"
      },
      borderRadius: {
        soft: "16px",
        bloom: "24px"
      },
      boxShadow: {
        soft: "0 18px 48px rgba(244, 143, 177, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
