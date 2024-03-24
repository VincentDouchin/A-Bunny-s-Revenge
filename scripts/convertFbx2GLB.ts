import { execSync } from 'node:child_process'
import { unlink } from 'node:fs/promises'
import { glob } from 'glob'
import type { PluginOption } from 'vite'
import { getFileName } from './generateAssetNamesPlugin'

const launchScript = async (filePath?: string) => {
	if (!filePath || ((filePath.includes('assets\\') && filePath.split('.').at(-1) === 'fbx'))) {
		const fbx = await glob('./assets/**/*.fbx')
		for (const path of fbx) {
			execSync(`FBX2GLB.exe --binary ${path} --output ${path.replace('fbx', 'glb')}`)
			unlink(path)
			console.log(`converted ${getFileName(path)} to glb`)
		}
	}
}

export const autoConvertFBXtoGLB = (): PluginOption => {
	launchScript()
	return {
		name: 'watch-assets',
		apply: 'serve',
		configureServer(server) {
			server.watcher.on('add', launchScript)
		},

	}
}