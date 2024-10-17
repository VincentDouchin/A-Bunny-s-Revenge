import type { PathInfo } from './assetPipeline'
import { execSync } from 'node:child_process'
import { rename } from 'node:fs/promises'
import { AssetTransformer } from './assetPipeline'

export class ConverFBXToGLB extends AssetTransformer {
	extensions = ['fbx']
	async add(path: PathInfo) {
		execSync(`FBX2GLB.exe --binary ${path.full} --output ${path.full.replace('fbx', 'glb')}`)
		await rename(path.full, path.full.replace('assets', 'rawAssets\\convertedAssets'))
	}

	remove() {}

	generate() {}
}