import type { UserConfig } from 'vite'
import path from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import solidPlugin from 'vite-plugin-solid'
import solidStyledPlugin from 'vite-plugin-solid-styled'
import solidSvg from 'vite-plugin-solid-svg'
import { assetPipeline } from './scripts/assetPipeline'
import { ConverAudioFiles } from './scripts/convertAudioFiles'
import { ConverFBXToGLB } from './scripts/convertFbx2GLB'
import { ExtractAnimations } from './scripts/extractAnimations'
import { GenerateAssetManifest } from './scripts/generateAssetManifest'
import { GenerateAssetNames } from './scripts/generateAssetNames'
import { OptimizeAssets } from './scripts/optimizeAssets'

export default defineConfig(async () => {
	const config: UserConfig = {
		optimizeDeps: {
			exclude: ['@solid-primitives/deep'],
		},
		plugins: [
			await assetPipeline('./assets/**/*.*', [
				new GenerateAssetNames(),
				new GenerateAssetManifest(),
				new OptimizeAssets(),
				new ExtractAnimations(),
				new ConverAudioFiles(),
				new ConverFBXToGLB(),
			]),
			solidPlugin(),
			solidSvg({ defaultAsComponent: true }),
			solidStyledPlugin({
				filter: {
					include: 'src/**/*.{tsx,jsx}',
					exclude: 'node_modules/**/*.{ts,js,tsx,jsx}',
				},
			}),
			VitePWA({
				registerType: 'autoUpdate',

				includeAssets: ['favicon.ico', 'apple-touch-icon.png'],

				injectManifest: {
					globPatterns: ['**/*.{js,html,css,wasm,glb,svg,png,webm,webp}'],
					maximumFileSizeToCacheInBytes: 6000000,
				},
				workbox: {
					maximumFileSizeToCacheInBytes: 6000000,
				},
				manifest: {
					start_url: 'index.html?fullscreen=true',
					display: 'fullscreen',
					orientation: 'landscape',
					name: 'Fabled Recipes',
					short_name: 'Fabled Recipes',
					description: 'Fabled Recipes',
					theme_color: '#000000',
					icons: [
						{
							src: 'pwa-64x64.png',
							sizes: '64x64',
							type: 'image/png',
						},
						{
							src: 'pwa-192x192.png',
							sizes: '192x192',
							type: 'image/png',
						},
						{
							src: 'pwa-512x512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'any',
						},
						{
							src: 'maskable-icon-512x512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable',
						},
					],
				},
			}),
		],
		assetsInclude: ['**/*.glb'],
		base: '',
		resolve: {
			alias: [
				{ find: '@', replacement: path.resolve(__dirname, './src') },
				{ find: '@assets', replacement: path.resolve(__dirname, './assets') },

			],
		},
		build: {
			rollupOptions: {
				output: {
					manualChunks: {
						'three': ['three'],
						'three.quarks': ['three.quarks'],
						'@dimforge/rapier3d-compat': ['@dimforge/rapier3d-compat'],
						'level': ['./assets/levels/data.json'],
					},
				},
			},
			// ! TAURI
			// Tauri uses Chromium on Windows and WebKit on macOS and Linux
			target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'esnext',
			// don't minify for debug builds
			minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
			// produce sourcemaps for debug builds
			sourcemap: !!process.env.TAURI_DEBUG,

		},
		// prevent vite from obscuring rust errors
		clearScreen: false,
		// Tauri expects a fixed port, fail if that port is not available
		server: {
			strictPort: true,
			host: true,
		},
		// to access the Tauri environment variables set by the CLI with information about the current target
		envPrefix: ['VITE_', 'TAURI_PLATFORM', 'TAURI_ARCH', 'TAURI_FAMILY', 'TAURI_PLATFORM_VERSION', 'TAURI_PLATFORM_TYPE', 'TAURI_DEBUG'],

	}

	return config
})