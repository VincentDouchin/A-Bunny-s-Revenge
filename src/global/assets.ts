import type { characters, items, models, particles, trees } from '@assets/assets'
import data from '@assets/levels/data.json'
import { get } from 'idb-keyval'
import type { ColorRepresentation, Material } from 'three'
import { CanvasTexture, Mesh, MeshStandardMaterial, NearestFilter, SRGBColorSpace, TextureLoader } from 'three'

import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import type { stringCaster } from './assetLoaders'
import { getExtension, getFileName, loadGLB, loadImage, textureLoader } from './assetLoaders'
import type { crops } from './entity'
import type { LDTKMap } from '@/LDTKMap'
import { keys } from '@/constants/keys'
import type { CollidersData, LevelData } from '@/debug/LevelEditor'
import { ToonMaterial } from '@/shaders/GroundShader'
import { getScreenBuffer } from '@/utils/buffer'
import { asyncMapValues, entries, groupByObject, mapKeys, mapValues } from '@/utils/mapFunctions'

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

const loadGLBAsToon = (options?: { src?: string, color?: ColorRepresentation, material?: (node: Mesh<any, MeshStandardMaterial>, map?: CanvasTexture) => Material }) => async (glob: Glob) => {
	const loaded = await asyncMapValues(glob, async (f) => {
		const path = await f()
		const ext = getExtension(path)
		if (ext === 'glb') {
			return await loadGLB(path)
		} else {
			const texture = new CanvasTexture(await loadImage(path))
			texture.colorSpace = SRGBColorSpace
			return texture
		}
	})
	const { glb, png } = groupByObject(loaded, key => getExtension(key)) as { glb: Record<string, GLTF>, png: Record<string, CanvasTexture> }
	const toons = mapValues(glb, (glb, key) => {
		glb.scene.traverse((node) => {
			const map = png ? entries(png).find(([mapName]) => key.includes(getFileName(mapName)))?.[1] : undefined

			if (node instanceof Mesh) {
				if (node.material instanceof MeshStandardMaterial) {
					node.material = options?.material
						? options?.material(node, map)
						: new ToonMaterial({ color: options?.color ?? node.material.color, map: map ?? node.material.map })
				}
				node.castShadow = true
				node.receiveShadow = false
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
const cropsColors: Record<string, number> = {
	LightOrange: 0xF3A833,
	DarkGreen: 0x5AB552,
	DarkRed: 0x6B2643,
	Red: 0xEC273F,
}
const overrideCropsColor = (node: Mesh<any, MeshStandardMaterial>) => {
	const color = node.material.name in cropsColors ? cropsColors[node.material.name] : node.material?.color

	return new ToonMaterial({ color })
}
const cropsLoader = async <K extends string>(glob: Glob) => {
	const models = await typeGlob<crops>(glob)(loadGLBAsToon({ material: overrideCropsColor }))
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

export const loadLevelData = async () => {
	const levelData = data.levelData as unknown as LevelData
	const colliderData = data.colliderData as unknown as CollidersData
	Object.assign(levelData, await get('levelData'))
	Object.assign(colliderData, await get('colliderData'))
	return { levelData, colliderData }
}

const overrideRockColor = (node: Mesh<any, MeshStandardMaterial>, map?: CanvasTexture) => {
	let color: ColorRepresentation | undefined = node.material?.color
	if (node.name.includes('Rock_')) {
		color = node.material.name === 'Green' ? 0x5AB552 : 0xB0A7B8
	}

	return new ToonMaterial({ color, map: map ?? node.material?.map })
}

export const loadAssets = async () => ({
	characters: await typeGlob<characters>(import.meta.glob('@assets/characters/*.glb', { as: 'url' }))(loadGLBAsToon()),
	models: await typeGlob<models>(import.meta.glob('@assets/models/*.*', { as: 'url' }))(loadGLBAsToon({ material: overrideRockColor })),
	skybox: await skyboxLoader(import.meta.glob('@assets/skybox/*.png', { eager: true, import: 'default' })),
	trees: await typeGlob<trees>(import.meta.glob('@assets/trees/*.*', { as: 'url' }))(loadGLBAsToon()),
	grass: await typeGlob(import.meta.glob('@assets/grass/*.glb', { as: 'url' }))(loadGLBAsToon()),
	crops: await cropsLoader<crops>(import.meta.glob('@assets/crops/*.glb', { as: 'url' })),
	items: await typeGlob<items>(import.meta.glob('@assets/items/*.png', { eager: true, import: 'default' }))(itemsLoader),
	particles: await typeGlob<particles>(import.meta.glob('@assets/particles/*.png', { eager: true, import: 'default' }))(texturesLoader),
	fonts: await fontLoader(import.meta.glob('@assets/fonts/*.ttf', { eager: true, import: 'default' })),
	levels: await levelLoader(import.meta.glob('@assets/levels/*.ldtk', { eager: true, as: 'raw' })),
	icons: await typeGlobEager(import.meta.glob('@assets/icons/*.svg', { eager: true, import: 'default', as: 'raw' }))(iconsLoader),
	buttons: await buttonsLoader(import.meta.glob('@assets/buttons/*.*', { eager: true, import: 'default' })),
} as const)