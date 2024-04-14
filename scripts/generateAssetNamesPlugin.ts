/// <reference types="vite/client" />
import { exec } from 'node:child_process'
import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import type { PluginOption } from 'vite'

export const getFileName = (path: string) => {
	return	path.split(/[./\\]/g).at(-2) ?? ''
}
export const getFolderName = (path: string) => {
	return	path.split(/[./]/g).at(-3) ?? ''
}

const launchScript = async (filePath?: string) => {
	if (!filePath || (filePath.includes('assets\\'))) {
		console.log('generating asset names')
		const folders: Record<string, string[]> = {}
		const assetsDir = await readdir('./assets', { recursive: true, withFileTypes: true })

		for (const dir of assetsDir) {
			if (dir.isDirectory() && dir.name[0] !== '_') {
				try {
					const files = (await readdir(`./assets/${dir.name}`))
					const fileNames = [...new Set(files.map(x => x.split('.')[0].replace('-optimized', '')))]
					if (fileNames.length) {
						folders[dir.name] = fileNames
					}
				} catch {
					console.warn(`couldn't read folder ${dir.name}`)
				}
			}
		}

		let result = ''

		for (const [folder, files] of Object.entries(folders)) {
			result += `export type ${folder} = ${files.map(x => `\'${x}'`).join(` | `)}\n`
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
