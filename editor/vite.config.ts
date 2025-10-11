import path from 'node:path'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import solidStyledPlugin from 'vite-plugin-solid-styled'

export default defineConfig({
	plugins: [
		solid(),
		solidStyledPlugin({
			filter: {
				include: 'src/**/*.{tsx,jsx}',
				exclude: 'node_modules/**/*.{ts,js,tsx,jsx}',
			},
		}),

	],
	server: {
		port: 3000,
	},
	resolve: {
		alias: [
			{ find: '@', replacement: path.resolve(__dirname, '../src') }, // points to main game src
			{ find: '@assets', replacement: path.resolve(__dirname, '../assets') },
		],
	},
})
