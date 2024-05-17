import type { PathInfo } from './assetPipeline'
import { AssetTransformer } from './assetPipeline'

export class GenerateAssetNames extends AssetTransformer {
	folders: Record<string, Set<string>> = {}
	path = ['assets', 'assets.ts']
	async add(path: PathInfo) {
		const fileName = path.name?.replace('-optimized', '')
		if (path.folder && fileName && path.folder !== 'assets') {
			this.folders[path.folder] ??= new Set()
			this.folders[path.folder].add(fileName)
		}
	}

	remove(path: PathInfo) {
		if (path.name && path.folder) {
			const folder = this.folders[path.folder]
			const name = path.name?.replace('-optimized', '')
			name && folder.delete(name)
		}
	}

	generate() {
		const sortedFolders = Object.entries(this.folders)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([folder, files]) => {
				return [folder, [...files].sort((a, b) => a.localeCompare(b))]
			})
		let result = ''
		for (const [folder, files] of sortedFolders) {
			result += `export type ${folder} = ${[...files].map(x => `\'${x}'`).join(` | `)}\n`
		}
		return result
	}
}