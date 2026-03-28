import type { Stats } from 'node:fs'
import type { PathInfo } from './assetPipeline'
import { Formatter } from 'fracturedjsonjs'
import { AssetTransformer } from './assetPipeline'

export class GenerateAssetManifest extends AssetTransformer {
	on = ['add', 'remove', 'init'] as const
	modified = new Map<string, { size: number, modified: number }>()
	path = ['assets', 'assetManifest.json']
	folder = 'assets'

	convertPath(path: string) {
		return path.replace('assets\\', '/assets/').replace(/\\/g, '/')
	}

	async add(path: PathInfo, getStats: Promise<Stats>) {
		if (path.folder === 'assets') return
		const stats = await getStats
		this.modified.set(this.convertPath(path.path), {
			size: Math.round(stats.size),
			modified: Math.round(stats.mtimeMs),
		})
	}

	remove(path: PathInfo) {
		this.modified.delete(this.convertPath(path.path))
	}

	generate() {
		const formatter = new Formatter()
		formatter.Options.MaxPropNamePadding = 0
		const txt = JSON.stringify(
			Array.from(this.modified.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {}),
		)
		return formatter.Reformat(txt)
	}
}