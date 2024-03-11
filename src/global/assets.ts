import type { characters, fruit_trees, icons, models, music, particles, textures, trees, vegetation, weapons } from '@assets/assets'
import type { ColorRepresentation, Material, Side } from 'three'
import { CanvasTexture, DoubleSide, Mesh, MeshStandardMaterial, NearestFilter, RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three'

import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { Player } from 'tone'
import { getExtension, getFileName, loadGLB, loadImage, textureLoader, thumbnail } from './assetLoaders'
import type { crops, fruits } from './entity'
import { keys } from '@/constants/keys'
import { CharacterMaterial, GrassMaterial, ToonMaterial, TreeMaterial } from '@/shaders/GroundShader'
import { getScreenBuffer } from '@/utils/buffer'
import { asyncMapValues, entries, filterKeys, groupByObject, mapKeys, mapValues } from '@/utils/mapFunctions'

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

const loadGLBAsToon = (options?: { color?: ColorRepresentation, material?: (node: Mesh<any, MeshStandardMaterial>, map?: CanvasTexture) => Material, side?: Side, transparent?: true }) => async (glob: GlobEager) => {
	const loaded = await asyncMapValues(glob, async (path, key) => {
		const ext = getExtension(path)
		if (ext === 'glb') {
			return await loadGLB(path, key)
		} else {
			const texture = new CanvasTexture(await loadImage(path))
			texture.colorSpace = SRGBColorSpace
			texture.flipY = false
			return texture
		}
	})
	const { glb, webp } = groupByObject(loaded, key => getExtension(key)) as { glb: Record<string, GLTF>, webp: Record<string, CanvasTexture> }
	const toons = mapValues(glb, (glb, key) => {
		glb.scene.traverse((node) => {
			const map = webp ? entries(webp).find(([mapName]) => key.includes(getFileName(mapName)))?.[1] : undefined
			if (node instanceof Mesh) {
				if (node.material instanceof MeshStandardMaterial) {
					node.material = options?.material
						? options?.material(node, map)
						: new ToonMaterial({ color: options?.color ?? node.material.color, map: map ?? node.material.map })

					if (options?.side) node.material.side = options.side
					if (options?.transparent) node.material.transparent = true
				}
				node.castShadow = true
				node.receiveShadow = false
			}
		})
		return glb
	})
	return mapKeys(toons, getFileName)
}

const cropsColors: Record<string, number> = {
	LightOrange: 0xF3A833,
	DarkGreen: 0x5AB552,
	Green: 0x26854C,
	DarkRed: 0x6B2643,
	Red: 0xEC273F,
	Rock: 0xB0A7B8,
}
const overrideCropsColor = (node: Mesh<any, MeshStandardMaterial>) => {
	const color = node.material.name in cropsColors ? cropsColors[node.material.name] : node.material?.color
	return new ToonMaterial({ color })
}
const cropsLoader = async <K extends string>(glob: Glob) => {
	const models = await typeGlob<crops>(glob)(loadGLBAsToon({ material: overrideCropsColor }))
	const grouped = groupByObject(models, key => key.split('_')[0].toLowerCase() as K)
	return mapValues(grouped, (group) => {
		const stages = new Array<GLTF>()
		for (const [key, model] of entries(group) as [string, GLTF][]) {
			stages[Number(key.split('_')[1]) - 1] = model
		}
		return { stages }
	})
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

const levelImagesLoader = async (glob: GlobEager) => {
	return mapKeys(await asyncMapValues(glob, loadImage), getFileName)
}
const texturesLoader = async (glob: GlobEager) => {
	return mapKeys(await asyncMapValues(glob, async (src) => {
		const texture = await textureLoader.loadAsync(src)
		texture.magFilter = NearestFilter
		texture.minFilter = NearestFilter
		texture.wrapS = RepeatWrapping
		texture.wrapT = RepeatWrapping
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

const overrideRockColor = (node: Mesh<any, MeshStandardMaterial>, map?: CanvasTexture) => {
	let color: ColorRepresentation | undefined = node.material?.color
	if (node.material.name in cropsColors) {
		color = cropsColors[node.material.name]
	}

	return new ToonMaterial({ color, map: map ?? node.material?.map })
}
const loadVoices = async (glob: GlobEager) => {
	const sounds = mapValues(glob, src => new Player(src))
	return mapKeys(sounds, k => getFileName(k).split('_')[1])
}
const loadSounds = async (glob: GlobEager) => {
	const sounds = mapValues(glob, src => new Player(src))
	return mapKeys(sounds, getFileName)
}
const loadSteps = async (glob: GlobEager) => {
	return Object.values(mapValues(glob, src => new Player(src)))
}

const loadItems = async (glob: GlobEager) => {
	const { glb, png } = groupByObject(glob, getExtension)
	const [seedImages] = filterKeys(png, key => key.includes('_seeds'))
	const models = await asyncMapValues(glb, async (url, key) => {
		const model = await loadGLB(url, key)
		model.scene.traverse((node) => {
			if (node instanceof Mesh) {
				node.material = new ToonMaterial({ map: node.material.map, transparent: true, side: DoubleSide, color: node.material.color })
			}
		})
		return model.scene
	})
	const seed_bag = models[Object.keys(glb).find(k => k.includes('seeds'))!]
	const seed_bags = await asyncMapValues(seedImages, async (path) => {
		const text = new CanvasTexture(await loadImage(path))
		text.flipY = false
		text.colorSpace = SRGBColorSpace
		text.magFilter = NearestFilter
		text.minFilter = NearestFilter
		const model = seed_bag.clone()
		model.traverse((node) => {
			if (node instanceof Mesh) {
				node.material = new ToonMaterial({ map: text, transparent: true, side: DoubleSide })
			}
		})
		return model
	})
	const allModels = { ...models, ...seed_bags }
	const modelsAndthumbnails = mapValues(allModels, model => ({
		model,
		img: thumbnail.getCanvas(model).toDataURL(),
	}))
	return mapKeys(modelsAndthumbnails, k => getFileName(k as string))
}

const fruitTreeLoader = async (glob: GlobEager) => {
	const glbs = await loadGLBAsToon()(glob)
	const perFruit = groupByObject(glbs, key => key.split('_')[0].toLowerCase())
	return mapValues(perFruit, x => mapKeys(x, key => key.split('_')[1].toLowerCase())) as Record<fruits, Record<'Tree' | 'Harvested', GLTF>>
}

type AssetsLoaded<T extends Record<string, Promise<any> | any>> = { [K in keyof T]: Awaited<T[K]> }

export const loadAssets = async () => {
	const assets = {
		characters: typeGlob<characters>(import.meta.glob('@assets/characters/*.glb', { as: 'url', eager: true }))(loadGLBAsToon({ material: node => new CharacterMaterial({ map: node.material.map }) })),
		models: typeGlob<models>(import.meta.glob('@assets/models/*.*', { as: 'url', eager: true }))(loadGLBAsToon({ material: overrideRockColor })),
		trees: typeGlob<trees>(import.meta.glob('@assets/trees/*.*', { as: 'url', eager: true }))(loadGLBAsToon({
			material: (node) => {
				const mat = new TreeMaterial({ map: node.material.map, transparent: true })
				return mat
			},
		})),
		crops: cropsLoader<crops>(import.meta.glob('@assets/crops/*.glb', { as: 'url', eager: true })),
		particles: typeGlob<particles>(import.meta.glob('@assets/particles/*.png', { eager: true, import: 'default' }))(texturesLoader),
		textures: typeGlob<textures>(import.meta.glob('@assets/textures/*.png', { eager: true, import: 'default' }))(texturesLoader),
		fonts: fontLoader(import.meta.glob('@assets/fonts/*.ttf', { eager: true, import: 'default' })),
		levelImages: levelImagesLoader(import.meta.glob('@assets/levels/*.png', { eager: true, import: 'default' })),
		icons: typeGlobEager<icons>(import.meta.glob('@assets/icons/*.svg', { eager: true, import: 'default', as: 'raw' }))(iconsLoader),
		fruitTrees: typeGlob<fruit_trees>(import.meta.glob('@assets/fruit_trees/*.glb', { as: 'url', eager: true }))(fruitTreeLoader),
		buttons: buttonsLoader(import.meta.glob('@assets/buttons/*.*', { eager: true, import: 'default' })),
		voices: loadVoices(import.meta.glob('@assets/voices/*.ogg', { eager: true, import: 'default' })),
		steps: loadSteps(import.meta.glob('@assets/steps/*.*', { eager: true, import: 'default' })),
		items: loadItems(import.meta.glob('@assets/items/*.*', { as: 'url', eager: true })),
		music: typeGlob<music>(import.meta.glob('@assets/music/*.*', { eager: true, import: 'default' }))(loadSounds),
		weapons: typeGlob<weapons>(import.meta.glob('@assets/weapons/*.*', { as: 'url', eager: true }))(loadGLBAsToon({})),
		vegetation: typeGlob<vegetation>(import.meta.glob('@assets/vegetation/*.*', { as: 'url', eager: true }))(loadGLBAsToon({ material: (_node, canvas) => new GrassMaterial({ map: canvas }) })),
	} as const
	return await asyncMapValues(assets, async val => await val) as AssetsLoaded<typeof assets>
}