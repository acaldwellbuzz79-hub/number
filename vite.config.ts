import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const TRACKING_SCRIPT =
  '<script data-cfasync="false" async src="https://emrldtp.com/NTUxNjA5.js?t=551609"></script>';

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    viteReact(),
    {
      name: "inject-travelpayouts-tracking",
      transformIndexHtml(html) {
        return html.replace("</head>", `${TRACKING_SCRIPT}</head>`);
      },
    },
  ],
});
