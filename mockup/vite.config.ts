import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build in un unico index.html apribile con doppio clic (file://)
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: "./",
  build: { outDir: "dist" },
});
