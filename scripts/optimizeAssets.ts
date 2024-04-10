import { subtle } from 'node:crypto'
import { access, mkdir, rename } from 'node:fs/promises'
import type { PluginOption } from 'vite'
import type { Document } from '@gltf-transform/core'
import { Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { dedup, draco, meshopt, partition, prune, resample, textureCompress } from '@gltf-transform/functions'
import { glob } from 'glob'

export const getFileName = (path: string) => {
	return path.split(/[./\\]/g).at(-2) ?? ''
}
export const getFolderName = (path: string) => {
	return path.split(/[./]/g).at(-3) ?? ''
}

export const getExtension = (path: string) => {
	return path.split(/[./]/g).at(-1) ?? ''
}

const launchScript = async (filePath?: string) => {
	if (typeof filePath === 'string' && (getExtension(filePath) !== 'glb')) {
		return
	}
	const files = filePath ? [filePath] : await glob('./assets/**/*.glb')

	for (const path of files) {
		if (path.includes('rawAssets') || path.includes('optimized')) continue
		console.log(`optimizing ${path}`)
		const io = new NodeIO()
			.registerExtensions(ALL_EXTENSIONS)
			.registerDependencies({
				'draco3d.decoder': await draco3d.createDecoderModule(),
				'draco3d.encoder': await draco3d.createEncoderModule(),
			})

		const document = (await io.read(path)).setLogger(new Logger(Logger.Verbosity.SILENT))
		await document.transform(
			textureCompress({
				targetFormat: 'webp',
				resize: [512, 512],
			}),
			resample(),
			dedup(),
			draco(),
		)
		// const newPath = path.replace('glb', `gltf`)
		await rename(path, path.replace('assets', 'rawAssets\\convertedAssets'))
		await io.write(path.replace(getFileName(path), `${getFileName(path)}-optimized`), document)
	}
}
export function optimizeAssets(): PluginOption {
	launchScript()
	return {
		name: 'watch-assets',
		apply: 'serve',
		configureServer(server) {
			server.watcher.on('add', launchScript)
		},

	}
}
