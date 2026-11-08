/** @type {import('tailwindcss').Config} */
// Couleurs du thème Océan : garder synchronisé avec app/theme/ocean.ts
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind/Tailwind classes.
  // Be explicit about file extensions so the scanner picks up .ts/.tsx files.
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#EBF2F9",
          100: "#D2E3F3",
          200: "#B9D1EA",
          300: "#5FB0F2",
          500: "#2E8FE0",
          800: "#0B4F8A",
          950: "#062A4A",
        },
        fond: "#F4F7FB",
        encre: { DEFAULT: "#0F1B2D", douce: "#33445C" },
        gris: { DEFAULT: "#5A6B82", clair: "#7A8AA0" },
        ligne: "#E3EAF2",
        separateur: "#EEF2F7",
        champ: "#D9E3EE",
        succes: { DEFAULT: "#0F6B40", fond: "#E6F4EC", vif: "#16A05D" },
        alerte: { DEFAULT: "#8F4F05", fond: "#FDF1E1", vif: "#E4A13A" },
        danger: { DEFAULT: "#A8201A", fond: "#FDECEA", bord: "#F3C7C3" },
        neutre: { DEFAULT: "#4A5A70", fond: "#EEF1F5" },
      },
      fontFamily: {
        manrope: ["Manrope_500Medium"],
        "manrope-moyen": ["Manrope_600SemiBold"],
        "manrope-gras": ["Manrope_700Bold"],
        "manrope-tres-gras": ["Manrope_800ExtraBold"],
      },
    },
  },
  plugins: [],
}
