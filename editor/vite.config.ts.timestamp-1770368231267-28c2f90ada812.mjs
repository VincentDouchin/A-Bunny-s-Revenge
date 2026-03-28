// vite.config.ts
import path from "node:path";
import { defineConfig } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/editor/node_modules/.pnpm/vite@7.1.5_lightningcss@1.30.1/node_modules/vite/dist/node/index.js";
import solid from "file:///C:/Users/vince/Documents/dev/fabled_recipes/editor/node_modules/.pnpm/vite-plugin-solid@2.11.8_so_8da17089ae0063b1fb994f46abd6ffd4/node_modules/vite-plugin-solid/dist/esm/index.mjs";
import solidStyledPlugin from "file:///C:/Users/vince/Documents/dev/fabled_recipes/editor/node_modules/.pnpm/vite-plugin-solid-styled@0._460f8846cd645cd5d2f8d4fef4285f73/node_modules/vite-plugin-solid-styled/dist/esm/production/index.mjs";
var __vite_injected_original_dirname = "C:\\Users\\vince\\Documents\\dev\\fabled_recipes\\editor";
var vite_config_default = defineConfig({
  plugins: [
    solid(),
    solidStyledPlugin({
      filter: {
        include: "src/**/*.{tsx,jsx}",
        exclude: "node_modules/**/*.{ts,js,tsx,jsx}"
      }
    })
  ],
  server: {
    port: 3e3
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__vite_injected_original_dirname, "../src") },
      // points to main game src
      { find: "@assets", replacement: path.resolve(__vite_injected_original_dirname, "../assets") }
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxEb2N1bWVudHNcXFxcZGV2XFxcXGZhYmxlZF9yZWNpcGVzXFxcXGVkaXRvclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdmluY2VcXFxcRG9jdW1lbnRzXFxcXGRldlxcXFxmYWJsZWRfcmVjaXBlc1xcXFxlZGl0b3JcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3ZpbmNlL0RvY3VtZW50cy9kZXYvZmFibGVkX3JlY2lwZXMvZWRpdG9yL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCBzb2xpZCBmcm9tICd2aXRlLXBsdWdpbi1zb2xpZCdcbmltcG9ydCBzb2xpZFN0eWxlZFBsdWdpbiBmcm9tICd2aXRlLXBsdWdpbi1zb2xpZC1zdHlsZWQnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG5cdHBsdWdpbnM6IFtcblx0XHRzb2xpZCgpLFxuXHRcdHNvbGlkU3R5bGVkUGx1Z2luKHtcblx0XHRcdGZpbHRlcjoge1xuXHRcdFx0XHRpbmNsdWRlOiAnc3JjLyoqLyoue3RzeCxqc3h9Jyxcblx0XHRcdFx0ZXhjbHVkZTogJ25vZGVfbW9kdWxlcy8qKi8qLnt0cyxqcyx0c3gsanN4fScsXG5cdFx0XHR9LFxuXHRcdH0pLFxuXG5cdF0sXG5cdHNlcnZlcjoge1xuXHRcdHBvcnQ6IDMwMDAsXG5cdH0sXG5cdHJlc29sdmU6IHtcblx0XHRhbGlhczogW1xuXHRcdFx0eyBmaW5kOiAnQCcsIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vc3JjJykgfSwgLy8gcG9pbnRzIHRvIG1haW4gZ2FtZSBzcmNcblx0XHRcdHsgZmluZDogJ0Bhc3NldHMnLCByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2Fzc2V0cycpIH0sXG5cdFx0XSxcblx0fSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXNWLE9BQU8sVUFBVTtBQUN2VyxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFDbEIsT0FBTyx1QkFBdUI7QUFIOUIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDM0IsU0FBUztBQUFBLElBQ1IsTUFBTTtBQUFBLElBQ04sa0JBQWtCO0FBQUEsTUFDakIsUUFBUTtBQUFBLFFBQ1AsU0FBUztBQUFBLFFBQ1QsU0FBUztBQUFBLE1BQ1Y7QUFBQSxJQUNELENBQUM7QUFBQSxFQUVGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDUCxNQUFNO0FBQUEsRUFDUDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1IsT0FBTztBQUFBLE1BQ04sRUFBRSxNQUFNLEtBQUssYUFBYSxLQUFLLFFBQVEsa0NBQVcsUUFBUSxFQUFFO0FBQUE7QUFBQSxNQUM1RCxFQUFFLE1BQU0sV0FBVyxhQUFhLEtBQUssUUFBUSxrQ0FBVyxXQUFXLEVBQUU7QUFBQSxJQUN0RTtBQUFBLEVBQ0Q7QUFDRCxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
