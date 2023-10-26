import path from 'node:path'
import type { UserConfig } from 'vite'
import { defineConfig } from 'vite'

// import { VitePWA } from 'vite-plugin-pwa'
import generateAssetNames from './scripts/generateAssetNamesPlugin'

// https://vitejs.dev/config/
export default defineConfig(() => {
	const config: UserConfig = {
		plugins: [generateAssetNames()],
		base: '',

		build: {
			target: 'esnext',

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
