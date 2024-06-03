import type { Stats } from 'node:fs'
import { stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { glob } from 'glob'
import type { PluginOption } from 'vite'

export abstract class AssetTransformer {
	content = ''
	path: string[]
	extensions?: string[]
	abstract add(path: PathInfo, getStats: Promise<Stats>): Promise<void> | void
	abstract remove(path: PathInfo): Promise<void> | void
	abstract generate(): string | void
	async writeResult() {
		const newResult = this.generate()
		if (newResult && this.path) {
			if (newResult !== this.content) {
				this.content = newResult
				await writeFile(path.join(process.cwd(), ...this.path), this.content)
				console.log(`${this.constructor.name} regenerated`)
			} else {
				console.log(`${this.constructor.name} up to date`)
			}
		}
	}

	canRun(path: PathInfo) {
		if (this.extensions && path.extension) {
			return this.extensions.includes(path.extension)
		}
		return true
	}
}
export interface PathInfo {
	full: string
	path: string
	extension?: string
	name?: string
	folder?: string
}

export const assetPipeline = async (globPattern: string, transforms: (AssetTransformer)[]): Promise<PluginOption> => {
	const statsCache = new Map<string, Stats>()
	const getStats = async (path: string, stats?: Stats) => {
		if (stats) {
			statsCache.set(path, stats)
			return stats
		}
		const existingStats = statsCache.get(path)
		if (existingStats) {
			return Promise.resolve(existingStats)
		}
		else {
			const stats = await stat(path)
			statsCache.set(path, stats)
			return stats
		}
	}

	const transformPath = (filePath: string, fromGlob): PathInfo => {
		const full = fromGlob ? path.join(process.cwd(), filePath) : filePath
		filePath = filePath.replace(process.cwd(), '')
		const fullName = filePath.split('\\').at(-1)
		const name = fullName?.split('.')[0]
		const extension = fullName?.split('.')?.slice(1, fullName?.split('.').length)?.join('.')
		const folder = filePath.split('\\').at(-2)
		return { path: filePath, name, folder, extension, full }
	}
	const filePaths = await glob(globPattern)
	for (const transform of transforms) {
		for (const path of filePaths) {
			const pathParsed = transformPath(path, true)
			if (transform.canRun(pathParsed)) {
				await transform.add(pathParsed, getStats(path))
			}
		}
		await transform.writeResult()
	}

	return {
		name: 'watch-assets',
		apply: 'serve',

		configureServer(server) {
			server.watcher.on('add', async (path, stats) => {
				const pathParsed = transformPath(path, false)
				if (pathParsed.folder === 'assets' || !pathParsed.full.includes('assets')) return
				for (const transform of transforms) {
					if (transform.canRun(pathParsed)) {
						await transform.add(pathParsed, getStats(path, stats))
						await transform.writeResult()
					}
				}
			})
			server.watcher.on('unlink', async (path) => {
				const pathParsed = transformPath(path, false)
				if (pathParsed.folder === 'assets' || !pathParsed.full.includes('assets')) return
				for (const transform of transforms) {
					if (transform.canRun(pathParsed)) {
						await transform.remove(pathParsed)
						await transform.writeResult()
					}
				}
			})
		},

	}
}