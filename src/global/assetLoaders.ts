import type { Euler, Material, Vec2, Vector4Like } from 'three'
import { DynamicDrawUsage, Group, Matrix4, Mesh, TextureLoader, Vector3 } from 'three'

import { InstancedUniformsMesh } from 'three-instanced-uniforms-mesh'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { getScreenBuffer } from '@/utils/buffer'

export type stringCaster<K extends string> = (s: string) => K
export const getFileName = <K extends string>(path: string) => {
	return	path.split(/[./]/g).at(-2) ?? '' as K
}
export const getFolderName = (path: string) => {
	return	path.split(/[./]/g).at(-3) ?? ''
}
export const getExtension = (path: string) => {
	return	path.split(/[./]/g).at(-1) ?? ''
}
export const getPathPart = (part: number) => (path: string) => {
	return	path.split(/[./]/g).at(part) ?? ''
}

const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/examples/jsm/libs/draco/')
loader.setDRACOLoader(dracoLoader)
export const textureLoader = new TextureLoader()
export const loadGLB = (path: string) => loader.loadAsync(path)
export const loadImage = (path: string) => new Promise<HTMLImageElement>((resolve) => {
	const img = new Image()
	img.src = path
	img.onload = () => resolve(img)
})

export interface InstanceHandle {
	setMatrix: (fn: (matrix: Matrix4) => void) => void
	setUniform: (name: string, value: any) => void
}

export const instanceMesh = <T extends Material>(obj: GLTF) => {
	const intanceParams: Matrix4[] = []
	const meshes: InstancedUniformsMesh<T>[] = []
	const group = new Group()

	const addAt = (position: Vector3, scale = 1, rotation: Euler) => {
		const matrix = new Matrix4()
		matrix.makeRotationFromEuler(rotation)
		matrix.setPosition(position)
		matrix.scale(new Vector3().setScalar(scale))
		const i = intanceParams.length
		intanceParams.push(matrix)
		return {
			setMatrix: (fn: (m: Matrix4) => void) => {
				fn(matrix)
				for (const mesh of meshes) {
					mesh.setMatrixAt(i, matrix)
				}
			},
			setUniform: (name: string, value: any) => {
				for (const mesh of meshes) {
					mesh.setUniformAt(name, i, value)
				}
			},
		}
	}
	const process = () => {
		obj.scene.traverse((node) => {
			if (node instanceof Mesh) {
				const mesh = new InstancedUniformsMesh(node.geometry.clone(), node.material.clone(), intanceParams.length)
				mesh.instanceMatrix.setUsage(DynamicDrawUsage)
				meshes.push(mesh)
			}
		})
		for (const mesh of meshes) {
			mesh.castShadow = true
			group.add(mesh)
			for (let i = 0; i < intanceParams.length; i++) {
				const matrix = intanceParams[i]
				mesh.setMatrixAt(i, matrix)
			}
		}

		return group
	}
	return { addAt, process, glb: obj }
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
