import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import type { PathInfo } from './assetPipeline'
import { AssetTransformer } from './assetPipeline'

export class ExtractAnimations extends AssetTransformer {
	path = ['assets', 'animations.d.ts']
	extensions = ['glb']
	animations = new Map<string, string[]>()
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
		const io = await this.registerIO()
		try {
			const glb = await io.read(path.full)
			const root = glb.getRoot()
			const animationNames = root
				.listAnimations()
				.map(animation => animation.getName())
				.filter(x => !x.toLowerCase().includes('meta'))
				.sort((a, b) => a.localeCompare(b))
			if (path.name) {
				this.animations.set(path.name.replace('-optimized', ''), animationNames)
			}
		} catch (e) {
			console.error(e)
		}
	}

	remove(path: PathInfo): void | Promise<void> {
		if (path.name) {
			this.animations.delete(path.name.replace('-optimized', ''))
		}
	}

	generate() {
		const sortedAnimations = Array.from(this.animations.entries()).sort(([a], [b]) => a.localeCompare(b))
		let result = `
interface Animations {`
		for (const [name, animations] of sortedAnimations) {
			if (animations.length > 0) {
				result += `\n
'${name}' : ${animations.map(x => `'${x}'`).join(` | `)}`
			}
		}
		result += `
}`
		return result
	}
}