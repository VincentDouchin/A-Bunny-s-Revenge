import { Mesh, MeshPhysicalMaterial, MeshStandardMaterial, MeshToonMaterial, TextureLoader } from 'three'
import type { stringCaster } from './assetLoaders'
import { getFileName, loadGLB } from './assetLoaders'
import { addKeys, asyncMap, asyncMapValues } from '@/utils/mapFunctions'

type Glob = Record<string, () => Promise<any>>
type defaultGlob = Record<string, { default: string }>
const loadGLBAsToon = async <K extends string>(glob: Glob) => {
	const promises = await asyncMapValues(glob, f => f())
	const urls = Object.values(promises)
	const keys = Object.keys(glob)
	const glbs = await asyncMap(urls, loadGLB)
	for (const glb of glbs) {
		glb.scene.traverse((node) => {
			if (node instanceof Mesh) {
				if (node.material instanceof MeshStandardMaterial && !(node.material instanceof MeshPhysicalMaterial)) {
					node.material = new MeshToonMaterial({ color: node.material.color, map: node.material.map })
					node.castShadow = true
					node.receiveShadow = false
				}
			}
		})
	}
	return addKeys(keys.map(getFileName as stringCaster<K>), glbs)
}

const skyboxLoader = async (glob: defaultGlob) => {
	const loader = new TextureLoader()
	const entries = Object.entries(glob)
	return await Promise.all(['right', 'left', 'up', 'down', 'back', 'front'].map((side) => {
		const path = entries.find(([name]) => name.toLowerCase().includes(side))![1].default
		return loader.loadAsync(path)
	}))
}
export const loadAssets = async () => ({
	characters: await loadGLBAsToon<models>(import.meta.glob('@assets/models/*.*', { as: 'url' })),
	skybox: await skyboxLoader(import.meta.glob('@assets/skybox/*.png', { eager: true })),
	trees: await loadGLBAsToon<trees>(import.meta.glob('@assets/trees/*.glb', { as: 'url' })),
} as const)