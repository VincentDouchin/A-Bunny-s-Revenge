/// <reference types="vite/client" />
import { exec } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import type { PluginOption } from 'vite'

import { glob } from 'glob'

export const getFileName = (path: string) => {
	return	path.split(/[./\\]/g).at(-2) ?? ''
}
export const getFolderName = (path: string) => {
	return	path.split(/[./\\]/g).at(-3) ?? ''
}

const launchScript = async (filePath?: string) => {
	if (!filePath || (filePath.includes('assets\\'))) {
		console.log('generating asset names')
		const folders: Record<string, Set<string>> = {}
		const assets = await glob('./assets/*/**.*')
		for (const asset of assets) {
			const fileName = getFileName(asset).replace('-optimized', '')
			const folder = getFolderName(asset)
			folders[folder] ??= new Set()
			folders[folder].add(fileName)
		}
		const sortedFolders = Object.entries(folders).sort(([a], [b]) => a.localeCompare(b)).map(([folder, files]) => {
			return [folder, [...files].sort((a, b) => a.localeCompare(b))]
		})
		let result = ''

		for (const [folder, files] of sortedFolders) {
			result += `export type ${folder} = ${[...files].map(x => `\'${x}'`).join(` | `)}\n`
		}

		await writeFile(path.join(process.cwd(), 'assets', 'assets.ts'), result)
		exec('eslint assets/assets.ts --fix')
		console.log('regenerated asset names')
	}
}
export default function generateAssetNames(): PluginOption {
	launchScript()
	return {
		name: 'watch-assets',
		apply: 'serve',
		configureServer(server) {
			server.watcher.on('add', launchScript)
			server.watcher.on('unlink', launchScript)
		},

	}
}
