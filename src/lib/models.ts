import type { Object3D, Object3DEventMap } from 'three'
import type { Constructor } from 'type-fest'
import type { AssetData } from '../../editor/src/types'
import boundingBox from '@assets/boundingBox.json'
import { Box3, Mesh, Vector3 } from 'three'

export const cloneMaterials = (model: Object3D<Object3DEventMap>) => {
	model.traverse((node) => {
		if (node instanceof Mesh) {
			node.material = node.material.clone()
		}
	})
}

export const getBoundingBoxShape = (category: string, model: string): Vector3 => {
	const shape = (boundingBox as unknown as Record<string, Record<string, AssetData>>)[category][model]
	if (!shape || !shape.collider) {
		throw new Error('bounding box not defined')
	}
	if (shape.collider.type === 'link') {
		return getBoundingBoxShape(shape.collider.category, shape.collider.model)
	}
	const size = shape.collider.size
	switch (shape.collider.type) {
		case 'ball':return new Vector3().setScalar(size.x)
		case 'capsule': return new Vector3(size.x, size.y! + size.x, size.x)
		case 'cuboid':return new Vector3(size.x, size.y!, size.z!)
		case 'cylinder':return new Vector3(size.x, size.y, size.x)
	}
}

export const getSize = (model: Object3D<Object3DEventMap>) => {
	const size = new Vector3()
	const boxSize = new Box3().setFromObject(model)
	boxSize.getSize(size)
	return size
}

export const traverseFind = <T extends Constructor<Object3D<Object3DEventMap>> = Constructor<Object3D<Object3DEventMap>>>(obj: Object3D<Object3DEventMap>, fn: (node: Object3D<Object3DEventMap>) => boolean, instance?: T): InstanceType<T> | null => {
	let result: InstanceType<T> | null = null

	obj.traverse((node) => {
		if (fn(node) && (!instance || node instanceof instance)) {
			result = node as InstanceType<T>
		}
	})
	return result
}