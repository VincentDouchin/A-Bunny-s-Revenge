import type { characters, fruit_trees, icons, items, mainMenuAssets, models, particles, textures, trees, vegetation, weapons } from '@assets/assets'
import type { ColorRepresentation, Material, Side } from 'three'
import { Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NearestFilter, RepeatWrapping, SRGBColorSpace, Texture } from 'three'

import assetManifest from '@assets/assetManifest.json'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { Player } from 'tone'
import type { Constructor } from 'type-fest'
import { getExtension, getFileName, loadAudio, loadGLB, loadImage, loaderProgress, textureLoader, thumbnail } from './assetLoaders'
import type { crops, fruits } from './entity'
import { asyncMapValues, entries, groupByObject, mapKeys, mapValues } from '@/utils/mapFunctions'
import { getScreenBuffer } from '@/utils/buffer'
import { CharacterMaterial, GrassMaterial, ToonMaterial, TreeMaterial } from '@/shaders/materials'
import { keys } from '@/constants/keys'

type Glob = Record<string, () => Promise<any>>
type GlobEager<T = string> = Record<string, T>

const typeGlob = <K extends string>(glob: Record<string, any>) => async <F extends (glob: Record<string, any>) => Promise<Record<string, any>>>(fn: F) => {
	return await fn(glob) as Record<K, Awaited<ReturnType<F>>[string]>
}
const typeGlobEager = <K extends string>(glob: GlobEager) => <F extends (glob: GlobEager) => Record<string, any>>(fn: F) => {
	return fn(glob) as Record<K, ReturnType<F>[string]>
}

const loadGLBAsToon = (
	loader: (key: string) => void,
	options?: {
		color?: ColorRepresentation
		material?: Constructor<Material>
		side?: Side
		transparent?: true
		shadow?: true
	},
) => async (glob: GlobEager) => {
	const loaded = await asyncMapValues(glob, async (path, key) => {
		const glb = await loadGLB(path, key)
		loader(key)
		return glb
	})
	const toons = mapValues(loaded, (glb) => {
		glb.scene.traverse((node) => {
			if (node instanceof Mesh) {
				if (node.material instanceof MeshStandardMaterial || node.material instanceof MeshPhysicalMaterial) {
					const Mat = options?.material ?? ToonMaterial
					node.material = new Mat({
						color: (options && 'color' in options) ? options.color : node.material.color,
						map: node.material.map,
						transparent: options?.transparent ?? node.material.transparent,
					})
					if (node.material.map instanceof Texture) {
						node.material.map.colorSpace = SRGBColorSpace
					}
				}
				node.castShadow = options?.shadow ?? false
				node.receiveShadow = false
			}
		})
		return glb
	})
	return mapKeys(toons, k => getFileName(k.replace('-optimized', '')))
}

const cropsLoader = <K extends string>(loader: (key: string) => void) => async (glob: Glob) => {
	const models = await typeGlob<crops>(glob)(loadGLBAsToon(loader, { shadow: true }))
	const grouped = groupByObject(models, key => key.split('_')[0].toLowerCase() as K)
	return mapValues(grouped, (group) => {
		const stages = new Array<GLTF>()
		for (const [key, model] of entries(group) as [string, GLTF][]) {
			stages[Number(key.split('_')[1]) - 1] = model
		}
		return { stages }
	})
}

const fontLoader = (loader: (key: string) => void) => async (glob: GlobEager) => {
	const fonts = mapKeys(glob, getFileName)
	for (const [key, m] of entries(fonts)) {
		const [name, weight] = key.split('-')
		const font = new FontFace(name, `url(${m})`, { weight: weight ?? 'normal' })
		await font.load()
		loader(m)
		document.fonts.add(font)
	}
}

const texturesLoader = (loader: (key: string) => void) => async (glob: GlobEager) => {
	return mapKeys(await asyncMapValues(glob, async (src) => {
		const texture = await textureLoader.loadAsync(src)
		loader(src)
		texture.magFilter = NearestFilter
		texture.minFilter = NearestFilter
		texture.wrapS = RepeatWrapping
		texture.wrapT = RepeatWrapping
		return texture
	}), getFileName)
}
const iconsLoader = (loader: (key: string) => void) => (glob: GlobEager) => {
	Object.keys(glob).forEach(loader)
	return mapKeys(glob, getFileName)
}

interface PackedJSON {
	frames: Record<string, { frame: { x: number, y: number, w: number, h: number } }>
}

const buttonsLoader = (loader: (key: string) => void) => async (glob: Record<string, any>) => {
	const { json, png } = mapKeys(glob, getExtension)
	const packed = json as PackedJSON
	const img = await loadImage(png)
	loader(png)
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

const loadVoices = (loader: (key: string) => void) => async (glob: GlobEager) => {
	const sounds = await asyncMapValues(glob, async (src, key) => {
		const audio = await loadAudio(src, key)
		const player = new Player(audio)
		loader(src)
		return player
	})
	return mapKeys(sounds, k => getFileName(k).split('_')[1])
}
const loadSounds = (loader: (key: string) => void) => async (glob: GlobEager) => {
	const sounds = await asyncMapValues(glob, async (src, key) => {
		const audio = await loadAudio(src, key)
		const player = new Player(audio)
		loader(src)
		return player
	})
	return mapKeys(sounds, getFileName)
}

const loadItems = (loader: (key: string) => void) => async (glob: GlobEager) => {
	const models = await loadGLBAsToon(loader)(glob)
	const modelsAndthumbnails = mapValues(models, model => ({
		model: model.scene,
		img: thumbnail.getCanvas(model.scene).toDataURL(),
	}))

	return modelsAndthumbnails
}

const fruitTreeLoader = (loader: (key: string) => void) => async (glob: GlobEager) => {
	const glbs = await loadGLBAsToon(loader)(glob)
	const perFruit = groupByObject(glbs, key => key.split('_')[0].toLowerCase())
	return mapValues(perFruit, x => mapKeys(x, key => key.split('_')[1].toLowerCase())) as Record<fruits, Record<'Tree' | 'Harvested', GLTF>>
}

const loadMainMenuAssets = async (glob: GlobEager) => {
	return mapKeys(await asyncMapValues(glob, async (src, key) => {
		const glb = await loadGLB(src, key)
		glb.scene.traverse((node) => {
			if (node instanceof Mesh) {
				node.material = new MeshBasicMaterial({ map: node.material.map, color: node.material.color })
			}
		})
		return glb
	}), k => getFileName(k.replace('-optimized', '')))
}

type AssetsLoaded<T extends Record<string, Promise<any> | any>> = { [K in keyof T]: Awaited<T[K]> }
export const loadAssets = async () => {
	const { loader, clear } = loaderProgress(assetManifest)
	const assets = {
		// ! models
		characters: typeGlob<characters>(import.meta.glob('@assets/characters/*.glb', { as: 'url', eager: true }))(loadGLBAsToon(loader, { material: CharacterMaterial, shadow: true })),

		models: typeGlob<models>(import.meta.glob('@assets/models/*.glb', { as: 'url', eager: true }))(loadGLBAsToon(loader, { shadow: true })),

		trees: typeGlob<trees>(import.meta.glob('@assets/trees/*.glb', { as: 'url', eager: true }))(loadGLBAsToon(loader, { material: TreeMaterial, shadow: true })),

		crops: cropsLoader<crops>(loader)(import.meta.glob('@assets/crops/*.glb', { as: 'url', eager: true })),

		weapons: typeGlob<weapons>(import.meta.glob('@assets/weapons/*.*', { as: 'url', eager: true }))(loadGLBAsToon(loader, { shadow: true })),

		vegetation: typeGlob<vegetation>(import.meta.glob('@assets/vegetation/*.glb', { as: 'url', eager: true }))(loadGLBAsToon(loader, { material: GrassMaterial, shadow: true })),

		mainMenuAssets: typeGlob<mainMenuAssets>(import.meta.glob('@assets/mainMenuAssets/*.glb', { as: 'url', eager: true }))(loadMainMenuAssets),

		fruitTrees: typeGlob<fruit_trees>(import.meta.glob('@assets/fruit_trees/*.glb', { as: 'url', eager: true }))(fruitTreeLoader(loader)),

		items: typeGlob<items>(import.meta.glob('@assets/items/*.*', { as: 'url', eager: true }))(loadItems(loader)),

		// ! textures
		particles: typeGlob<particles>(import.meta.glob('@assets/particles/*.webp', { eager: true, import: 'default' }))(texturesLoader(loader)),

		textures: typeGlob<textures>(import.meta.glob('@assets/textures/*.webp', { eager: true, import: 'default' }))(texturesLoader(loader)),

		icons: typeGlobEager<icons>(import.meta.glob('@assets/icons/*.svg', { eager: true, import: 'default', as: 'raw' }))(iconsLoader(loader)),

		buttons: buttonsLoader(loader)(import.meta.glob('@assets/buttons/*.*', { eager: true, import: 'default' })),

		// ! audio
		voices: loadVoices(loader)(import.meta.glob('@assets/voices/*.ogg', { eager: true, import: 'default' })),

		steps: loadSounds(loader)(import.meta.glob('@assets/steps/*.ogg', { eager: true, import: 'default' })),

		soundEffects: loadSounds(loader)(import.meta.glob('@assets/soundEffects/*.ogg', { eager: true, import: 'default' })),

		// ! others
		fonts: fontLoader(loader)(import.meta.glob('@assets/fonts/*.*', { eager: true, import: 'default' })),

	} as const
	const assetsLoaded = await asyncMapValues(assets, async val => await val) as AssetsLoaded<typeof assets>
	clear()
	return assetsLoaded
}