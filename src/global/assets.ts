import toneMapsrc from '@assets/_singles/tonemap.png'
import { Mesh, MeshPhysicalMaterial, MeshStandardMaterial, MeshToonMaterial, NearestFilter, TextureLoader } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import type { stringCaster } from './assetLoaders'
import { getFileName, loadGLB, loadImage } from './assetLoaders'
import { addKeys, asyncMap, asyncMapValues, entries, groupByObject, mapKeys, mapValues } from '@/utils/mapFunctions'

const loadToneMap = async () => {
	const texture = await new TextureLoader().loadAsync(toneMapsrc)
	texture.minFilter = texture.magFilter = NearestFilter
	return texture
}

type Glob = Record<string, () => Promise<any>>
type GlobEager<T = string> = Record<string, T>

const loadGLBAsToon = async <K extends string>(glob: Glob) => {
	const gradientMap = await loadToneMap()
	const promises = await asyncMapValues(glob, f => f())
	const urls = Object.values(promises)
	const keys = Object.keys(glob)
	const glbs = await asyncMap(urls, loadGLB)
	for (let i = 0; i < glbs.length; i++) {
		const glb = glbs[i]
		glb.scene.traverse((node) => {
			if (node instanceof Mesh) {
				if (node.material instanceof MeshStandardMaterial && !(node.material instanceof MeshPhysicalMaterial)) {
					node.material = new MeshToonMaterial({
						color: node.material.color,
						gradientMap,
					})
					node.castShadow = true
					node.receiveShadow = false
				}
			}
		})
	}
	return addKeys(keys.map(getFileName as stringCaster<K>), glbs)
}

const skyboxLoader = async (glob: GlobEager) => {
	const loader = new TextureLoader()
	const entries = Object.entries(glob)
	return await Promise.all(['right', 'left', 'up', 'down', 'back', 'front'].map((side) => {
		const path = entries.find(([name]) => name.toLowerCase().includes(side))![1]
		return loader.loadAsync(path)
	}))
}
const cropsLoader = async (glob: Glob) => {
	const models = await loadGLBAsToon(glob)
	const grouped = groupByObject(models, key => key.split('_')[0].toLowerCase() as 'carrot')
	return mapValues(grouped, (group) => {
		let crop: GLTF | null = null
		const stages = new Array<GLTF>()
		for (const [key, model] of entries(group)) {
			if (key.toLowerCase().includes('crop')) {
				crop = model
			} else {
				stages[Number(key.split('_')[1]) - 1] = model
			}
		}
		return { crop: crop!, stages }
	})
}
const itemsLoader = async (glob: GlobEager) => {
	const img = await asyncMapValues(glob, loadImage)
	return mapKeys(img, getFileName as stringCaster<items>)
}
const fontLoader = async (glob: Glob) => {
	const fonts = mapKeys(glob, getFileName)
	for (const [key, m] of entries(fonts)) {
		const [name, weight] = key.split('-')
		const font = new FontFace(name, `url(${m})`, { weight: weight ?? 'normal' })
		await font.load()
		document.fonts.add(font)
	}
}
export const loadAssets = async () => ({
	characters: await loadGLBAsToon<models>(import.meta.glob('@assets/models/*.*', { as: 'url' })),
	skybox: await skyboxLoader(import.meta.glob('@assets/skybox/*.png', { eager: true, import: 'default' })),
	trees: await loadGLBAsToon<trees>(import.meta.glob('@assets/trees/*.glb', { as: 'url' })),
	rocks: await loadGLBAsToon<rocks>(import.meta.glob('@assets/rocks/*.glb', { as: 'url' })),
	crops: await cropsLoader(import.meta.glob('@assets/crops/*.glb', { as: 'url' })),
	items: await itemsLoader(import.meta.glob('@assets/items/*.png', { eager: true, import: 'default' })),
	fonts: await fontLoader(import.meta.glob('@assets/fonts/*.ttf', { eager: true, import: 'default' })),
} as const)