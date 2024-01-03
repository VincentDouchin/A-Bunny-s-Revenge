import { exec, execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { writeFileSync } from 'node:fs'
import type { PluginOption } from 'vite'
import { glob } from 'glob'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { getFileName } from './generateAssetNamesPlugin'

const launchScript = async (filePath?: string) => {
	if (!filePath || ((filePath.includes('assets\\') && filePath.split('.').at(-1) === 'glb'))) {
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
		await Promise.all(Array.from(glbs.values()).map(async (path) => {
			// Read from URL.
			const glb = await io.read(path)
			const root = glb.getRoot()
			const animationNames = root.listAnimations().map(animation => animation.getName())
			if (animationNames.filter(x => !x.toLowerCase().includes('meta')).length) {
				animations += `
				\n
				${`${getFileName(path)}`} : ${animationNames.map(x => ` \`${x}\` `).join(` | `)}
				`
			}
		}))
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