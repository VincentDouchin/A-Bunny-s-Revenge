import path from 'node:path'
import { templateCompilerOptions } from '@tresjs/core'
import Vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite-plus'

export default defineConfig({
	plugins: [
		Vue({
			...templateCompilerOptions,
		}),
		Icons({
			compiler: 'vue3',
			autoInstall: true,
		}),
		AutoImport({
			imports: ['vue', '@vueuse/core', '@vueuse/head'],
			dts: 'src/auto-imports.d.ts',
			dirs: ['src/stores'],
			vueTemplate: true,
		}),
		Components({
			extensions: ['vue'],
			dts: 'src/components.d.ts',
			resolvers: [
				NaiveUiResolver(),
				IconsResolver({
					enabledCollections: ['fa7-solid', 'fa7-brands'],
					prefix: false,
					alias: {
						fa: 'fa7-solid',
						fab: 'fa7-brands',
					},
				}),
			],
		}),
	],
	server: {
		port: 3000,
		hmr: false,
	},
	resolve: {
		alias: [
			{ find: '@', replacement: path.resolve(__dirname, '../src') }, // points to main game src
			{ find: '@assets', replacement: path.resolve(__dirname, '../assets') },
		],
	},
})
