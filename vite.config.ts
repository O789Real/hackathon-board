import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  // 构建用相对路径，这样放在 GitHub Pages 的 /仓库名/ 子路径下也能跑，
  // 不必把仓库名写死进配置。
  base: command === "build" ? "./" : "/",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    watch: {
      // Windows 上，编辑器或脚本在项目目录里写临时文件时，
      // Vite 的文件监听会 EBUSY 崩溃。这些一律不看。
      ignored: ["**/.*.tmpdir/**", "**/*.tmp", "**/.~*"],
    },
  },
  build: { outDir: "dist", sourcemap: false },
}));
