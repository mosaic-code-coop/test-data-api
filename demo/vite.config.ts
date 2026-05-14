import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "/test-data-api/",
  plugins: [vue()],
});
