import type { village } from '@assets/assets'
import type { ColorRepresentation, Material, Object3D, Side, TextureFilter } from 'three'

import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import type { Constructor } from 'type-fest'
import type { ThumbnailRenderer } from '@/lib/thumbnailRenderer'
import type { StaticAssetPath } from '@/static-assets'
import { Howl } from 'howler'
import { DoubleSide, FrontSide, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NearestFilter, RepeatWrapping, SRGBColorSpace, Texture } from 'three'
import { getAssetPathsLoader, loadAudio, loadGLB, loadImage, textureLoader } from '@/global/assetLoaders'
import { CharacterMaterial, GardenPlotMaterial, GrassMaterial, ToonMaterial, TreeMaterial, VineGateMaterial } from '@/shaders/materials'
import { getScreenBuffer } from '@/utils/buffer'
import { asyncMap, asyncMapValues, entries, mapKeys, mapValues, objectKeys, objectValues } from '@/utils/mapFunctions'

type GlobEager<T = string> = Record<string, T>

type getToonOptions = (key: string, materialName: string, name: string, node: Mesh) => ({
	color?: ColorRepresentation
	material?: Constructor<Material>
	side?: Side
	transparent?: boolean
	shadow?: boolean
	filter?: TextureFilter
	depthWrite?: boolean
	isolate?: boolean
})
export const materials = new Map<string, Material>()

const loadGLBAsToon = async <K extends string>(
	paths: Record<K, string>,
	getOptions?: getToonOptions,
) => {
	const loaded = await asyncMapValues(paths, async (path, key) => loadGLB(path, key))

	const toons = mapValues(loaded, (glb, key) => {
		glb.scene.traverse((node) => {
			if (node instanceof Mesh) {
				if (node.material instanceof MeshStandardMaterial || node.material instanceof MeshPhysicalMaterial) {
					const options = getOptions ? getOptions(key, node.material.name, node.name, node) : {}
					if (!materials.has(node.material.uuid) || options.isolate) {
						const Mat = options?.material ?? ToonMaterial
						const newMaterial = new Mat({
							color: (options && 'color' in options) ? options.color : node.material.color,
							map: node.material.map,
							transparent: options?.transparent ?? node.material.transparent,
							side: node.material.side ?? options?.side ?? FrontSide,
							emissiveMap: node.material.emissiveMap,
							opacity: node.material.opacity,
							depthWrite: options?.depthWrite ?? true,
						})
						newMaterial.name = node.material.name
						if ('map' in newMaterial && newMaterial.map instanceof Texture) {
							newMaterial.map.colorSpace = SRGBColorSpace
							const minFilter = options?.filter ?? node.material.map?.minFilter
							if (minFilter) {
								newMaterial.map.minFilter = minFilter
							}
						}
						materials.set(node.material.uuid, newMaterial)
						node.castShadow = options.shadow ?? false
						node.receiveShadow = false
					}
					node.material = materials.get(node.material.uuid)
				}
			}
		})
		return glb
	})
	return toons
}

const cropsLoader = async <K extends string>(stagesPaths: Record<K, string>[]) => {
	const models = await asyncMap(stagesPaths, paths => loadGLBAsToon(paths, () => ({ shadow: true })))
	return models.reduce<Record<K, GLTF[]>>((acc, v) => {
		for (const [key, val] of entries(v)) {
			acc[key as K] ??= []
			acc[key as K].push(val)
		}
		return acc
	}, {} as Record<K, GLTF[]>)
}

const fontLoader = async<K extends string>(paths: Record<K, string>) => {
	for (const [key, m] of entries(paths)) {
		const [name, weight] = key.split('-')
		const font = new FontFace(name, `url(${m})`, { weight: weight ?? 'normal' })
		await font.load()
		document.fonts.add(font)
	}
}

const texturesLoader = async <K extends string>(paths: Record<K, string>) => {
	return await asyncMapValues(paths, async (src) => {
		const texture = await textureLoader.loadAsync(src)
		texture.magFilter = NearestFilter
		texture.minFilter = NearestFilter
		texture.wrapS = RepeatWrapping
		texture.wrapT = RepeatWrapping
		return texture
	})
}

interface PackedJSON {
	frames: Record<string, { frame: { x: number, y: number, w: number, h: number } }>
}

const buttonsLoader = async <K extends string>(json: Record<K, string>, png: Record<K, string>) => {
	return asyncMap(objectKeys(json), async (key) => {
		const jsonData = await (await fetch(json[key])).json() as PackedJSON
		const img = await loadImage(png[key])
		const getImg = (frame: { x: number, y: number, w: number, h: number }) => {
			const buffer = getScreenBuffer(frame.w, frame.h)
			buffer.drawImage(img, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h)
			return buffer.canvas
		}
		const frames = mapKeys(jsonData.frames, val => val.replace('folder/', ''))

		return (key: string) => {
			const frame = frames[key]?.frame
			if (frame) {
				return getImg(frame)
			}
			return getScreenBuffer(16, 16).canvas
		}
	})
}

const loadVoices = async <K extends string>(audioPaths: Record<K, string>, globText: Record<K, string>) => {
	const spriteMap = await asyncMapValues(globText, async src => (await fetch(src)).text())
	return asyncMapValues(audioPaths, async (src, key) => {
		const sprite = spriteMap[key]
			.split('\r\n')
			.filter(Boolean)
			.map(l => l.split('\t'))
			.reduce((acc, [start, end, name]) => ({
				...acc,
				[name]: [Number(start) * 1000, Number(end) * 1000 - Number(start) * 1000],
			}), {})
		const audio = await loadAudio(src, key)
		return new Howl({ src: audio, pool: 10, format: 'webm', sprite })
	})
}
const loadSounds = async <K extends string>(paths: Record<K, string>, pool: number) => {
	return await asyncMapValues(paths, async (src, key) => {
		const audio = await loadAudio(src, key)
		const player = new Howl({ src: audio, pool, format: 'webm' })
		return player
	})
}

const loadItems = async <K extends string>(paths: Record<K, string>, thumbnail: ThumbnailRenderer) => {
	const models = await loadGLBAsToon(paths, () => ({ side: DoubleSide }))
	const modelsAndthumbnails = mapValues(models, model => ({
		model: model.scene,
		img: thumbnail.getCanvas(model.scene).toDataURL(),
	}))
	thumbnail.dispose()
	return modelsAndthumbnails
}

const loadMainMenuAssets = async (glob: GlobEager) => {
	return await asyncMapValues(glob, async (src, key) => {
		const glb = await loadGLB(src, key)
		glb.scene.traverse((node) => {
			if (node instanceof Mesh) {
				node.material = new MeshBasicMaterial({ map: node.material.map, color: node.material.color })
			}
		})
		return glb
	})
}
const modelOptions: getToonOptions = (key: string, materialName: string, _name: string, node: Mesh) => {
	const isGate = node.parent?.name === 'GATE'
	return {
		shadow: true,
		depthWrite: !materialName.includes('Leaves'),
		material: isGate ? VineGateMaterial : ToonMaterial,
		isolate: isGate,
		transparent: isGate || undefined,
		side: key.includes('Creepy') ? DoubleSide : undefined,
	}
}

const splitChildren = async <K extends string>(glb: Promise<Record<string, GLTF>>) => {
	const res = await glb
	return objectValues(res).reduce((acc, glb) => {
		return {
			...acc,
			...glb.scene.children.reduce((acc2, obj) => {
				return { ...acc2, [obj.name]: obj }
			}, {}),
		}
	}, {}) as Record<K, Object3D>
}

type AssetsLoaded<T extends Record<string, Promise<any> | any>> = { [K in keyof T]: Awaited<T[K]> }
export const loadAssets = async (thumbnailRenderer: ThumbnailRenderer, loader?: () => () => void) => {
	const clear = loader && loader()
	const getAssetPaths = getAssetPathsLoader<StaticAssetPath>(import.meta.glob('@assets/*/**.*', { eager: true, query: '?url', import: 'default' }))

	const assets = {
		// ! models
		characters: loadGLBAsToon(
			getAssetPaths({ folder: 'characters', extension: 'glb', suffix: '-optimized' }),
			() => ({ material: CharacterMaterial, shadow: true, filter: NearestFilter }),
		),
		icons: getAssetPaths({ folder: 'icons', extension: 'svg' }),

		models: loadGLBAsToon(
			getAssetPaths({ folder: 'models', extension: 'glb', suffix: '-optimized' }),
			modelOptions,
		),
		trees: loadGLBAsToon(
			getAssetPaths({ folder: 'trees', extension: 'glb', suffix: '-optimized' }),
			() => ({ material: TreeMaterial, shadow: true, transparent: true }),
		),
		crops: cropsLoader(
			[1, 2, 3, 4].map(nb => getAssetPaths({ folder: 'crops', extension: 'glb', suffix: `_${nb}-optimized`, lowercase: true })),
		),
		gardenPlots: loadGLBAsToon(
			getAssetPaths({ folder: 'gardenPlots', extension: 'glb', suffix: '-optimized' }),
			() => ({ material: GardenPlotMaterial }),
		),
		weapons: loadGLBAsToon(
			getAssetPaths({ folder: 'weapons', extension: 'glb', suffix: '-optimized' }),
			() => ({ shadow: true }),
		),
		vegetation: loadGLBAsToon(
			getAssetPaths({ folder: 'vegetation', extension: 'glb', suffix: '-optimized' }),
			() => ({ material: GrassMaterial, shadow: true }),
		),
		mainMenuAssets: loadMainMenuAssets(
			getAssetPaths({ folder: 'mainMenuAssets', extension: 'glb', suffix: '-optimized' }),
		),

		fruitTrees: loadGLBAsToon(
			getAssetPaths({ folder: 'fruit_trees', extension: 'glb', suffix: '-optimized' }),
		),
		items: loadItems(
			getAssetPaths({ folder: 'items', extension: 'glb', suffix: '-optimized' }),
			thumbnailRenderer,
		),

		// ! textures
		particles: texturesLoader(
			getAssetPaths({ folder: 'particles', extension: 'webp' }),
		),

		textures: texturesLoader(
			getAssetPaths({ folder: 'textures', extension: 'webp' }),
		),

		buttons: buttonsLoader(
			getAssetPaths({ folder: 'buttons', extension: 'json' }),
			getAssetPaths({ folder: 'buttons', extension: 'png' }),
		),

		// ! audio
		voices: loadVoices(
			getAssetPaths({ folder: 'voices', extension: 'webm' }),
			getAssetPaths({ folder: 'voices', extension: 'txt' }),
		),

		steps: loadSounds(
			getAssetPaths({ folder: 'steps', extension: 'webm' }),
			3,
		),

		soundEffects: loadSounds(getAssetPaths({ folder: 'soundEffects', extension: 'webm' }), 5),

		music: loadSounds(getAssetPaths({ folder: 'music', extension: 'webm' }), 1),
		ambiance: loadSounds(getAssetPaths({ folder: 'ambiance', extension: 'webm' }), 1),

		// ! others
		fonts: fontLoader(
			{ ...getAssetPaths({ folder: 'fonts', extension: 'ttf' }), ...getAssetPaths({ folder: 'fonts', extension: 'otf' }) },
		),
		village: splitChildren<village>(loadGLBAsToon(getAssetPaths({ folder: 'village', extension: 'glb' }))),
		emotes: {
			containers: getAssetPaths({ folder: 'emotes', prefix: 'container_', extension: 'png' }),
			emotes: getAssetPaths({ folder: 'emotes', prefix: 'emote_', extension: 'png' }),
		},
	} as const

	const assetsLoaded = await asyncMapValues(assets, async val => await val) as AssetsLoaded<typeof assets>
	clear && clear()
	return assetsLoaded
}