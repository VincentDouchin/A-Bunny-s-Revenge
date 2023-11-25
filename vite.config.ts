import path from 'node:path'
import type { UserConfig } from 'vite'
import { defineConfig } from 'vite'

// import { VitePWA } from 'vite-plugin-pwa'
import generateAssetNames from './scripts/generateAssetNamesPlugin'
import { autoConvertFBXtoGLB } from './scripts/convertFbx2GLB'

// https://vitejs.dev/config/
export default defineConfig(() => {
	const config: UserConfig = {
		plugins: [generateAssetNames(), autoConvertFBXtoGLB()],
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
