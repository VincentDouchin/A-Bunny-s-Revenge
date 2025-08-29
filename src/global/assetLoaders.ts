import type { Euler, Material, Object3D, Object3DEventMap, Vec2, Vector4Like } from 'three'
import type { Simplify } from 'type-fest'
import assetManifest from '@assets/assetManifest.json'
import { createStore, del, entries, set } from 'idb-keyval'
import { DynamicDrawUsage, Group, LoadingManager, Matrix4, Mesh, TextureLoader, Vector3 } from 'three'
import { InstancedUniformsMesh } from 'three-instanced-uniforms-mesh'
import draco_decoder from 'three/examples/jsm/libs/draco/draco_decoder.wasm?url'
import draco_wasm_wrapper from 'three/examples/jsm/libs/draco/draco_wasm_wrapper.js?url'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { assets } from '@/static-assets'
import { getScreenBuffer } from '@/utils/buffer'
import { useLocalStorage } from '@/utils/useLocalStorage'

export type stringCaster<K extends string> = (s: string) => K
export const getFileName = <K extends string>(path: string) => {
	return path.split(/[./]/g).at(-2) ?? '' as K
}
export const getFolderName = (path: string) => {
	return path.split(/[./]/g).at(-3) ?? ''
}
export const getExtension = (path: string) => {
	return path.split(/[./]/g).at(-1) ?? ''
}
export const getPathPart = (part: number) => (path: string) => {
	return path.split(/[./]/g).at(part) ?? ''
}

export const textureLoader = new TextureLoader()

const cachedLoader = async <R>(storeName: string, fn: (arr: ArrayBuffer) => Promise<R>, fnDev?: (src: string) => Promise<R>) => {
	if (import.meta.env.DEV && fnDev) {
		return fnDev
	}
	const store = createStore('fabled-recipes', storeName)
	const [localManifest, setLocalManifest] = useLocalStorage<Partial<Record<string, number>>>('assetManifest', {})
	const files = new Map<string, ArrayBuffer>(await entries(store))
	for (const file of files.keys()) {
		if (!(file in assetManifest)) {
			await del(file, store)
		}
	}
	return async (src: string, key: string) => {
		const localEntry = localManifest[key]
		const existingEntry = files.get(key)

		if (!existingEntry || !localEntry || localEntry < assetManifest[key as keyof typeof assetManifest].modified) {
			try {
				const arr = await (await fetch(src)).arrayBuffer()
				await set(key, arr, store)
				setLocalManifest(manifest => ({ ...manifest, [key]: assetManifest[key as keyof typeof assetManifest]?.modified }))

				return await fn(arr!)
			// eslint-disable-next-line unused-imports/no-unused-vars
			} catch (_error) {
				console.error(`Error loading ${src} ${key}`)
			}
		}

		if (existingEntry && localEntry) {
			return fn(existingEntry)
		} else {
			throw new Error(`cached asset ${key} not found`)
		}
	}
}

const getDracoLoader = () => {
	const draco: Record<string, string> = {
		'draco_wasm_wrapper.js': draco_wasm_wrapper,
		'draco_decoder.wasm': draco_decoder,
	}
	const loadingManager = new LoadingManager().setURLModifier((url) => {
		return draco[url]
	})
	return new DRACOLoader(loadingManager).setDecoderPath('').preload()
}
export const draco = getDracoLoader()

export const loadGLB = await cachedLoader(
	'glb',
	(arrayBuffer: ArrayBuffer) => new GLTFLoader().setDRACOLoader(draco).parseAsync(arrayBuffer, ''),
	src => new GLTFLoader().setDRACOLoader(draco).loadAsync(src),
)

export const loadAudio = await cachedLoader(
	'glb',
	async (arrayBuffer: ArrayBuffer) => {
		const audioBlob = await new Blob([arrayBuffer], { type: 'audio/webm' })
		const url = URL.createObjectURL(audioBlob)
		return url
	},
	src => Promise.resolve(src),
)
export const loadImage = (path: string) => new Promise<HTMLImageElement>((resolve) => {
	const img = new Image()
	img.src = path
	img.onload = () => resolve(img)
})

export interface InstanceHandle {
	setMatrix: (fn: (matrix: Matrix4) => void) => void
	setUniform: (name: string, value: any) => void
}

export const instanceMesh = <T extends Material>(obj: Object3D<Object3DEventMap>, castShadow = true) => {
	const instanceParams: Matrix4[] = []
	const meshes: InstancedUniformsMesh<T>[] = []
	const group = new Group()

	const addAt = (position: Vector3, scale = 1, rotation: Euler) => {
		const matrix = new Matrix4()
		matrix.makeRotationFromEuler(rotation)
		matrix.setPosition(position)
		matrix.scale(new Vector3().setScalar(scale))
		const i = instanceParams.length
		instanceParams.push(matrix)
		const uniformCache: Record<string, any> = {}
		return {
			setMatrix: (fn: (m: Matrix4) => void) => {
				fn(matrix)
				for (const mesh of meshes) {
					mesh.setMatrixAt(i, matrix)
				}
			},
			setUniform: (name: string, value: any) => {
				if (uniformCache[name] === value) return
				uniformCache[name] = value
				for (const mesh of meshes) {
					mesh.setUniformAt(name, i, value)
				}
			},
		}
	}
	const process = () => {
		obj.traverse((node) => {
			if (node instanceof Mesh) {
				const mesh = new InstancedUniformsMesh(node.geometry.clone(), node.material.clone(), instanceParams.length)
				mesh.instanceMatrix.setUsage(DynamicDrawUsage)
				meshes.push(mesh)
			}
		})
		for (const mesh of meshes) {
			mesh.castShadow = castShadow
			group.add(mesh)
			for (let i = 0; i < instanceParams.length; i++) {
				const matrix = instanceParams[i]
				mesh.setMatrixAt(i, matrix)
			}
		}

		return group
	}
	return { addAt, process, obj }
}

export const dataUrlToCanvas = async (size: Vec2, dataUrl?: string) => {
	const buffer = getScreenBuffer(size.x, size.y)
	if (dataUrl && dataUrl !== 'data:,') {
		const img = await loadImage(dataUrl)
		buffer.drawImage(img, 0, 0, img.width, img.height)
	}
	return buffer.canvas
}
export const canvasToArray = (canvas: HTMLCanvasElement): Vector4Like[] => {
	const context = canvas.getContext('2d')!
	const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
	const pixels = []

	for (let i = 0; i < imageData.data.length; i += 4) {
		const pixel = {
			x: imageData.data[i],
			y: imageData.data[i + 1],
			z: imageData.data[i + 2],
			w: imageData.data[i + 3],
		}

		pixels.push(pixel)
	}
	return pixels
}
export const canvasToGrid = (canvas: HTMLCanvasElement): Vector4Like[][] => {
	const pixels = canvasToArray(canvas)
	const arrayOfArrays = []

	for (let i = 0; i < pixels.length; i += canvas.width) {
		arrayOfArrays.push(pixels.slice(i, i + canvas.width))
	}

	return arrayOfArrays
}

export const loaderProgress = (manifest: Record<string, { size: number, modified: number }>) => {
	let loaded = 0
	const loadElement = document.createElement('div')
	loadElement.classList.add('loader')
	document.body.appendChild(loadElement)
	const total = Object.entries(manifest)
		.filter(([x]) => getExtension(x) !== 'json')
		.map(x => x[1].size)
		.reduce((a, b) => a + b, 0)
	const loader = (key: string) => {
		loaded += manifest[globalThis.decodeURIComponent(key)]?.size
		const percent = Math.round(loaded / total * 100)
		loadElement.style.setProperty('--loaded', `${percent}%`)
	}
	const clear = () => loadElement.remove()
	return {
		loader,
		clear,
	}
}

type ExtractFromPath<
	T extends string,
	P extends string,
	S extends string,
	E extends string,
> = {
	[Path in T]: Path extends `${P}/${infer R}${S}.${E}` ? R : never
}[T]
const escapeRegex = (str?: string) => (str ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const getAssetPathsLoader = <Paths extends string>(assetPaths: Record<string, string>) => <
	P extends string = '',
	S extends string = '',
	E extends string = '',
	L extends boolean = false,
>({ prefix, suffix, extension, lowercase }: { prefix?: P, suffix?: S, extension?: E, lowercase?: L }) => {
	const escapedPrefix = escapeRegex(prefix)
	const escapedSuffix = escapeRegex(suffix)
	const escapedExtension = escapeRegex(extension)

	const regex = new RegExp(`${escapedPrefix}/(.*?)${escapedSuffix}.${escapedExtension}`)
	return [...assets]
		.filter(assets => assets.match(regex)?.[0])
		.reduce((acc, v) => {
			const realPath = Object.entries(assetPaths).find(([rawPath, _realPath]) => rawPath.endsWith(v))![1]
			let fileName = regex.exec(v)![1]
			if (lowercase) {
				fileName = fileName.toLocaleLowerCase()
			}
			return ({ ...acc, [fileName]: realPath })
		}, {}) as Simplify<Record<L extends true ? Lowercase<ExtractFromPath<Paths, P, S, E>> : ExtractFromPath<Paths, P, S, E>, string>>
}
