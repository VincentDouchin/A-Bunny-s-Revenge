import { rename } from 'node:fs/promises'
import type { Transform } from '@gltf-transform/core'
import { Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, draco, resample, textureCompress } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import type { PathInfo } from './assetPipeline'
import { AssetTransformer } from './assetPipeline'

export const getFileName = (path: string) => {
	return path.split(/[./\\]/g).at(-2) ?? ''
}
export const getFolderName = (path: string) => {
	return path.split(/[./]/g).at(-3) ?? ''
}

export const getExtension = (path: string) => {
	return path.split(/[./]/g).at(-1) ?? ''
}

const compressIfNecessary = (path): Transform => (document) => {
	const textures = document.getRoot().listTextures()
	const needCompress = textures.some((t) => {
		const size = t.getSize()
		return size?.some(s => s && s > 512)
	})
	if (needCompress) {
		textureCompress({
			targetFormat: 'webp',
			resize: [512, 512],
		})(document)
	} else {
		console.log(`not optimizing textures for ${path}`)
	}
}

export class OptimizeAssets extends AssetTransformer {
	extensions = ['glb']
	io: NodeIO | null = null
	async registerIO() {
		if (!this.io) {
			this.io = new NodeIO()
				.registerExtensions(ALL_EXTENSIONS)
				.registerDependencies({
					'draco3d.decoder': await draco3d.createDecoderModule(),
					'draco3d.encoder': await draco3d.createEncoderModule(),
				})
		}
		return this.io
	}

	async add(path: PathInfo) {
		if (path.name && !path.name.includes('-optimized')) {
			console.log('ok', this.constructor.name, this.extensions, path.name, path.extension)
			const io = await this.registerIO()
			const document = await io.read(path.full)
			document.setLogger(new Logger(Logger.Verbosity.SILENT))

			await document.transform(
				compressIfNecessary(path.path),
				resample(),
				dedup(),
				draco(),
			)
			await io.write(path.full.replace(path.name, `${path.name}-optimized`), document)
			await rename(path.full, path.full.replace('assets', 'rawAssets\\convertedAssets'))
		}
	}

	remove(_path: PathInfo) {

	}

	generate() {

	}
}