import { stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { glob } from 'glob'
import type { PluginOption } from 'vite'

const launchScript = async (filePath?: string) => {
	if (!filePath || filePath.includes('assets\\')) {
		const modified: Record<string, { size: number, modified: number }> = {}
		const assets = await glob('./assets/*/**.*')
		for (const path of assets) {
			const file = await stat(path)
			modified[path.replace('assets\\', '/assets/').replace(/\\/g, '/')] = { size: Math.round(file.size), modified: Math.round(file.mtimeMs) }
		}
		await writeFile(path.join(process.cwd(), 'assets', 'assetManifest.json'), JSON.stringify(modified))
	}
}

export const generateAssetManifest = (): PluginOption => {
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