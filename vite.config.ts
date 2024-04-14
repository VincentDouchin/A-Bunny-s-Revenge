import path from 'node:path'
import type { UserConfig } from 'vite'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

import { VitePWA } from 'vite-plugin-pwa'
import generateAssetNames from './scripts/generateAssetNamesPlugin'
import { autoConvertFBXtoGLB } from './scripts/convertFbx2GLB'
import { extractAnimations } from './scripts/extractAnimations'
import { generateAssetManifest } from './scripts/generateAssetManifest'
import { convertAudioFiles } from './scripts/convertAudioFiles'
import { optimizeAssets } from './scripts/optimizeAssets'

export default defineConfig(() => {
	const config: UserConfig = {
		plugins: [
			generateAssetNames(),
			autoConvertFBXtoGLB(),
			extractAnimations(),
			generateAssetManifest(),
			convertAudioFiles(),
			optimizeAssets(),
			solidPlugin(),
			VitePWA({
				registerType: 'autoUpdate',

				includeAssets: ['favicon.ico', 'apple-touch-icon.png'],

				injectManifest: {
					globPatterns: ['**/*.{js,html,css,wasm}'],
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

		build: {
			target: 'esnext',
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

		},

		resolve: {
			alias: [
				{ find: '@', replacement: path.resolve(__dirname, './src') },
				{ find: '@assets', replacement: path.resolve(__dirname, './assets') },

			],
		},

	}

	return config
})
