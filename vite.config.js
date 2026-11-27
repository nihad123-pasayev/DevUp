import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["snack-sdk"],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/snack-sdk/, /node_modules/],
    },
  },
});