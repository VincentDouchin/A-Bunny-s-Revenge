import toneMapDefaultsrc from '@assets/_singles/tonemap-default.png'
import toneMapTreessrc from '@assets/_singles/tonemap-trees.png'
import type { ColorRepresentation, Material } from 'three'
import { Mesh, MeshStandardMaterial, NearestFilter, TextureLoader } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import type { stringCaster } from './assetLoaders'
import { getFileName, loadGLB, loadImage } from './assetLoaders'
import { asyncMapValues, entries, groupByObject, mapKeys, mapValues } from '@/utils/mapFunctions'
import { CustomToonMaterial } from '@/shaders/CustomToonMaterial'
import type { LDTKMap } from '@/LDTKMap'

type Glob = Record<string, () => Promise<any>>
type GlobEager<T = string> = Record<string, T>

const loadToneMap = async (url: string) => {
	const texture = await new TextureLoader().loadAsync(url)
	texture.minFilter = texture.magFilter = NearestFilter
	return texture
}

const typeGlob = <K extends string>(glob: Record<string, any>) => async <F extends (glob: Record<string, any>) => Promise<Record<string, any>>>(fn: F) => {
	return await fn(glob) as Record<K, Awaited<ReturnType<F>>[string]>
}

const loadGLBAsToon = (options?: { src?: string, color?: ColorRepresentation, material?: (node: Mesh) => Material }) => async (glob: Glob) => {
	const gradientMap = await loadToneMap(options?.src ?? toneMapDefaultsrc)
	const glbs = await asyncMapValues(glob, async f => loadGLB(await f()))
	const toons = mapValues(glbs, (glb) => {
		glb.scene.traverse((node) => {
			if (node instanceof Mesh) {
				if (node.material instanceof MeshStandardMaterial) {
					node.material = options?.material
						? options?.material(node)
						: new CustomToonMaterial({ color: options?.color ?? node.material.color, gradientMap, map: node.material.map })
					node.castShadow = true
					node.receiveShadow = false
				}
			}
		})
		return glb
	})
	return mapKeys(toons, getFileName)
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
	const models = await typeGlob<crops>(glob)(loadGLBAsToon({ src }))
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
	characters: await typeGlob<characters>(import.meta.glob('@assets/characters/*.glb', { as: 'url' }))(loadGLBAsToon()),
	// characters: await loadGLBAsToon<characters>(import.meta.glob('@assets/characters/*.glb', { as: 'url' })),
	kitchen: await typeGlob<kitchen>(import.meta.glob('@assets/kitchen/*.glb', { as: 'url' }))(loadGLBAsToon()),
	skybox: await skyboxLoader(import.meta.glob('@assets/skybox/*.png', { eager: true, import: 'default' })),
	trees: await typeGlob<trees>(import.meta.glob('@assets/trees/*.glb', { as: 'url' }))(loadGLBAsToon({ src: toneMapTreessrc })),
	rocks: await typeGlob(import.meta.glob('@assets/rocks/*.glb', { as: 'url' }))(loadGLBAsToon()),
	grass: await typeGlob(import.meta.glob('@assets/grass/*.glb', { as: 'url' }))(loadGLBAsToon({ color: 0x26854C })),
	crops: await cropsLoader<'carrot' | 'mushroom' | 'beet'>(import.meta.glob('@assets/crops/*.glb', { as: 'url' }), toneMapDefaultsrc),
	items: await typeGlob<items>(import.meta.glob('@assets/items/*.png', { eager: true, import: 'default' }))(itemsLoader),
	fonts: await fontLoader(import.meta.glob('@assets/fonts/*.ttf', { eager: true, import: 'default' })),
	levels: await levelLoader(import.meta.glob('@assets/levels/*.ldtk', { eager: true, as: 'raw' })),
} as const)