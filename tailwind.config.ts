import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      fontFamily: {
        ink: ["var(--font-caveat)", "cursive"],
        typewriter: ["var(--font-special-elite)", "monospace"],
        ledger: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
} satisfies Config;
