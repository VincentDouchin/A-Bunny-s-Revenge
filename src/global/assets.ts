import { Mesh, MeshToonMaterial, TextureLoader } from 'three'
import type { stringCaster } from './assetLoaders'
import { getFileName, loadGLB } from './assetLoaders'
import { addKeys, asyncMap } from '@/utils/mapFunctions'

type Glob = Record<string, () => Promise<unknown>>
type defaultGlob = Record<string, { default: string }>
const loadGLBAsToon = async <K extends string>(glob: Glob) => {
	const keys = Object.keys(glob)
	const glbs = await asyncMap(keys, loadGLB)
	for (const glb of glbs) {
		glb.scene.traverse((node) => {
			if (node instanceof Mesh) {
				node.geometry?.computeVertexNormals()
				if (node.material.constructor.name === 'MeshStandardMaterial') {
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
	characters: await loadGLBAsToon<models>(import.meta.glob('@assets/models/*.*')),
	skybox: await skyboxLoader(import.meta.glob('@assets/skybox/*.png', { eager: true })),
	trees: await loadGLBAsToon<trees>(import.meta.glob('@assets/trees/*.glb')),
} as const)