import { Mesh, MeshStandardMaterial, MeshToonMaterial } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { getFileName, loadGLB } from './assetLoaders'
import { addKeys, asyncMap } from '@/utils/mapFunctions'

type Glob = Record<string, () => Promise<unknown>>
const characterLoader = async (glob: Glob) => {
	const keys = Object.keys(glob)
	const glbs = await asyncMap(keys, loadGLB)
	for (const glb of glbs) {
		glb.scene.traverse((node) => {
			if (node instanceof Mesh) {
				node.material = new MeshStandardMaterial({ map: node.material.map })
				// node.material = new MeshToonMaterial({ map: node.material.map })
				node.castShadow = true
				node.receiveShadow = true
			}
		})
	}
	return addKeys(keys.map(getFileName), glbs) as Record<models, GLTF>
}

export const loadAssets = async () => ({
	characters: await characterLoader(import.meta.glob('@assets/models/*.*')),
} as const)