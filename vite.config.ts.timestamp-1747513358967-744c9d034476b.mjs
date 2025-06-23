// vite.config.ts
import path2 from "node:path";
import process2 from "node:process";
import { defineConfig } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/vite/dist/node/index.js";
import { VitePWA } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/vite-plugin-pwa/dist/index.js";
import solidPlugin from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/vite-plugin-solid/dist/esm/index.mjs";
import solidStyledPlugin from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/vite-plugin-solid-styled/dist/esm/production/index.mjs";
import solidSvg from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/vite-plugin-solid-svg/dist/index.js";

// scripts/assetPipeline.ts
import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { glob } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/glob/dist/esm/index.js";
var AssetTransformer = class {
  content = "";
  path;
  extensions;
  async writeResult() {
    const newResult = this.generate();
    if (newResult && this.path) {
      if (newResult !== this.content) {
        this.content = newResult;
        await writeFile(path.join(process.cwd(), ...this.path), this.content);
        console.log(`${this.constructor.name} regenerated`);
      } else {
        console.log(`${this.constructor.name} up to date`);
      }
    }
  }
  canRun(path3) {
    if (this.extensions && path3.extension) {
      return this.extensions.includes(path3.extension);
    }
    return true;
  }
};
var assetPipeline = async (globPattern, transforms) => {
  const statsCache = /* @__PURE__ */ new Map();
  const getStats = async (path3, stats) => {
    if (stats) {
      statsCache.set(path3, stats);
      return stats;
    }
    const existingStats = statsCache.get(path3);
    if (existingStats) {
      return Promise.resolve(existingStats);
    } else {
      const stats2 = await stat(path3);
      statsCache.set(path3, stats2);
      return stats2;
    }
  };
  const transformPath = (filePath, fromGlob) => {
    const full = fromGlob ? path.join(process.cwd(), filePath) : filePath;
    filePath = filePath.replace(process.cwd(), "");
    const fullName = filePath.split("\\").at(-1);
    const name = fullName?.split(".")[0];
    const extension = fullName?.split(".")?.slice(1, fullName?.split(".").length)?.join(".");
    const folder = filePath.split("\\").at(-2);
    return { path: filePath, name, folder, extension, full };
  };
  const filePaths = await glob(globPattern);
  for (const transform of transforms) {
    for (const path3 of filePaths) {
      const pathParsed = transformPath(path3, true);
      if (transform.canRun(pathParsed)) {
        await transform.add(pathParsed, getStats(path3));
      }
    }
    await transform.writeResult();
  }
  return {
    name: "watch-assets",
    apply: "serve",
    configureServer(server) {
      server.watcher.on("add", async (path3, stats) => {
        const pathParsed = transformPath(path3, false);
        if (pathParsed.folder === "assets" || !pathParsed.full.includes("assets")) return;
        for (const transform of transforms) {
          if (transform.canRun(pathParsed)) {
            await transform.add(pathParsed, getStats(path3, stats));
            await transform.writeResult();
          }
        }
      });
      server.watcher.on("unlink", async (path3) => {
        const pathParsed = transformPath(path3, false);
        if (pathParsed.folder === "assets" || !pathParsed.full.includes("assets")) return;
        for (const transform of transforms) {
          if (transform.canRun(pathParsed)) {
            await transform.remove(pathParsed);
            await transform.writeResult();
          }
        }
      });
    }
  };
};

// scripts/convertAudioFiles.ts
import { createWriteStream } from "node:fs";
import { rename } from "node:fs/promises";
import { path as ffmpegPath } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/@ffmpeg-installer/ffmpeg/index.js";
import ffmpeg from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/fluent-ffmpeg/index.js";
var ConvertAudioFiles = class extends AssetTransformer {
  extensions = ["mp3", "wav", "ogg"];
  async add(path3) {
    if (!path3.extension) return;
    const outputPath = path3.full.replace(path3.extension, "webm");
    ffmpeg.setFfmpegPath(ffmpegPath);
    await new Promise((resolve) => {
      const outStream = createWriteStream(outputPath);
      ffmpeg().noVideo().input(path3.full).toFormat("webm").on("error", (error) => {
        console.log(`Encoding Error: ${error.message}`);
        resolve();
      }).on("end", () => {
        console.log("Audio Transcoding succeeded !");
        resolve();
      }).pipe(outStream, { end: true });
    });
    await rename(path3.full, path3.full.replace("assets", "rawAssets\\convertedAssets"));
  }
  remove() {
  }
  generate() {
  }
};

// scripts/convertFbx2GLB.ts
import { execSync } from "node:child_process";
import { rename as rename2 } from "node:fs/promises";
var ConvertFBXToGLB = class extends AssetTransformer {
  extensions = ["fbx"];
  async add(path3) {
    execSync(`FBX2GLB.exe --binary ${path3.full} --output ${path3.full.replace("fbx", "glb")}`);
    await rename2(path3.full, path3.full.replace("assets", "rawAssets\\convertedAssets"));
  }
  remove() {
  }
  generate() {
  }
};

// scripts/extractAnimations.ts
import { NodeIO } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/@gltf-transform/core/dist/core.modern.js";
import { ALL_EXTENSIONS } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/@gltf-transform/extensions/dist/extensions.modern.js";
import draco3d from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/draco3dgltf/draco3dgltf.js";
var ExtractAnimations = class extends AssetTransformer {
  path = ["assets", "animations.d.ts"];
  extensions = ["glb"];
  animations = /* @__PURE__ */ new Map();
  io = null;
  async registerIO() {
    if (!this.io) {
      this.io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
        "draco3d.decoder": await draco3d.createDecoderModule(),
        "draco3d.encoder": await draco3d.createEncoderModule()
      });
    }
    return this.io;
  }
  async add(path3) {
    const io = await this.registerIO();
    try {
      const glb = await io.read(path3.full);
      const root = glb.getRoot();
      const animationNames = root.listAnimations().map((animation) => animation.getName()).filter((x) => !x.toLowerCase().includes("meta")).sort((a, b) => a.localeCompare(b));
      if (path3.name) {
        this.animations.set(path3.name.replace("-optimized", ""), animationNames);
      }
    } catch (e) {
      console.error(e);
    }
  }
  remove(path3) {
    if (path3.name) {
      this.animations.delete(path3.name.replace("-optimized", ""));
    }
  }
  generate() {
    const sortedAnimations = Array.from(this.animations.entries()).sort(([a], [b]) => a.localeCompare(b));
    let result = `
interface Animations {`;
    for (const [name, animations] of sortedAnimations) {
      if (animations.length > 0) {
        result += `

'${name}' : ${animations.map((x) => `'${x}'`).join(` | `)}`;
      }
    }
    result += `
}`;
    return result;
  }
};

// scripts/generateAssetManifest.ts
var GenerateAssetManifest = class extends AssetTransformer {
  on = ["add", "remove", "init"];
  modified = /* @__PURE__ */ new Map();
  path = ["assets", "assetManifest.json"];
  folder;
  convertPath(path3) {
    return path3.replace("assets\\", "/assets/").replace(/\\/g, "/");
  }
  async add(path3, getStats) {
    if (path3.folder === "assets") return;
    const stats = await getStats;
    this.modified.set(this.convertPath(path3.path), {
      size: Math.round(stats.size),
      modified: Math.round(stats.mtimeMs)
    });
  }
  remove(path3) {
    this.modified.delete(this.convertPath(path3.path));
  }
  generate() {
    return JSON.stringify(
      Array.from(this.modified.entries()).sort(([a], [b]) => a.localeCompare(b)).reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {})
    );
  }
};

// scripts/generateAssetNames.ts
import { NodeIO as NodeIO2 } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/@gltf-transform/core/dist/core.modern.js";
import { ALL_EXTENSIONS as ALL_EXTENSIONS2 } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/@gltf-transform/extensions/dist/extensions.modern.js";
import draco3d2 from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/draco3dgltf/draco3dgltf.js";
var GenerateAssetNames = class extends AssetTransformer {
  folders = {};
  path = ["assets", "assets.ts"];
  io = null;
  async add(path3) {
    const fileName = path3.name?.replace("-optimized", "");
    console.log(path3.folder);
    if (path3.folder && fileName && path3.folder !== "assets") {
      this.folders[path3.folder] ??= /* @__PURE__ */ new Set();
      if (fileName.startsWith("$")) {
        const io = await this.registerIO();
        const glb = await io.read(path3.full);
        const scene = glb.getRoot().getDefaultScene();
        for (const child of scene?.listChildren() ?? []) {
          this.folders[path3.folder].add(child.getName());
        }
      } else {
        this.folders[path3.folder].add(fileName);
      }
    }
  }
  async registerIO() {
    if (!this.io) {
      this.io = new NodeIO2().registerExtensions(ALL_EXTENSIONS2).registerDependencies({
        "draco3d.decoder": await draco3d2.createDecoderModule(),
        "draco3d.encoder": await draco3d2.createEncoderModule()
      });
    }
    return this.io;
  }
  remove(path3) {
    if (path3.name && path3.folder) {
      const folder = this.folders[path3.folder];
      const name = path3.name?.replace("-optimized", "");
      name && folder.has(name) && folder.delete(name);
    }
  }
  generate() {
    const sortedFolders = Object.entries(this.folders).sort(([a], [b]) => a.localeCompare(b)).map(([folder, files]) => {
      return [folder, [...files].sort((a, b) => a.localeCompare(b))];
    });
    let result = "";
    for (const [folder, files] of sortedFolders) {
      if (files.length > 0) {
        result += `export type ${folder} = ${[...files].map((x) => `'${x}'`).join(` | `)}
`;
      }
    }
    return result;
  }
};

// scripts/optimizeAssets.ts
import { rename as rename3 } from "node:fs/promises";
import { Logger, NodeIO as NodeIO3 } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/@gltf-transform/core/dist/core.modern.js";
import { ALL_EXTENSIONS as ALL_EXTENSIONS3 } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/@gltf-transform/extensions/dist/extensions.modern.js";
import { dedup, draco, resample, textureCompress } from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/@gltf-transform/functions/dist/functions.modern.js";
import draco3d3 from "file:///C:/Users/vince/Documents/dev/fabled_recipes/node_modules/draco3dgltf/draco3dgltf.js";
var compressIfNecessary = (path3) => (document) => {
  const textures = document.getRoot().listTextures();
  const needCompress = textures.some((t) => {
    const size = t.getSize();
    return size?.some((s) => s && s > 512);
  });
  if (needCompress) {
    textureCompress({
      targetFormat: "webp",
      resize: [512, 512]
    })(document);
  } else {
    console.log(`not optimizing textures for ${path3}`);
  }
};
var OptimizeAssets = class extends AssetTransformer {
  extensions = ["glb"];
  io = null;
  async registerIO() {
    if (!this.io) {
      this.io = new NodeIO3().registerExtensions(ALL_EXTENSIONS3).registerDependencies({
        "draco3d.decoder": await draco3d3.createDecoderModule(),
        "draco3d.encoder": await draco3d3.createEncoderModule()
      });
    }
    return this.io;
  }
  async add(path3) {
    if (path3.name && !path3.name.includes("-optimized")) {
      console.log("ok", this.constructor.name, this.extensions, path3.name, path3.extension);
      const io = await this.registerIO();
      const document = await io.read(path3.full);
      document.setLogger(new Logger(Logger.Verbosity.SILENT));
      await document.transform(
        compressIfNecessary(path3.path),
        resample(),
        dedup(),
        draco()
      );
      await io.write(path3.full.replace(path3.name, `${path3.name}-optimized`), document);
      await rename3(path3.full, path3.full.replace("assets", "rawAssets\\convertedAssets"));
    }
  }
  remove(_path) {
  }
  generate() {
  }
};

// vite.config.ts
var __vite_injected_original_dirname = "C:\\Users\\vince\\Documents\\dev\\fabled_recipes";
var vite_config_default = defineConfig(async () => {
  const config = {
    optimizeDeps: {
      exclude: ["@solid-primitives/deep"]
    },
    plugins: [
      await assetPipeline("./assets/**/*.*", [
        new GenerateAssetNames(),
        new GenerateAssetManifest(),
        new OptimizeAssets(),
        new ExtractAnimations(),
        new ConvertAudioFiles(),
        new ConvertFBXToGLB()
      ]),
      solidPlugin(),
      solidSvg({ defaultAsComponent: true }),
      solidStyledPlugin({
        filter: {
          include: "src/**/*.{tsx,jsx}",
          exclude: "node_modules/**/*.{ts,js,tsx,jsx}"
        }
      }),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "apple-touch-icon.png"],
        injectManifest: {
          globPatterns: ["**/*.{js,html,css,wasm,glb,svg,png,webm,webp}"],
          maximumFileSizeToCacheInBytes: 6e6
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6e6
        },
        manifest: {
          start_url: "index.html?fullscreen=true",
          display: "fullscreen",
          orientation: "landscape",
          name: "Fabled Recipes",
          short_name: "Fabled Recipes",
          description: "Fabled Recipes",
          theme_color: "#000000",
          icons: [
            {
              src: "pwa-64x64.png",
              sizes: "64x64",
              type: "image/png"
            },
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        }
      })
    ],
    assetsInclude: ["**/*.glb"],
    base: "",
    resolve: {
      alias: [
        { find: "@", replacement: path2.resolve(__vite_injected_original_dirname, "./src") },
        { find: "@assets", replacement: path2.resolve(__vite_injected_original_dirname, "./assets") }
      ]
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "three": ["three"],
            "three.quarks": ["three.quarks"],
            "@dimforge/rapier3d-compat": ["@dimforge/rapier3d-compat"],
            "level": ["./assets/levels/data.json"]
          }
        }
      },
      // ! TAURI
      // Tauri uses Chromium on Windows and WebKit on macOS and Linux
      target: process2.env.TAURI_PLATFORM === "windows" ? "chrome105" : "esnext",
      // don't minify for debug builds
      minify: !process2.env.TAURI_DEBUG ? "esbuild" : false,
      // produce sourcemaps for debug builds
      sourcemap: !!process2.env.TAURI_DEBUG
    },
    // prevent vite from obscuring rust errors
    clearScreen: false,
    // Tauri expects a fixed port, fail if that port is not available
    server: {
      strictPort: true,
      host: true
    },
    // to access the Tauri environment variables set by the CLI with information about the current target
    envPrefix: ["VITE_", "TAURI_PLATFORM", "TAURI_ARCH", "TAURI_FAMILY", "TAURI_PLATFORM_VERSION", "TAURI_PLATFORM_TYPE", "TAURI_DEBUG"]
  };
  return config;
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic2NyaXB0cy9hc3NldFBpcGVsaW5lLnRzIiwgInNjcmlwdHMvY29udmVydEF1ZGlvRmlsZXMudHMiLCAic2NyaXB0cy9jb252ZXJ0RmJ4MkdMQi50cyIsICJzY3JpcHRzL2V4dHJhY3RBbmltYXRpb25zLnRzIiwgInNjcmlwdHMvZ2VuZXJhdGVBc3NldE1hbmlmZXN0LnRzIiwgInNjcmlwdHMvZ2VuZXJhdGVBc3NldE5hbWVzLnRzIiwgInNjcmlwdHMvb3B0aW1pemVBc3NldHMudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxEb2N1bWVudHNcXFxcZGV2XFxcXGZhYmxlZF9yZWNpcGVzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxEb2N1bWVudHNcXFxcZGV2XFxcXGZhYmxlZF9yZWNpcGVzXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy92aW5jZS9Eb2N1bWVudHMvZGV2L2ZhYmxlZF9yZWNpcGVzL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHR5cGUgeyBVc2VyQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xyXG5pbXBvcnQgcHJvY2VzcyBmcm9tICdub2RlOnByb2Nlc3MnXHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnXHJcbmltcG9ydCBzb2xpZFBsdWdpbiBmcm9tICd2aXRlLXBsdWdpbi1zb2xpZCdcclxuaW1wb3J0IHNvbGlkU3R5bGVkUGx1Z2luIGZyb20gJ3ZpdGUtcGx1Z2luLXNvbGlkLXN0eWxlZCdcclxuaW1wb3J0IHNvbGlkU3ZnIGZyb20gJ3ZpdGUtcGx1Z2luLXNvbGlkLXN2ZydcclxuaW1wb3J0IHsgYXNzZXRQaXBlbGluZSB9IGZyb20gJy4vc2NyaXB0cy9hc3NldFBpcGVsaW5lJ1xyXG5pbXBvcnQgeyBDb252ZXJ0QXVkaW9GaWxlcyB9IGZyb20gJy4vc2NyaXB0cy9jb252ZXJ0QXVkaW9GaWxlcydcclxuaW1wb3J0IHsgQ29udmVydEZCWFRvR0xCIH0gZnJvbSAnLi9zY3JpcHRzL2NvbnZlcnRGYngyR0xCJ1xyXG5pbXBvcnQgeyBFeHRyYWN0QW5pbWF0aW9ucyB9IGZyb20gJy4vc2NyaXB0cy9leHRyYWN0QW5pbWF0aW9ucydcclxuaW1wb3J0IHsgR2VuZXJhdGVBc3NldE1hbmlmZXN0IH0gZnJvbSAnLi9zY3JpcHRzL2dlbmVyYXRlQXNzZXRNYW5pZmVzdCdcclxuaW1wb3J0IHsgR2VuZXJhdGVBc3NldE5hbWVzIH0gZnJvbSAnLi9zY3JpcHRzL2dlbmVyYXRlQXNzZXROYW1lcydcclxuaW1wb3J0IHsgT3B0aW1pemVBc3NldHMgfSBmcm9tICcuL3NjcmlwdHMvb3B0aW1pemVBc3NldHMnXHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoYXN5bmMgKCkgPT4ge1xyXG5cdGNvbnN0IGNvbmZpZzogVXNlckNvbmZpZyA9IHtcclxuXHRcdG9wdGltaXplRGVwczoge1xyXG5cdFx0XHRleGNsdWRlOiBbJ0Bzb2xpZC1wcmltaXRpdmVzL2RlZXAnXSxcclxuXHRcdH0sXHJcblx0XHRwbHVnaW5zOiBbXHJcblx0XHRcdGF3YWl0IGFzc2V0UGlwZWxpbmUoJy4vYXNzZXRzLyoqLyouKicsIFtcclxuXHRcdFx0XHRuZXcgR2VuZXJhdGVBc3NldE5hbWVzKCksXHJcblx0XHRcdFx0bmV3IEdlbmVyYXRlQXNzZXRNYW5pZmVzdCgpLFxyXG5cdFx0XHRcdG5ldyBPcHRpbWl6ZUFzc2V0cygpLFxyXG5cdFx0XHRcdG5ldyBFeHRyYWN0QW5pbWF0aW9ucygpLFxyXG5cdFx0XHRcdG5ldyBDb252ZXJ0QXVkaW9GaWxlcygpLFxyXG5cdFx0XHRcdG5ldyBDb252ZXJ0RkJYVG9HTEIoKSxcclxuXHRcdFx0XSksXHJcblx0XHRcdHNvbGlkUGx1Z2luKCksXHJcblx0XHRcdHNvbGlkU3ZnKHsgZGVmYXVsdEFzQ29tcG9uZW50OiB0cnVlIH0pLFxyXG5cdFx0XHRzb2xpZFN0eWxlZFBsdWdpbih7XHJcblx0XHRcdFx0ZmlsdGVyOiB7XHJcblx0XHRcdFx0XHRpbmNsdWRlOiAnc3JjLyoqLyoue3RzeCxqc3h9JyxcclxuXHRcdFx0XHRcdGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKiovKi57dHMsanMsdHN4LGpzeH0nLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pLFxyXG5cdFx0XHRWaXRlUFdBKHtcclxuXHRcdFx0XHRyZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcclxuXHJcblx0XHRcdFx0aW5jbHVkZUFzc2V0czogWydmYXZpY29uLmljbycsICdhcHBsZS10b3VjaC1pY29uLnBuZyddLFxyXG5cclxuXHRcdFx0XHRpbmplY3RNYW5pZmVzdDoge1xyXG5cdFx0XHRcdFx0Z2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGh0bWwsY3NzLHdhc20sZ2xiLHN2Zyxwbmcsd2VibSx3ZWJwfSddLFxyXG5cdFx0XHRcdFx0bWF4aW11bUZpbGVTaXplVG9DYWNoZUluQnl0ZXM6IDYwMDAwMDAsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR3b3JrYm94OiB7XHJcblx0XHRcdFx0XHRtYXhpbXVtRmlsZVNpemVUb0NhY2hlSW5CeXRlczogNjAwMDAwMCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG1hbmlmZXN0OiB7XHJcblx0XHRcdFx0XHRzdGFydF91cmw6ICdpbmRleC5odG1sP2Z1bGxzY3JlZW49dHJ1ZScsXHJcblx0XHRcdFx0XHRkaXNwbGF5OiAnZnVsbHNjcmVlbicsXHJcblx0XHRcdFx0XHRvcmllbnRhdGlvbjogJ2xhbmRzY2FwZScsXHJcblx0XHRcdFx0XHRuYW1lOiAnRmFibGVkIFJlY2lwZXMnLFxyXG5cdFx0XHRcdFx0c2hvcnRfbmFtZTogJ0ZhYmxlZCBSZWNpcGVzJyxcclxuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiAnRmFibGVkIFJlY2lwZXMnLFxyXG5cdFx0XHRcdFx0dGhlbWVfY29sb3I6ICcjMDAwMDAwJyxcclxuXHRcdFx0XHRcdGljb25zOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRzcmM6ICdwd2EtNjR4NjQucG5nJyxcclxuXHRcdFx0XHRcdFx0XHRzaXplczogJzY0eDY0JyxcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiAnaW1hZ2UvcG5nJyxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHNyYzogJ3B3YS0xOTJ4MTkyLnBuZycsXHJcblx0XHRcdFx0XHRcdFx0c2l6ZXM6ICcxOTJ4MTkyJyxcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiAnaW1hZ2UvcG5nJyxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHNyYzogJ3B3YS01MTJ4NTEyLnBuZycsXHJcblx0XHRcdFx0XHRcdFx0c2l6ZXM6ICc1MTJ4NTEyJyxcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiAnaW1hZ2UvcG5nJyxcclxuXHRcdFx0XHRcdFx0XHRwdXJwb3NlOiAnYW55JyxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHNyYzogJ21hc2thYmxlLWljb24tNTEyeDUxMi5wbmcnLFxyXG5cdFx0XHRcdFx0XHRcdHNpemVzOiAnNTEyeDUxMicsXHJcblx0XHRcdFx0XHRcdFx0dHlwZTogJ2ltYWdlL3BuZycsXHJcblx0XHRcdFx0XHRcdFx0cHVycG9zZTogJ21hc2thYmxlJyxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSksXHJcblx0XHRdLFxyXG5cdFx0YXNzZXRzSW5jbHVkZTogWycqKi8qLmdsYiddLFxyXG5cdFx0YmFzZTogJycsXHJcblx0XHRyZXNvbHZlOiB7XHJcblx0XHRcdGFsaWFzOiBbXHJcblx0XHRcdFx0eyBmaW5kOiAnQCcsIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSB9LFxyXG5cdFx0XHRcdHsgZmluZDogJ0Bhc3NldHMnLCByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vYXNzZXRzJykgfSxcclxuXHJcblx0XHRcdF0sXHJcblx0XHR9LFxyXG5cdFx0YnVpbGQ6IHtcclxuXHRcdFx0cm9sbHVwT3B0aW9uczoge1xyXG5cdFx0XHRcdG91dHB1dDoge1xyXG5cdFx0XHRcdFx0bWFudWFsQ2h1bmtzOiB7XHJcblx0XHRcdFx0XHRcdCd0aHJlZSc6IFsndGhyZWUnXSxcclxuXHRcdFx0XHRcdFx0J3RocmVlLnF1YXJrcyc6IFsndGhyZWUucXVhcmtzJ10sXHJcblx0XHRcdFx0XHRcdCdAZGltZm9yZ2UvcmFwaWVyM2QtY29tcGF0JzogWydAZGltZm9yZ2UvcmFwaWVyM2QtY29tcGF0J10sXHJcblx0XHRcdFx0XHRcdCdsZXZlbCc6IFsnLi9hc3NldHMvbGV2ZWxzL2RhdGEuanNvbiddLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9LFxyXG5cdFx0XHQvLyAhIFRBVVJJXHJcblx0XHRcdC8vIFRhdXJpIHVzZXMgQ2hyb21pdW0gb24gV2luZG93cyBhbmQgV2ViS2l0IG9uIG1hY09TIGFuZCBMaW51eFxyXG5cdFx0XHR0YXJnZXQ6IHByb2Nlc3MuZW52LlRBVVJJX1BMQVRGT1JNID09PSAnd2luZG93cycgPyAnY2hyb21lMTA1JyA6ICdlc25leHQnLFxyXG5cdFx0XHQvLyBkb24ndCBtaW5pZnkgZm9yIGRlYnVnIGJ1aWxkc1xyXG5cdFx0XHRtaW5pZnk6ICFwcm9jZXNzLmVudi5UQVVSSV9ERUJVRyA/ICdlc2J1aWxkJyA6IGZhbHNlLFxyXG5cdFx0XHQvLyBwcm9kdWNlIHNvdXJjZW1hcHMgZm9yIGRlYnVnIGJ1aWxkc1xyXG5cdFx0XHRzb3VyY2VtYXA6ICEhcHJvY2Vzcy5lbnYuVEFVUklfREVCVUcsXHJcblxyXG5cdFx0fSxcclxuXHRcdC8vIHByZXZlbnQgdml0ZSBmcm9tIG9ic2N1cmluZyBydXN0IGVycm9yc1xyXG5cdFx0Y2xlYXJTY3JlZW46IGZhbHNlLFxyXG5cdFx0Ly8gVGF1cmkgZXhwZWN0cyBhIGZpeGVkIHBvcnQsIGZhaWwgaWYgdGhhdCBwb3J0IGlzIG5vdCBhdmFpbGFibGVcclxuXHRcdHNlcnZlcjoge1xyXG5cdFx0XHRzdHJpY3RQb3J0OiB0cnVlLFxyXG5cdFx0XHRob3N0OiB0cnVlLFxyXG5cdFx0fSxcclxuXHRcdC8vIHRvIGFjY2VzcyB0aGUgVGF1cmkgZW52aXJvbm1lbnQgdmFyaWFibGVzIHNldCBieSB0aGUgQ0xJIHdpdGggaW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnQgdGFyZ2V0XHJcblx0XHRlbnZQcmVmaXg6IFsnVklURV8nLCAnVEFVUklfUExBVEZPUk0nLCAnVEFVUklfQVJDSCcsICdUQVVSSV9GQU1JTFknLCAnVEFVUklfUExBVEZPUk1fVkVSU0lPTicsICdUQVVSSV9QTEFURk9STV9UWVBFJywgJ1RBVVJJX0RFQlVHJ10sXHJcblxyXG5cdH1cclxuXHJcblx0cmV0dXJuIGNvbmZpZ1xyXG59KSIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdmluY2VcXFxcRG9jdW1lbnRzXFxcXGRldlxcXFxmYWJsZWRfcmVjaXBlc1xcXFxzY3JpcHRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxEb2N1bWVudHNcXFxcZGV2XFxcXGZhYmxlZF9yZWNpcGVzXFxcXHNjcmlwdHNcXFxcYXNzZXRQaXBlbGluZS50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdmluY2UvRG9jdW1lbnRzL2Rldi9mYWJsZWRfcmVjaXBlcy9zY3JpcHRzL2Fzc2V0UGlwZWxpbmUudHNcIjtpbXBvcnQgdHlwZSB7IFN0YXRzIH0gZnJvbSAnbm9kZTpmcydcclxuaW1wb3J0IHR5cGUgeyBQbHVnaW5PcHRpb24gfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgeyBzdGF0LCB3cml0ZUZpbGUgfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJ1xyXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnXHJcbmltcG9ydCBwcm9jZXNzIGZyb20gJ25vZGU6cHJvY2VzcydcclxuaW1wb3J0IHsgZ2xvYiB9IGZyb20gJ2dsb2InXHJcblxyXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXNzZXRUcmFuc2Zvcm1lciB7XHJcblx0Y29udGVudCA9ICcnXHJcblx0cGF0aDogc3RyaW5nW11cclxuXHRleHRlbnNpb25zPzogc3RyaW5nW11cclxuXHRhYnN0cmFjdCBhZGQocGF0aDogUGF0aEluZm8sIGdldFN0YXRzOiBQcm9taXNlPFN0YXRzPik6IFByb21pc2U8dm9pZD4gfCB2b2lkXHJcblx0YWJzdHJhY3QgcmVtb3ZlKHBhdGg6IFBhdGhJbmZvKTogUHJvbWlzZTx2b2lkPiB8IHZvaWRcclxuXHRhYnN0cmFjdCBnZW5lcmF0ZSgpOiBzdHJpbmcgfCB2b2lkXHJcblx0YXN5bmMgd3JpdGVSZXN1bHQoKSB7XHJcblx0XHRjb25zdCBuZXdSZXN1bHQgPSB0aGlzLmdlbmVyYXRlKClcclxuXHRcdGlmIChuZXdSZXN1bHQgJiYgdGhpcy5wYXRoKSB7XHJcblx0XHRcdGlmIChuZXdSZXN1bHQgIT09IHRoaXMuY29udGVudCkge1xyXG5cdFx0XHRcdHRoaXMuY29udGVudCA9IG5ld1Jlc3VsdFxyXG5cdFx0XHRcdGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgLi4udGhpcy5wYXRoKSwgdGhpcy5jb250ZW50KVxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gcmVnZW5lcmF0ZWRgKVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gdXAgdG8gZGF0ZWApXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNhblJ1bihwYXRoOiBQYXRoSW5mbykge1xyXG5cdFx0aWYgKHRoaXMuZXh0ZW5zaW9ucyAmJiBwYXRoLmV4dGVuc2lvbikge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5leHRlbnNpb25zLmluY2x1ZGVzKHBhdGguZXh0ZW5zaW9uKVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRydWVcclxuXHR9XHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBQYXRoSW5mbyB7XHJcblx0ZnVsbDogc3RyaW5nXHJcblx0cGF0aDogc3RyaW5nXHJcblx0ZXh0ZW5zaW9uPzogc3RyaW5nXHJcblx0bmFtZT86IHN0cmluZ1xyXG5cdGZvbGRlcj86IHN0cmluZ1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgYXNzZXRQaXBlbGluZSA9IGFzeW5jIChnbG9iUGF0dGVybjogc3RyaW5nLCB0cmFuc2Zvcm1zOiAoQXNzZXRUcmFuc2Zvcm1lcilbXSk6IFByb21pc2U8UGx1Z2luT3B0aW9uPiA9PiB7XHJcblx0Y29uc3Qgc3RhdHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBTdGF0cz4oKVxyXG5cdGNvbnN0IGdldFN0YXRzID0gYXN5bmMgKHBhdGg6IHN0cmluZywgc3RhdHM/OiBTdGF0cykgPT4ge1xyXG5cdFx0aWYgKHN0YXRzKSB7XHJcblx0XHRcdHN0YXRzQ2FjaGUuc2V0KHBhdGgsIHN0YXRzKVxyXG5cdFx0XHRyZXR1cm4gc3RhdHNcclxuXHRcdH1cclxuXHRcdGNvbnN0IGV4aXN0aW5nU3RhdHMgPSBzdGF0c0NhY2hlLmdldChwYXRoKVxyXG5cdFx0aWYgKGV4aXN0aW5nU3RhdHMpIHtcclxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShleGlzdGluZ1N0YXRzKVxyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGNvbnN0IHN0YXRzID0gYXdhaXQgc3RhdChwYXRoKVxyXG5cdFx0XHRzdGF0c0NhY2hlLnNldChwYXRoLCBzdGF0cylcclxuXHRcdFx0cmV0dXJuIHN0YXRzXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRjb25zdCB0cmFuc2Zvcm1QYXRoID0gKGZpbGVQYXRoOiBzdHJpbmcsIGZyb21HbG9iKTogUGF0aEluZm8gPT4ge1xyXG5cdFx0Y29uc3QgZnVsbCA9IGZyb21HbG9iID8gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIGZpbGVQYXRoKSA6IGZpbGVQYXRoXHJcblx0XHRmaWxlUGF0aCA9IGZpbGVQYXRoLnJlcGxhY2UocHJvY2Vzcy5jd2QoKSwgJycpXHJcblx0XHRjb25zdCBmdWxsTmFtZSA9IGZpbGVQYXRoLnNwbGl0KCdcXFxcJykuYXQoLTEpXHJcblx0XHRjb25zdCBuYW1lID0gZnVsbE5hbWU/LnNwbGl0KCcuJylbMF1cclxuXHRcdGNvbnN0IGV4dGVuc2lvbiA9IGZ1bGxOYW1lPy5zcGxpdCgnLicpPy5zbGljZSgxLCBmdWxsTmFtZT8uc3BsaXQoJy4nKS5sZW5ndGgpPy5qb2luKCcuJylcclxuXHRcdGNvbnN0IGZvbGRlciA9IGZpbGVQYXRoLnNwbGl0KCdcXFxcJykuYXQoLTIpXHJcblx0XHRyZXR1cm4geyBwYXRoOiBmaWxlUGF0aCwgbmFtZSwgZm9sZGVyLCBleHRlbnNpb24sIGZ1bGwgfVxyXG5cdH1cclxuXHRjb25zdCBmaWxlUGF0aHMgPSBhd2FpdCBnbG9iKGdsb2JQYXR0ZXJuKVxyXG5cdGZvciAoY29uc3QgdHJhbnNmb3JtIG9mIHRyYW5zZm9ybXMpIHtcclxuXHRcdGZvciAoY29uc3QgcGF0aCBvZiBmaWxlUGF0aHMpIHtcclxuXHRcdFx0Y29uc3QgcGF0aFBhcnNlZCA9IHRyYW5zZm9ybVBhdGgocGF0aCwgdHJ1ZSlcclxuXHRcdFx0aWYgKHRyYW5zZm9ybS5jYW5SdW4ocGF0aFBhcnNlZCkpIHtcclxuXHRcdFx0XHRhd2FpdCB0cmFuc2Zvcm0uYWRkKHBhdGhQYXJzZWQsIGdldFN0YXRzKHBhdGgpKVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRhd2FpdCB0cmFuc2Zvcm0ud3JpdGVSZXN1bHQoKVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdG5hbWU6ICd3YXRjaC1hc3NldHMnLFxyXG5cdFx0YXBwbHk6ICdzZXJ2ZScsXHJcblxyXG5cdFx0Y29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG5cdFx0XHRzZXJ2ZXIud2F0Y2hlci5vbignYWRkJywgYXN5bmMgKHBhdGgsIHN0YXRzKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcGF0aFBhcnNlZCA9IHRyYW5zZm9ybVBhdGgocGF0aCwgZmFsc2UpXHJcblx0XHRcdFx0aWYgKHBhdGhQYXJzZWQuZm9sZGVyID09PSAnYXNzZXRzJyB8fCAhcGF0aFBhcnNlZC5mdWxsLmluY2x1ZGVzKCdhc3NldHMnKSkgcmV0dXJuXHJcblx0XHRcdFx0Zm9yIChjb25zdCB0cmFuc2Zvcm0gb2YgdHJhbnNmb3Jtcykge1xyXG5cdFx0XHRcdFx0aWYgKHRyYW5zZm9ybS5jYW5SdW4ocGF0aFBhcnNlZCkpIHtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdHJhbnNmb3JtLmFkZChwYXRoUGFyc2VkLCBnZXRTdGF0cyhwYXRoLCBzdGF0cykpXHJcblx0XHRcdFx0XHRcdGF3YWl0IHRyYW5zZm9ybS53cml0ZVJlc3VsdCgpXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cdFx0XHRzZXJ2ZXIud2F0Y2hlci5vbigndW5saW5rJywgYXN5bmMgKHBhdGgpID0+IHtcclxuXHRcdFx0XHRjb25zdCBwYXRoUGFyc2VkID0gdHJhbnNmb3JtUGF0aChwYXRoLCBmYWxzZSlcclxuXHRcdFx0XHRpZiAocGF0aFBhcnNlZC5mb2xkZXIgPT09ICdhc3NldHMnIHx8ICFwYXRoUGFyc2VkLmZ1bGwuaW5jbHVkZXMoJ2Fzc2V0cycpKSByZXR1cm5cclxuXHRcdFx0XHRmb3IgKGNvbnN0IHRyYW5zZm9ybSBvZiB0cmFuc2Zvcm1zKSB7XHJcblx0XHRcdFx0XHRpZiAodHJhbnNmb3JtLmNhblJ1bihwYXRoUGFyc2VkKSkge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0cmFuc2Zvcm0ucmVtb3ZlKHBhdGhQYXJzZWQpXHJcblx0XHRcdFx0XHRcdGF3YWl0IHRyYW5zZm9ybS53cml0ZVJlc3VsdCgpXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cdFx0fSxcclxuXHJcblx0fVxyXG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxEb2N1bWVudHNcXFxcZGV2XFxcXGZhYmxlZF9yZWNpcGVzXFxcXHNjcmlwdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHZpbmNlXFxcXERvY3VtZW50c1xcXFxkZXZcXFxcZmFibGVkX3JlY2lwZXNcXFxcc2NyaXB0c1xcXFxjb252ZXJ0QXVkaW9GaWxlcy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdmluY2UvRG9jdW1lbnRzL2Rldi9mYWJsZWRfcmVjaXBlcy9zY3JpcHRzL2NvbnZlcnRBdWRpb0ZpbGVzLnRzXCI7aW1wb3J0IHR5cGUgeyBQYXRoSW5mbyB9IGZyb20gJy4vYXNzZXRQaXBlbGluZSdcclxuaW1wb3J0IHsgY3JlYXRlV3JpdGVTdHJlYW0gfSBmcm9tICdub2RlOmZzJ1xyXG5pbXBvcnQgeyByZW5hbWUgfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJ1xyXG5pbXBvcnQgeyBwYXRoIGFzIGZmbXBlZ1BhdGggfSBmcm9tICdAZmZtcGVnLWluc3RhbGxlci9mZm1wZWcnXHJcbmltcG9ydCBmZm1wZWcgZnJvbSAnZmx1ZW50LWZmbXBlZydcclxuaW1wb3J0IHsgQXNzZXRUcmFuc2Zvcm1lciB9IGZyb20gJy4vYXNzZXRQaXBlbGluZSdcclxuXHJcbmV4cG9ydCBjbGFzcyBDb252ZXJ0QXVkaW9GaWxlcyBleHRlbmRzIEFzc2V0VHJhbnNmb3JtZXIge1xyXG5cdGV4dGVuc2lvbnMgPSBbJ21wMycsICd3YXYnLCAnb2dnJ11cclxuXHRhc3luYyBhZGQocGF0aDogUGF0aEluZm8pIHtcclxuXHRcdGlmICghcGF0aC5leHRlbnNpb24pIHJldHVyblxyXG5cdFx0Y29uc3Qgb3V0cHV0UGF0aCA9IHBhdGguZnVsbC5yZXBsYWNlKHBhdGguZXh0ZW5zaW9uLCAnd2VibScpXHJcblxyXG5cdFx0ZmZtcGVnLnNldEZmbXBlZ1BhdGgoZmZtcGVnUGF0aClcclxuXHJcblx0XHRhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xyXG5cdFx0XHRjb25zdCBvdXRTdHJlYW0gPSBjcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRQYXRoKVxyXG5cdFx0XHRmZm1wZWcoKVxyXG5cdFx0XHRcdC5ub1ZpZGVvKClcclxuXHRcdFx0XHQuaW5wdXQocGF0aC5mdWxsKVxyXG5cdFx0XHRcdC50b0Zvcm1hdCgnd2VibScpXHJcblx0XHRcdFx0Lm9uKCdlcnJvcicsIChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coYEVuY29kaW5nIEVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YClcclxuXHRcdFx0XHRcdHJlc29sdmUoKVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdFx0Lm9uKCdlbmQnLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnQXVkaW8gVHJhbnNjb2Rpbmcgc3VjY2VlZGVkICEnKVxyXG5cdFx0XHRcdFx0cmVzb2x2ZSgpXHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XHQucGlwZShvdXRTdHJlYW0sIHsgZW5kOiB0cnVlIH0pXHJcblx0XHR9KVxyXG5cdFx0YXdhaXQgcmVuYW1lKHBhdGguZnVsbCwgcGF0aC5mdWxsLnJlcGxhY2UoJ2Fzc2V0cycsICdyYXdBc3NldHNcXFxcY29udmVydGVkQXNzZXRzJykpXHJcblx0fVxyXG5cclxuXHRyZW1vdmUoKSB7IH1cclxuXHRnZW5lcmF0ZSgpIHsgfVxyXG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxEb2N1bWVudHNcXFxcZGV2XFxcXGZhYmxlZF9yZWNpcGVzXFxcXHNjcmlwdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHZpbmNlXFxcXERvY3VtZW50c1xcXFxkZXZcXFxcZmFibGVkX3JlY2lwZXNcXFxcc2NyaXB0c1xcXFxjb252ZXJ0RmJ4MkdMQi50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdmluY2UvRG9jdW1lbnRzL2Rldi9mYWJsZWRfcmVjaXBlcy9zY3JpcHRzL2NvbnZlcnRGYngyR0xCLnRzXCI7aW1wb3J0IHR5cGUgeyBQYXRoSW5mbyB9IGZyb20gJy4vYXNzZXRQaXBlbGluZSdcclxuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnXHJcbmltcG9ydCB7IHJlbmFtZSB9IGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnXHJcbmltcG9ydCB7IEFzc2V0VHJhbnNmb3JtZXIgfSBmcm9tICcuL2Fzc2V0UGlwZWxpbmUnXHJcblxyXG5leHBvcnQgY2xhc3MgQ29udmVydEZCWFRvR0xCIGV4dGVuZHMgQXNzZXRUcmFuc2Zvcm1lciB7XHJcblx0ZXh0ZW5zaW9ucyA9IFsnZmJ4J11cclxuXHRhc3luYyBhZGQocGF0aDogUGF0aEluZm8pIHtcclxuXHRcdGV4ZWNTeW5jKGBGQlgyR0xCLmV4ZSAtLWJpbmFyeSAke3BhdGguZnVsbH0gLS1vdXRwdXQgJHtwYXRoLmZ1bGwucmVwbGFjZSgnZmJ4JywgJ2dsYicpfWApXHJcblx0XHRhd2FpdCByZW5hbWUocGF0aC5mdWxsLCBwYXRoLmZ1bGwucmVwbGFjZSgnYXNzZXRzJywgJ3Jhd0Fzc2V0c1xcXFxjb252ZXJ0ZWRBc3NldHMnKSlcclxuXHR9XHJcblxyXG5cdHJlbW92ZSgpIHt9XHJcblxyXG5cdGdlbmVyYXRlKCkge31cclxufSIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdmluY2VcXFxcRG9jdW1lbnRzXFxcXGRldlxcXFxmYWJsZWRfcmVjaXBlc1xcXFxzY3JpcHRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxEb2N1bWVudHNcXFxcZGV2XFxcXGZhYmxlZF9yZWNpcGVzXFxcXHNjcmlwdHNcXFxcZXh0cmFjdEFuaW1hdGlvbnMudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3ZpbmNlL0RvY3VtZW50cy9kZXYvZmFibGVkX3JlY2lwZXMvc2NyaXB0cy9leHRyYWN0QW5pbWF0aW9ucy50c1wiO2ltcG9ydCB0eXBlIHsgUGF0aEluZm8gfSBmcm9tICcuL2Fzc2V0UGlwZWxpbmUnXHJcbmltcG9ydCB7IE5vZGVJTyB9IGZyb20gJ0BnbHRmLXRyYW5zZm9ybS9jb3JlJ1xyXG5pbXBvcnQgeyBBTExfRVhURU5TSU9OUyB9IGZyb20gJ0BnbHRmLXRyYW5zZm9ybS9leHRlbnNpb25zJ1xyXG5pbXBvcnQgZHJhY28zZCBmcm9tICdkcmFjbzNkZ2x0ZidcclxuaW1wb3J0IHsgQXNzZXRUcmFuc2Zvcm1lciB9IGZyb20gJy4vYXNzZXRQaXBlbGluZSdcclxuXHJcbmV4cG9ydCBjbGFzcyBFeHRyYWN0QW5pbWF0aW9ucyBleHRlbmRzIEFzc2V0VHJhbnNmb3JtZXIge1xyXG5cdHBhdGggPSBbJ2Fzc2V0cycsICdhbmltYXRpb25zLmQudHMnXVxyXG5cdGV4dGVuc2lvbnMgPSBbJ2dsYiddXHJcblx0YW5pbWF0aW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKVxyXG5cdGlvOiBOb2RlSU8gfCBudWxsID0gbnVsbFxyXG5cdGFzeW5jIHJlZ2lzdGVySU8oKSB7XHJcblx0XHRpZiAoIXRoaXMuaW8pIHtcclxuXHRcdFx0dGhpcy5pbyA9IG5ldyBOb2RlSU8oKVxyXG5cdFx0XHRcdC5yZWdpc3RlckV4dGVuc2lvbnMoQUxMX0VYVEVOU0lPTlMpXHJcblx0XHRcdFx0LnJlZ2lzdGVyRGVwZW5kZW5jaWVzKHtcclxuXHRcdFx0XHRcdCdkcmFjbzNkLmRlY29kZXInOiBhd2FpdCBkcmFjbzNkLmNyZWF0ZURlY29kZXJNb2R1bGUoKSxcclxuXHRcdFx0XHRcdCdkcmFjbzNkLmVuY29kZXInOiBhd2FpdCBkcmFjbzNkLmNyZWF0ZUVuY29kZXJNb2R1bGUoKSxcclxuXHRcdFx0XHR9KVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMuaW9cclxuXHR9XHJcblxyXG5cdGFzeW5jIGFkZChwYXRoOiBQYXRoSW5mbykge1xyXG5cdFx0Y29uc3QgaW8gPSBhd2FpdCB0aGlzLnJlZ2lzdGVySU8oKVxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgZ2xiID0gYXdhaXQgaW8ucmVhZChwYXRoLmZ1bGwpXHJcblx0XHRcdGNvbnN0IHJvb3QgPSBnbGIuZ2V0Um9vdCgpXHJcblx0XHRcdGNvbnN0IGFuaW1hdGlvbk5hbWVzID0gcm9vdFxyXG5cdFx0XHRcdC5saXN0QW5pbWF0aW9ucygpXHJcblx0XHRcdFx0Lm1hcChhbmltYXRpb24gPT4gYW5pbWF0aW9uLmdldE5hbWUoKSlcclxuXHRcdFx0XHQuZmlsdGVyKHggPT4gIXgudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbWV0YScpKVxyXG5cdFx0XHRcdC5zb3J0KChhLCBiKSA9PiBhLmxvY2FsZUNvbXBhcmUoYikpXHJcblx0XHRcdGlmIChwYXRoLm5hbWUpIHtcclxuXHRcdFx0XHR0aGlzLmFuaW1hdGlvbnMuc2V0KHBhdGgubmFtZS5yZXBsYWNlKCctb3B0aW1pemVkJywgJycpLCBhbmltYXRpb25OYW1lcylcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGUpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZW1vdmUocGF0aDogUGF0aEluZm8pOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAocGF0aC5uYW1lKSB7XHJcblx0XHRcdHRoaXMuYW5pbWF0aW9ucy5kZWxldGUocGF0aC5uYW1lLnJlcGxhY2UoJy1vcHRpbWl6ZWQnLCAnJykpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRnZW5lcmF0ZSgpIHtcclxuXHRcdGNvbnN0IHNvcnRlZEFuaW1hdGlvbnMgPSBBcnJheS5mcm9tKHRoaXMuYW5pbWF0aW9ucy5lbnRyaWVzKCkpLnNvcnQoKFthXSwgW2JdKSA9PiBhLmxvY2FsZUNvbXBhcmUoYikpXHJcblx0XHRsZXQgcmVzdWx0ID0gYFxyXG5pbnRlcmZhY2UgQW5pbWF0aW9ucyB7YFxyXG5cdFx0Zm9yIChjb25zdCBbbmFtZSwgYW5pbWF0aW9uc10gb2Ygc29ydGVkQW5pbWF0aW9ucykge1xyXG5cdFx0XHRpZiAoYW5pbWF0aW9ucy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0cmVzdWx0ICs9IGBcXG5cclxuJyR7bmFtZX0nIDogJHthbmltYXRpb25zLm1hcCh4ID0+IGAnJHt4fSdgKS5qb2luKGAgfCBgKX1gXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJlc3VsdCArPSBgXHJcbn1gXHJcblx0XHRyZXR1cm4gcmVzdWx0XHJcblx0fVxyXG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxEb2N1bWVudHNcXFxcZGV2XFxcXGZhYmxlZF9yZWNpcGVzXFxcXHNjcmlwdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHZpbmNlXFxcXERvY3VtZW50c1xcXFxkZXZcXFxcZmFibGVkX3JlY2lwZXNcXFxcc2NyaXB0c1xcXFxnZW5lcmF0ZUFzc2V0TWFuaWZlc3QudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3ZpbmNlL0RvY3VtZW50cy9kZXYvZmFibGVkX3JlY2lwZXMvc2NyaXB0cy9nZW5lcmF0ZUFzc2V0TWFuaWZlc3QudHNcIjtpbXBvcnQgdHlwZSB7IFN0YXRzIH0gZnJvbSAnbm9kZTpmcydcclxuaW1wb3J0IHsgQXNzZXRUcmFuc2Zvcm1lciwgdHlwZSBQYXRoSW5mbyB9IGZyb20gJy4vYXNzZXRQaXBlbGluZSdcclxuXHJcbmV4cG9ydCBjbGFzcyBHZW5lcmF0ZUFzc2V0TWFuaWZlc3QgZXh0ZW5kcyBBc3NldFRyYW5zZm9ybWVyIHtcclxuXHRvbiA9IFsnYWRkJywgJ3JlbW92ZScsICdpbml0J10gYXMgY29uc3RcclxuXHRtb2RpZmllZCA9IG5ldyBNYXA8c3RyaW5nLCB7IHNpemU6IG51bWJlciwgbW9kaWZpZWQ6IG51bWJlciB9PigpXHJcblx0cGF0aCA9IFsnYXNzZXRzJywgJ2Fzc2V0TWFuaWZlc3QuanNvbiddXHJcblx0Zm9sZGVyOiAnYXNzZXRzJ1xyXG5cclxuXHRjb252ZXJ0UGF0aChwYXRoOiBzdHJpbmcpIHtcclxuXHRcdHJldHVybiBwYXRoLnJlcGxhY2UoJ2Fzc2V0c1xcXFwnLCAnL2Fzc2V0cy8nKS5yZXBsYWNlKC9cXFxcL2csICcvJylcclxuXHR9XHJcblxyXG5cdGFzeW5jIGFkZChwYXRoOiBQYXRoSW5mbywgZ2V0U3RhdHM6IFByb21pc2U8U3RhdHM+KSB7XHJcblx0XHRpZiAocGF0aC5mb2xkZXIgPT09ICdhc3NldHMnKSByZXR1cm5cclxuXHRcdGNvbnN0IHN0YXRzID0gYXdhaXQgZ2V0U3RhdHNcclxuXHRcdHRoaXMubW9kaWZpZWQuc2V0KHRoaXMuY29udmVydFBhdGgocGF0aC5wYXRoKSwge1xyXG5cdFx0XHRzaXplOiBNYXRoLnJvdW5kKHN0YXRzLnNpemUpLFxyXG5cdFx0XHRtb2RpZmllZDogTWF0aC5yb3VuZChzdGF0cy5tdGltZU1zKSxcclxuXHRcdH0pXHJcblx0fVxyXG5cclxuXHRyZW1vdmUocGF0aDogUGF0aEluZm8pIHtcclxuXHRcdHRoaXMubW9kaWZpZWQuZGVsZXRlKHRoaXMuY29udmVydFBhdGgocGF0aC5wYXRoKSlcclxuXHR9XHJcblxyXG5cdGdlbmVyYXRlKCkge1xyXG5cdFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KFxyXG5cdFx0XHRBcnJheS5mcm9tKHRoaXMubW9kaWZpZWQuZW50cmllcygpKVxyXG5cdFx0XHRcdC5zb3J0KChbYV0sIFtiXSkgPT4gYS5sb2NhbGVDb21wYXJlKGIpKVxyXG5cdFx0XHRcdC5yZWR1Y2UoKGFjYywgW2tleSwgdmFsXSkgPT4gKHsgLi4uYWNjLCBba2V5XTogdmFsIH0pLCB7fSksXHJcblx0XHQpXHJcblx0fVxyXG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxEb2N1bWVudHNcXFxcZGV2XFxcXGZhYmxlZF9yZWNpcGVzXFxcXHNjcmlwdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHZpbmNlXFxcXERvY3VtZW50c1xcXFxkZXZcXFxcZmFibGVkX3JlY2lwZXNcXFxcc2NyaXB0c1xcXFxnZW5lcmF0ZUFzc2V0TmFtZXMudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3ZpbmNlL0RvY3VtZW50cy9kZXYvZmFibGVkX3JlY2lwZXMvc2NyaXB0cy9nZW5lcmF0ZUFzc2V0TmFtZXMudHNcIjtpbXBvcnQgdHlwZSB7IFBhdGhJbmZvIH0gZnJvbSAnLi9hc3NldFBpcGVsaW5lJ1xyXG5pbXBvcnQgeyBOb2RlSU8gfSBmcm9tICdAZ2x0Zi10cmFuc2Zvcm0vY29yZSdcclxuaW1wb3J0IHsgQUxMX0VYVEVOU0lPTlMgfSBmcm9tICdAZ2x0Zi10cmFuc2Zvcm0vZXh0ZW5zaW9ucydcclxuaW1wb3J0IGRyYWNvM2QgZnJvbSAnZHJhY28zZGdsdGYnXHJcbmltcG9ydCB7IEFzc2V0VHJhbnNmb3JtZXIgfSBmcm9tICcuL2Fzc2V0UGlwZWxpbmUnXHJcblxyXG5leHBvcnQgY2xhc3MgR2VuZXJhdGVBc3NldE5hbWVzIGV4dGVuZHMgQXNzZXRUcmFuc2Zvcm1lciB7XHJcblx0Zm9sZGVyczogUmVjb3JkPHN0cmluZywgU2V0PHN0cmluZz4+ID0ge31cclxuXHRwYXRoID0gWydhc3NldHMnLCAnYXNzZXRzLnRzJ11cclxuXHRpbzogTm9kZUlPIHwgbnVsbCA9IG51bGxcclxuXHRhc3luYyBhZGQocGF0aDogUGF0aEluZm8pIHtcclxuXHRcdGNvbnN0IGZpbGVOYW1lID0gcGF0aC5uYW1lPy5yZXBsYWNlKCctb3B0aW1pemVkJywgJycpXHJcblx0XHRjb25zb2xlLmxvZyhwYXRoLmZvbGRlcilcclxuXHRcdGlmIChwYXRoLmZvbGRlciAmJiBmaWxlTmFtZSAmJiBwYXRoLmZvbGRlciAhPT0gJ2Fzc2V0cycpIHtcclxuXHRcdFx0dGhpcy5mb2xkZXJzW3BhdGguZm9sZGVyXSA/Pz0gbmV3IFNldCgpXHJcblx0XHRcdGlmIChmaWxlTmFtZS5zdGFydHNXaXRoKCckJykpIHtcclxuXHRcdFx0XHRjb25zdCBpbyA9IGF3YWl0IHRoaXMucmVnaXN0ZXJJTygpXHJcblx0XHRcdFx0Y29uc3QgZ2xiID0gYXdhaXQgaW8ucmVhZChwYXRoLmZ1bGwpXHJcblx0XHRcdFx0Y29uc3Qgc2NlbmUgPSBnbGIuZ2V0Um9vdCgpLmdldERlZmF1bHRTY2VuZSgpXHJcblx0XHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBzY2VuZT8ubGlzdENoaWxkcmVuKCkgPz8gW10pIHtcclxuXHRcdFx0XHRcdHRoaXMuZm9sZGVyc1twYXRoLmZvbGRlcl0uYWRkKGNoaWxkLmdldE5hbWUoKSlcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5mb2xkZXJzW3BhdGguZm9sZGVyXS5hZGQoZmlsZU5hbWUpXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGFzeW5jIHJlZ2lzdGVySU8oKSB7XHJcblx0XHRpZiAoIXRoaXMuaW8pIHtcclxuXHRcdFx0dGhpcy5pbyA9IG5ldyBOb2RlSU8oKVxyXG5cdFx0XHRcdC5yZWdpc3RlckV4dGVuc2lvbnMoQUxMX0VYVEVOU0lPTlMpXHJcblx0XHRcdFx0LnJlZ2lzdGVyRGVwZW5kZW5jaWVzKHtcclxuXHRcdFx0XHRcdCdkcmFjbzNkLmRlY29kZXInOiBhd2FpdCBkcmFjbzNkLmNyZWF0ZURlY29kZXJNb2R1bGUoKSxcclxuXHRcdFx0XHRcdCdkcmFjbzNkLmVuY29kZXInOiBhd2FpdCBkcmFjbzNkLmNyZWF0ZUVuY29kZXJNb2R1bGUoKSxcclxuXHRcdFx0XHR9KVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMuaW9cclxuXHR9XHJcblxyXG5cdHJlbW92ZShwYXRoOiBQYXRoSW5mbykge1xyXG5cdFx0aWYgKHBhdGgubmFtZSAmJiBwYXRoLmZvbGRlcikge1xyXG5cdFx0XHRjb25zdCBmb2xkZXIgPSB0aGlzLmZvbGRlcnNbcGF0aC5mb2xkZXJdXHJcblx0XHRcdGNvbnN0IG5hbWUgPSBwYXRoLm5hbWU/LnJlcGxhY2UoJy1vcHRpbWl6ZWQnLCAnJylcclxuXHRcdFx0bmFtZSAmJiBmb2xkZXIuaGFzKG5hbWUpICYmIGZvbGRlci5kZWxldGUobmFtZSlcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGdlbmVyYXRlKCkge1xyXG5cdFx0Y29uc3Qgc29ydGVkRm9sZGVyczogW3N0cmluZywgc3RyaW5nW11dW10gPSBPYmplY3QuZW50cmllcyh0aGlzLmZvbGRlcnMpXHJcblx0XHRcdC5zb3J0KChbYV0sIFtiXSkgPT4gYS5sb2NhbGVDb21wYXJlKGIpKVxyXG5cdFx0XHQubWFwKChbZm9sZGVyLCBmaWxlc10pID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gW2ZvbGRlciwgWy4uLmZpbGVzXS5zb3J0KChhLCBiKSA9PiBhLmxvY2FsZUNvbXBhcmUoYikpXVxyXG5cdFx0XHR9KVxyXG5cdFx0bGV0IHJlc3VsdCA9ICcnXHJcblx0XHRmb3IgKGNvbnN0IFtmb2xkZXIsIGZpbGVzXSBvZiBzb3J0ZWRGb2xkZXJzKSB7XHJcblx0XHRcdGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0cmVzdWx0ICs9IGBleHBvcnQgdHlwZSAke2ZvbGRlcn0gPSAke1suLi5maWxlc10ubWFwKHggPT4gYFxcJyR7eH0nYCkuam9pbihgIHwgYCl9XFxuYFxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gcmVzdWx0XHJcblx0fVxyXG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxEb2N1bWVudHNcXFxcZGV2XFxcXGZhYmxlZF9yZWNpcGVzXFxcXHNjcmlwdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHZpbmNlXFxcXERvY3VtZW50c1xcXFxkZXZcXFxcZmFibGVkX3JlY2lwZXNcXFxcc2NyaXB0c1xcXFxvcHRpbWl6ZUFzc2V0cy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdmluY2UvRG9jdW1lbnRzL2Rldi9mYWJsZWRfcmVjaXBlcy9zY3JpcHRzL29wdGltaXplQXNzZXRzLnRzXCI7aW1wb3J0IHR5cGUgeyBUcmFuc2Zvcm0gfSBmcm9tICdAZ2x0Zi10cmFuc2Zvcm0vY29yZSdcclxuaW1wb3J0IHR5cGUgeyBQYXRoSW5mbyB9IGZyb20gJy4vYXNzZXRQaXBlbGluZSdcclxuaW1wb3J0IHsgcmVuYW1lIH0gZnJvbSAnbm9kZTpmcy9wcm9taXNlcydcclxuaW1wb3J0IHsgTG9nZ2VyLCBOb2RlSU8gfSBmcm9tICdAZ2x0Zi10cmFuc2Zvcm0vY29yZSdcclxuaW1wb3J0IHsgQUxMX0VYVEVOU0lPTlMgfSBmcm9tICdAZ2x0Zi10cmFuc2Zvcm0vZXh0ZW5zaW9ucydcclxuaW1wb3J0IHsgZGVkdXAsIGRyYWNvLCByZXNhbXBsZSwgdGV4dHVyZUNvbXByZXNzIH0gZnJvbSAnQGdsdGYtdHJhbnNmb3JtL2Z1bmN0aW9ucydcclxuaW1wb3J0IGRyYWNvM2QgZnJvbSAnZHJhY28zZGdsdGYnXHJcbmltcG9ydCB7IEFzc2V0VHJhbnNmb3JtZXIgfSBmcm9tICcuL2Fzc2V0UGlwZWxpbmUnXHJcblxyXG5leHBvcnQgY29uc3QgZ2V0RmlsZU5hbWUgPSAocGF0aDogc3RyaW5nKSA9PiB7XHJcblx0cmV0dXJuIHBhdGguc3BsaXQoL1suL1xcXFxdL2cpLmF0KC0yKSA/PyAnJ1xyXG59XHJcbmV4cG9ydCBjb25zdCBnZXRGb2xkZXJOYW1lID0gKHBhdGg6IHN0cmluZykgPT4ge1xyXG5cdHJldHVybiBwYXRoLnNwbGl0KC9bLi9dL2cpLmF0KC0zKSA/PyAnJ1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgZ2V0RXh0ZW5zaW9uID0gKHBhdGg6IHN0cmluZykgPT4ge1xyXG5cdHJldHVybiBwYXRoLnNwbGl0KC9bLi9dL2cpLmF0KC0xKSA/PyAnJ1xyXG59XHJcblxyXG5jb25zdCBjb21wcmVzc0lmTmVjZXNzYXJ5ID0gKHBhdGgpOiBUcmFuc2Zvcm0gPT4gKGRvY3VtZW50KSA9PiB7XHJcblx0Y29uc3QgdGV4dHVyZXMgPSBkb2N1bWVudC5nZXRSb290KCkubGlzdFRleHR1cmVzKClcclxuXHRjb25zdCBuZWVkQ29tcHJlc3MgPSB0ZXh0dXJlcy5zb21lKCh0KSA9PiB7XHJcblx0XHRjb25zdCBzaXplID0gdC5nZXRTaXplKClcclxuXHRcdHJldHVybiBzaXplPy5zb21lKHMgPT4gcyAmJiBzID4gNTEyKVxyXG5cdH0pXHJcblx0aWYgKG5lZWRDb21wcmVzcykge1xyXG5cdFx0dGV4dHVyZUNvbXByZXNzKHtcclxuXHRcdFx0dGFyZ2V0Rm9ybWF0OiAnd2VicCcsXHJcblx0XHRcdHJlc2l6ZTogWzUxMiwgNTEyXSxcclxuXHRcdH0pKGRvY3VtZW50KVxyXG5cdH0gZWxzZSB7XHJcblx0XHRjb25zb2xlLmxvZyhgbm90IG9wdGltaXppbmcgdGV4dHVyZXMgZm9yICR7cGF0aH1gKVxyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE9wdGltaXplQXNzZXRzIGV4dGVuZHMgQXNzZXRUcmFuc2Zvcm1lciB7XHJcblx0ZXh0ZW5zaW9ucyA9IFsnZ2xiJ11cclxuXHRpbzogTm9kZUlPIHwgbnVsbCA9IG51bGxcclxuXHRhc3luYyByZWdpc3RlcklPKCkge1xyXG5cdFx0aWYgKCF0aGlzLmlvKSB7XHJcblx0XHRcdHRoaXMuaW8gPSBuZXcgTm9kZUlPKClcclxuXHRcdFx0XHQucmVnaXN0ZXJFeHRlbnNpb25zKEFMTF9FWFRFTlNJT05TKVxyXG5cdFx0XHRcdC5yZWdpc3RlckRlcGVuZGVuY2llcyh7XHJcblx0XHRcdFx0XHQnZHJhY28zZC5kZWNvZGVyJzogYXdhaXQgZHJhY28zZC5jcmVhdGVEZWNvZGVyTW9kdWxlKCksXHJcblx0XHRcdFx0XHQnZHJhY28zZC5lbmNvZGVyJzogYXdhaXQgZHJhY28zZC5jcmVhdGVFbmNvZGVyTW9kdWxlKCksXHJcblx0XHRcdFx0fSlcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLmlvXHJcblx0fVxyXG5cclxuXHRhc3luYyBhZGQocGF0aDogUGF0aEluZm8pIHtcclxuXHRcdGlmIChwYXRoLm5hbWUgJiYgIXBhdGgubmFtZS5pbmNsdWRlcygnLW9wdGltaXplZCcpKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdvaycsIHRoaXMuY29uc3RydWN0b3IubmFtZSwgdGhpcy5leHRlbnNpb25zLCBwYXRoLm5hbWUsIHBhdGguZXh0ZW5zaW9uKVxyXG5cdFx0XHRjb25zdCBpbyA9IGF3YWl0IHRoaXMucmVnaXN0ZXJJTygpXHJcblx0XHRcdGNvbnN0IGRvY3VtZW50ID0gYXdhaXQgaW8ucmVhZChwYXRoLmZ1bGwpXHJcblx0XHRcdGRvY3VtZW50LnNldExvZ2dlcihuZXcgTG9nZ2VyKExvZ2dlci5WZXJib3NpdHkuU0lMRU5UKSlcclxuXHJcblx0XHRcdGF3YWl0IGRvY3VtZW50LnRyYW5zZm9ybShcclxuXHRcdFx0XHRjb21wcmVzc0lmTmVjZXNzYXJ5KHBhdGgucGF0aCksXHJcblx0XHRcdFx0cmVzYW1wbGUoKSxcclxuXHRcdFx0XHRkZWR1cCgpLFxyXG5cdFx0XHRcdGRyYWNvKCksXHJcblx0XHRcdClcclxuXHRcdFx0YXdhaXQgaW8ud3JpdGUocGF0aC5mdWxsLnJlcGxhY2UocGF0aC5uYW1lLCBgJHtwYXRoLm5hbWV9LW9wdGltaXplZGApLCBkb2N1bWVudClcclxuXHRcdFx0YXdhaXQgcmVuYW1lKHBhdGguZnVsbCwgcGF0aC5mdWxsLnJlcGxhY2UoJ2Fzc2V0cycsICdyYXdBc3NldHNcXFxcY29udmVydGVkQXNzZXRzJykpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZW1vdmUoX3BhdGg6IFBhdGhJbmZvKSB7XHJcblxyXG5cdH1cclxuXHJcblx0Z2VuZXJhdGUoKSB7XHJcblxyXG5cdH1cclxufSJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxPQUFPQSxXQUFVO0FBQ2pCLE9BQU9DLGNBQWE7QUFDcEIsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyxlQUFlO0FBQ3hCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sdUJBQXVCO0FBQzlCLE9BQU8sY0FBYzs7O0FDTHJCLFNBQVMsTUFBTSxpQkFBaUI7QUFDaEMsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sYUFBYTtBQUNwQixTQUFTLFlBQVk7QUFFZCxJQUFlLG1CQUFmLE1BQWdDO0FBQUEsRUFDdEMsVUFBVTtBQUFBLEVBQ1Y7QUFBQSxFQUNBO0FBQUEsRUFJQSxNQUFNLGNBQWM7QUFD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O0FBQUEsY0FDTCxPQUFPO0FBQUEsY0FDUCxNQUFNO0FBQUEsWUFDUDtBQUFBLFlBQ0E7QUFBQSxjQUNDLEtBQUs7QUFBQSxjQUNMLE9BQU87QUFBQSxjQUNQLE1BQU07QUFBQSxjQUNOLFNBQVM7QUFBQSxZQUNWO0FBQUEsWUFDQTtBQUFBLGNBQ0MsS0FBSztBQUFBLGNBQ0wsT0FBTztBQUFBLGNBQ1AsTUFBTTtBQUFBLGNBQ04sU0FBUztBQUFBLFlBQ1Y7QUFBQSxVQUNEO0FBQUEsUUFDRDtBQUFBLE1BQ0QsQ0FBQztBQUFBLElBQ0Y7QUFBQSxJQUNBLGVBQWUsQ0FBQyxVQUFVO0FBQUEsSUFDMUIsTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1IsT0FBTztBQUFBLFFBQ04sRUFBRSxNQUFNLEtBQUssYUFBYUssTUFBSyxRQUFRLGtDQUFXLE9BQU8sRUFBRTtBQUFBLFFBQzNELEVBQUUsTUFBTSxXQUFXLGFBQWFBLE1BQUssUUFBUSxrQ0FBVyxVQUFVLEVBQUU7QUFBQSxNQUVyRTtBQUFBLElBQ0Q7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNOLGVBQWU7QUFBQSxRQUNkLFFBQVE7QUFBQSxVQUNQLGNBQWM7QUFBQSxZQUNiLFNBQVMsQ0FBQyxPQUFPO0FBQUEsWUFDakIsZ0JBQWdCLENBQUMsY0FBYztBQUFBLFlBQy9CLDZCQUE2QixDQUFDLDJCQUEyQjtBQUFBLFlBQ3pELFNBQVMsQ0FBQywyQkFBMkI7QUFBQSxVQUN0QztBQUFBLFFBQ0Q7QUFBQSxNQUNEO0FBQUE7QUFBQTtBQUFBLE1BR0EsUUFBUUMsU0FBUSxJQUFJLG1CQUFtQixZQUFZLGNBQWM7QUFBQTtBQUFBLE1BRWpFLFFBQVEsQ0FBQ0EsU0FBUSxJQUFJLGNBQWMsWUFBWTtBQUFBO0FBQUEsTUFFL0MsV0FBVyxDQUFDLENBQUNBLFNBQVEsSUFBSTtBQUFBLElBRTFCO0FBQUE7QUFBQSxJQUVBLGFBQWE7QUFBQTtBQUFBLElBRWIsUUFBUTtBQUFBLE1BQ1AsWUFBWTtBQUFBLE1BQ1osTUFBTTtBQUFBLElBQ1A7QUFBQTtBQUFBLElBRUEsV0FBVyxDQUFDLFNBQVMsa0JBQWtCLGNBQWMsZ0JBQWdCLDBCQUEwQix1QkFBdUIsYUFBYTtBQUFBLEVBRXBJO0FBRUEsU0FBTztBQUNSLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiLCAicHJvY2VzcyIsICJwYXRoIiwgInN0YXRzIiwgInBhdGgiLCAicmVuYW1lIiwgInBhdGgiLCAicmVuYW1lIiwgInBhdGgiLCAicGF0aCIsICJOb2RlSU8iLCAiQUxMX0VYVEVOU0lPTlMiLCAiZHJhY28zZCIsICJwYXRoIiwgIk5vZGVJTyIsICJBTExfRVhURU5TSU9OUyIsICJkcmFjbzNkIiwgInJlbmFtZSIsICJOb2RlSU8iLCAiQUxMX0VYVEVOU0lPTlMiLCAiZHJhY28zZCIsICJwYXRoIiwgIk5vZGVJTyIsICJBTExfRVhURU5TSU9OUyIsICJkcmFjbzNkIiwgInJlbmFtZSIsICJwYXRoIiwgInByb2Nlc3MiXQp9Cg==
