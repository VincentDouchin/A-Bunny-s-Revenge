import { DynamicDrawUsage, Group, InstancedMesh, Mesh, Object3D, TextureLoader, Vector3 } from 'three'

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

export const instanceMesh = (obj: GLTF) => {
	const positions: Vector3[] = []
	const scales: number[] = []
	const rotation = new Vector3()
	const scale = new Vector3(1, 1, 1)
	const meshes: InstancedMesh[] = []
	const group = new Group()
	const addAt = (position: Vector3, scale = 1) => {
		positions.push(position)
		scales.push(scale)
	}
	const process = () => {
		obj.scene.traverse((node) => {
			scale.x *= node.scale.x
			scale.y *= node.scale.y
			scale.z *= node.scale.z
			rotation.x += node.rotation.x
			rotation.y += node.rotation.y
			rotation.z += node.rotation.z
			if (node instanceof Mesh) {
				const mesh = new InstancedMesh(node.geometry.clone(), node.material.clone(), positions.length)

				mesh.instanceMatrix.setUsage(DynamicDrawUsage)
				meshes.push(mesh)
			}
		})
		for (const mesh of meshes) {
			mesh.rotation.set(rotation.x, rotation.y, rotation.z)
			mesh.castShadow = true
			group.add(mesh)
			for (let i = 0; i < positions.length; i++) {
				const o = new Object3D()
				const position = positions[i]
				o.position.set(position.x, position.z, position.y)
				o.scale.set(scale.x, scale.y, scale.z)
				o.scale.multiplyScalar(scales[i])
				o.updateMatrix()
				mesh.setMatrixAt(i, o.matrix)
			}
		}

		return group
	}
	return { addAt, process }
}