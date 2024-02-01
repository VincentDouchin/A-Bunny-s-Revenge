import type { Euler } from 'three'
import { DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, TextureLoader, Vector3 } from 'three'

import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

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

interface InstanceParams {
	position: Vector3
	scale: number
	opacity: number
	rotation: Euler
}

export const instanceMesh = (obj: GLTF) => {
	const intanceParams: InstanceParams[] = []
	const meshes: InstancedMesh[] = []
	const group = new Group()
	const addAt = (position: Vector3, scale = 1, opacity = 1, rotation: Euler) => {
		intanceParams.push({ position, scale, opacity, rotation })
	}
	const process = () => {
		obj.scene.traverse((node) => {
			if (node instanceof Mesh) {
				const mesh = new InstancedMesh(node.geometry.clone(), node.material.clone(), intanceParams.length)

				mesh.instanceMatrix.setUsage(DynamicDrawUsage)
				meshes.push(mesh)
			}
		})
		for (const mesh of meshes) {
			mesh.castShadow = true
			group.add(mesh)
			for (let i = 0; i < intanceParams.length; i++) {
				const params = intanceParams[i]
				const matrix = new Matrix4()
				matrix.makeRotationFromEuler(params.rotation)
				matrix.setPosition(params.position)
				matrix.scale(new Vector3().setScalar(params.scale))
				mesh.setMatrixAt(i, matrix)
			}
		}

		return group
	}
	return { addAt, process }
}
