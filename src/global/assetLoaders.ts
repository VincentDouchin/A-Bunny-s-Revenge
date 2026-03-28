import type { BufferGeometry, Material, Matrix4, Mesh, Object3D, Vector2Like, Vector4Like } from 'three/webgpu'
import type { Simplify } from 'type-fest'
import assetManifest from '@assets/assetManifest.json'
import { createStore, del, entries, set } from 'idb-keyval'
import { InstancedUniformsMesh } from 'three-instanced-uniforms-mesh'
import { DRACOLoader, GLTFLoader } from 'three/addons'
import draco_decoder from 'three/examples/jsm/libs/draco/draco_decoder.wasm?url'
import draco_wasm_wrapper from 'three/examples/jsm/libs/draco/draco_wasm_wrapper.js?url'
import { DynamicDrawUsage, Group, LoadingManager, TextureLoader } from 'three/webgpu'
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

// export interface InstanceHandle {
// 	setMatrix: (fn: (matrix: Matrix4) => void) => void
// 	setUniform: (name: string, value: any) => void
// }

// export interface InstanceGenerator {
// 	addAt: (position: Vector3, scale: number, rotation: Euler) => InstanceHandle
// 	process: () => Group
// 	obj: Object3D
// }

export const isMesh = <M extends Material = Material>(node: any): node is Mesh<BufferGeometry, M> => node.type === 'Mesh'

export class InstancedModel extends Group {
	matrixes: Matrix4[] = []
	meshes: InstancedUniformsMesh<Material>[] = []
	constructor(private model: Object3D) {
		super()
	}

	addInstance(matrix: Matrix4) {
		const i = this.matrixes.length
		this.matrixes.push(matrix)
		const uniformCache: Record<string, any> = {}
		return {
			setUniform: (name: string, value: any) => {
				if (uniformCache[name] === value) return
				uniformCache[name] = value
				for (const mesh of this.meshes) {
					mesh.setUniformAt(name, i, value)
				}
			},
		}
	}

	build() {
		this.model.traverse((node) => {
			if (isMesh(node)) {
				const mesh = new InstancedUniformsMesh(node.geometry.clone(), node.material.clone(), this.matrixes.length)
				mesh.instanceMatrix.setUsage(DynamicDrawUsage)
				this.meshes.push(mesh)
			}
		})
		for (const mesh of this.meshes) {
			this.add(mesh)
			for (let i = 0; i < this.matrixes.length; i++) {
				const matrix = this.matrixes[i]
				mesh.setMatrixAt(i, matrix)
				// mesh.material.needsUpdate = true
			}
		}
		return this
	}
}

export const dataUrlToCanvas = async (size: Vector2Like, dataUrl?: string) => {
	const buffer = getScreenBuffer(size.x, size.y)
	if (dataUrl && dataUrl !== 'data:,') {
		const img = await loadImage(dataUrl)
		buffer.drawImage(img, 0, 0, img.width, img.height)
	}
	return buffer.canvas
}
export const canvasToArray = (canvas: HTMLCanvasElement, reverse = false): Vector4Like[] => {
	const context = canvas.getContext('2d', { willReadFrequently: true })!
	const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
	const pixels = []

	for (let i = 0; i < imageData.data.length; i += 4) {
		const pixel = {
			x: imageData.data[i],
			y: imageData.data[i + 1],
			z: imageData.data[i + 2],
			w: imageData.data[i + 3],
		}
		if (reverse) {
			pixels.push(pixel)
		} else {
			pixels.unshift(pixel)
		}
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
export const canvasToBuffer = (canvas: HTMLCanvasElement): Uint8ClampedArray => {
	const ctx = canvas.getContext('2d')!
	return ctx.getImageData(0, 0, canvas.width, canvas.height).data
}

export const loaderProgress = () => {
	const loadElement = document.createElement('div')
	loadElement.classList.add('loader')
	document.body.appendChild(loadElement)

	const clear = () => loadElement.remove()
	return clear
}

type ExtractFromPath<
	T extends string,
	F extends string,
	P extends string,
	S extends string,
	E extends string,
> = {
	[Path in T]: Path extends `${F}/${P}${infer R}${S}.${E}` ? R : never
}[T]
const escapeRegex = (str?: string) => (str ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const getAssetPathsLoader = <Paths extends string>(assetPaths: Record<string, string>) => <
	F extends string = '',
	P extends string = '',
	S extends string = '',
	E extends string = '',
	L extends boolean = false,
>({ folder, suffix, extension, lowercase, prefix }: { folder?: F, suffix?: S, extension: E, lowercase?: L, prefix?: P }) => {
	const escapedPrefix = escapeRegex(prefix)
	const escapedFolder = escapeRegex(folder)
	const escapedSuffix = escapeRegex(suffix)
	const escapedExtension = escapeRegex(extension)
	const regex = new RegExp(`${escapedFolder}/${escapedPrefix}(.*?)${escapedSuffix}.${escapedExtension}`)
	return [...assets]
		.filter(assets => assets.match(regex)?.[0])
		.reduce((acc, v) => {
			const realPath = Object.entries(assetPaths).find(([rawPath, _realPath]) => rawPath.endsWith(v))?.[1]
			if (!realPath) {
				throw new Error(`${v} does not exist`)
			}
			let fileName = regex.exec(v)![1]
			if (lowercase) {
				fileName = fileName.toLocaleLowerCase()
			}
			return ({ ...acc, [fileName]: realPath })
		}, {}) as L extends true
		? Simplify<Record<Lowercase<ExtractFromPath<Paths, F, P, S, E>>, string>>
		: Simplify<Record<ExtractFromPath<Paths, F, P, S, E>, string>>
}
