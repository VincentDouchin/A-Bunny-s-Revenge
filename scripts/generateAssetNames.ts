import type { PathInfo } from './assetPipeline'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { AssetTransformer } from './assetPipeline'

export class GenerateAssetNames extends AssetTransformer {
	folders: Record<string, Set<string>> = {}
	path = ['assets', 'assets.ts']
	io: NodeIO | null = null
	async add(path: PathInfo) {
		const fileName = path.name?.replace('-optimized', '')
		console.log(path.folder)
		if (path.folder && fileName && path.folder !== 'assets') {
			this.folders[path.folder] ??= new Set()
			if (fileName.startsWith('$')) {
				const io = await this.registerIO()
				const glb = await io.read(path.full)
				const scene = glb.getRoot().getDefaultScene()
				for (const child of scene?.listChildren() ?? []) {
					this.folders[path.folder].add(child.getName())
				}
			} else {
				this.folders[path.folder].add(fileName)
			}
		}
	}

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

	remove(path: PathInfo) {
		if (path.name && path.folder) {
			const folder = this.folders[path.folder]
			const name = path.name?.replace('-optimized', '')
			name && folder.has(name) && folder.delete(name)
		}
	}

	generate() {
		const sortedFolders: [string, string[]][] = Object.entries(this.folders)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([folder, files]) => {
				return [folder, [...files].sort((a, b) => a.localeCompare(b))]
			})
		let result = ''
		for (const [folder, files] of sortedFolders) {
			if (files.length > 0) {
				result += `export type ${folder} = ${[...files].map(x => `\'${x}'`).join(` | `)}\n`
			}
		}
		return result
	}
}