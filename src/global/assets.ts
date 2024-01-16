import toneMapDefaultsrc from '@assets/_singles/tonemap-default.png'
import type { characters, items, models, particles, trees } from '@assets/assets'
import type { ColorRepresentation, Material } from 'three'
import { Mesh, MeshStandardMaterial, NearestFilter, TextureLoader } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import type { stringCaster } from './assetLoaders'
import { getExtension, getFileName, loadGLB, loadImage, textureLoader } from './assetLoaders'
import type { crops } from './entity'
import { asyncMapValues, entries, groupByObject, mapKeys, mapValues } from '@/utils/mapFunctions'
import { getScreenBuffer } from '@/utils/buffer'
import { GroundShader } from '@/shaders/GroundShader'
import { keys } from '@/constants/keys'
import type { LDTKMap } from '@/LDTKMap'

type Glob = Record<string, () => Promise<any>>
type GlobEager<T = string> = Record<string, T>

export const loadToneMap = async (url: string) => {
	const texture = await new TextureLoader().loadAsync(url)
	texture.minFilter = texture.magFilter = NearestFilter
	return texture
}

const typeGlob = <K extends string>(glob: Record<string, any>) => async <F extends (glob: Record<string, any>) => Promise<Record<string, any>>>(fn: F) => {
	return await fn(glob) as Record<K, Awaited<ReturnType<F>>[string]>
}
const typeGlobEager = <K extends string>(glob: GlobEager) => <F extends (glob: GlobEager) => Record<string, any>>(fn: F) => {
	return fn(glob) as Record<K, ReturnType<F>[string]>
}

const loadGLBAsToon = (options?: { src?: string, color?: ColorRepresentation, material?: (node: Mesh) => Material }) => async (glob: Glob) => {
	const glbs = await asyncMapValues(glob, async f => loadGLB(await f()))
	const toons = mapValues(glbs, (glb) => {
		glb.scene.traverse((node) => {
			if (node instanceof Mesh) {
				if (node.material instanceof MeshStandardMaterial) {
					node.material = options?.material
						? options?.material(node)
						: new GroundShader({ color: options?.color ?? node.material.color, map: node.material.map })
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
const texturesLoader = async (glob: GlobEager) => {
	return mapKeys(await asyncMapValues(glob, async (src) => {
		const texture = await textureLoader.loadAsync(src)
		texture.magFilter = NearestFilter
		texture.minFilter = NearestFilter
		return texture
	}), getFileName)
}
const iconsLoader = (glob: GlobEager) => {
	return mapKeys(glob, getFileName)
}

interface PackedJSON {
	frames: Record<string, { frame: { x: number, y: number, w: number, h: number } }>
}

const buttonsLoader = async (glob: Record<string, any>) => {
	const { json, png } = mapKeys(glob, getExtension)
	const packed = json as PackedJSON
	const img = await loadImage(png)
	const getImg = (frame: { x: number, y: number, w: number, h: number }) => {
		const buffer = getScreenBuffer(frame.w, frame.h)
		buffer.drawImage(img, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h)
		return buffer.canvas
	}
	const frames = mapKeys(packed.frames, val => val.replace('folder/', ''))

	return (key: string) => {
		return getImg(frames[keys[key]].frame)
	}
}

export const loadAssets = async () => ({
	characters: await typeGlob<characters>(import.meta.glob('@assets/characters/*.glb', { as: 'url' }))(loadGLBAsToon()),
	// characters: await loadGLBAsToon<characters>(import.meta.glob('@assets/characters/*.glb', { as: 'url' })),
	models: await typeGlob<models>(import.meta.glob('@assets/models/*.glb', { as: 'url' }))(loadGLBAsToon()),
	skybox: await skyboxLoader(import.meta.glob('@assets/skybox/*.png', { eager: true, import: 'default' })),
	trees: await typeGlob<trees>(import.meta.glob('@assets/trees/*.glb', { as: 'url' }))(loadGLBAsToon()),
	rocks: await typeGlob(import.meta.glob('@assets/rocks/*.glb', { as: 'url' }))(loadGLBAsToon()),
	grass: await typeGlob(import.meta.glob('@assets/grass/*.glb', { as: 'url' }))(loadGLBAsToon({ color: 0x26854C })),
	crops: await cropsLoader<'carrot' | 'mushroom' | 'beet'>(import.meta.glob('@assets/crops/*.glb', { as: 'url' }), toneMapDefaultsrc),
	items: await typeGlob<items>(import.meta.glob('@assets/items/*.png', { eager: true, import: 'default' }))(itemsLoader),
	particles: await typeGlob<particles>(import.meta.glob('@assets/particles/*.png', { eager: true, import: 'default' }))(texturesLoader),
	fonts: await fontLoader(import.meta.glob('@assets/fonts/*.ttf', { eager: true, import: 'default' })),
	levels: await levelLoader(import.meta.glob('@assets/levels/*.ldtk', { eager: true, as: 'raw' })),
	icons: await typeGlobEager(import.meta.glob('@assets/icons/*.svg', { eager: true, import: 'default', as: 'raw' }))(iconsLoader),
	buttons: await buttonsLoader(import.meta.glob('@assets/buttons/*.*', { eager: true, import: 'default' })),
} as const)