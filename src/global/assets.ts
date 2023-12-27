import toneMapDefaultsrc from '@assets/_singles/tonemap-default.png'
import toneMapTreessrc from '@assets/_singles/tonemap-trees.png'
import { LinearSRGBColorSpace, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, MeshToonMaterial, NearestFilter, TextureLoader } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import type { stringCaster } from './assetLoaders'
import { getFileName, loadGLB, loadImage } from './assetLoaders'
import { asyncMapValues, entries, groupByObject, mapKeys, mapValues } from '@/utils/mapFunctions'
import type { LDTKMap } from '@/LDTKMap'

const loadToneMap = async (url: string) => {
	const texture = await new TextureLoader().loadAsync(url)
	texture.minFilter = texture.magFilter = NearestFilter
	return texture
}

type Glob = Record<string, () => Promise<any>>
type GlobEager<T = string> = Record<string, T>

const loadGLBAsToon = async <K extends string>(glob: Glob, src: string) => {
	const gradientMap = await loadToneMap(src)
	const glbs = await asyncMapValues(glob, async f => loadGLB(await f()))
	const toons = mapValues(glbs, (glb) => {
		glb.scene.traverse((node) => {
			if (node instanceof Mesh) {
				if (node.material instanceof MeshStandardMaterial && !(node.material instanceof MeshPhysicalMaterial)) {
					if (node.material.map) {
						node.material.map.colorSpace = LinearSRGBColorSpace
						node.material.map.minFilter = NearestFilter
						node.material.map.magFilter = NearestFilter
					}
					node.material = new MeshToonMaterial({

						color: node.material.color,
						gradientMap,
						map: node.material.map,

					})

					node.castShadow = true
					node.receiveShadow = false
				}
			}
		})
		return glb
	})
	return mapKeys(toons, getFileName as stringCaster<K>)
}

const skyboxLoader = async (glob: GlobEager) => {
	const loader = new TextureLoader()
	const entries = Object.entries(glob)
	return await Promise.all(['right', 'left', 'up', 'down', 'back', 'front'].map((side) => {
		const path = entries.find(([name]) => name.toLowerCase().includes(side))![1]
		return loader.loadAsync(path)
	}))
}
const cropsLoader = async <K extends string>(glob: Glob, src: string) => {
	const models = await loadGLBAsToon(glob, src)
	const grouped = groupByObject(models, key => key.split('_')[0].toLowerCase() as K)
	return mapValues(grouped, (group) => {
		let crop: GLTF | null = null
		const stages = new Array<GLTF>()
		for (const [key, model] of entries(group) as [string, GLTF][]) {
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
const levelLoader = async (glob: GlobEager) => {
	return JSON.parse(Object.values(glob)[0]) as LDTKMap
}
export const loadAssets = async () => ({
	characters: await loadGLBAsToon<models>(import.meta.glob('@assets/models/*.glb', { as: 'url' }), toneMapDefaultsrc),
	skybox: await skyboxLoader(import.meta.glob('@assets/skybox/*.png', { eager: true, import: 'default' })),
	trees: await loadGLBAsToon<trees>(import.meta.glob('@assets/trees/*.glb', { as: 'url' }), toneMapTreessrc),
	rocks: await loadGLBAsToon<rocks>(import.meta.glob('@assets/rocks/*.glb', { as: 'url' }), toneMapDefaultsrc),
	crops: await cropsLoader<'carrot' | 'mushroom' | 'beet'>(import.meta.glob('@assets/crops/*.glb', { as: 'url' }), toneMapDefaultsrc),
	items: await itemsLoader(import.meta.glob('@assets/items/*.png', { eager: true, import: 'default' })),
	fonts: await fontLoader(import.meta.glob('@assets/fonts/*.ttf', { eager: true, import: 'default' })),
	levels: await levelLoader(import.meta.glob('@assets/levels/*.ldtk', { eager: true, as: 'raw' })),
} as const)