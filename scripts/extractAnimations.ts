import { exec } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { glob } from 'glob'
import type { PluginOption } from 'vite'
import { getFileName } from './generateAssetNamesPlugin'

const launchScript = async (filePath?: string) => {
	if (!filePath || ((filePath.includes('assets\\') && filePath.split('.').at(-1) === 'glb'))) {
		console.log('extracting animations')
		let animations = `
			interface Animations {
		`
		const glbs = await glob('./assets/**/*.glb')
		const io = new NodeIO()
			.registerExtensions(ALL_EXTENSIONS)
			.registerDependencies({
				'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
				'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
			})
		for (const path of Array.from(glbs.values()).sort((a, b) => a.localeCompare(b))) {
			try {
				const glb = await io.read(path)
				const root = glb.getRoot()
				const animationNames = root.listAnimations().map(animation => animation.getName())
				if (animationNames.filter(x => !x.toLowerCase().includes('meta')).length) {
					animations += `
				\n
				'${getFileName(path).replace('-optimized', '')}' : ${animationNames.map(x => ` '${x}' `).join(` | `)}
				`
				}
			} catch (e) {
				console.log('couldn\'t open path to extract animations')
			}
		}
		await writeFileSync('./assets/animations.d.ts', `${animations}}`)
		exec('eslint assets/animations.d.ts --fix')
	}
}

export const extractAnimations = (): PluginOption => {
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