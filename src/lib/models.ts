import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import type { Object3D, Object3DEventMap } from 'three'
import { Box3, Mesh, Quaternion, Vector3 } from 'three'

import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { models } from '@assets/assets'
import type { Entity } from '@/global/entity'
import type { CollidersData } from '@/debug/LevelEditor'
import type { customModel } from '@/debug/props'

const cloneMaterials = (model: Object3D<Object3DEventMap>) => {
	model.traverse((node) => {
		if (node instanceof Mesh) {
			node.material = node.material.clone()
		}
	})
}
export const getSize = (model: Object3D<Object3DEventMap>) => {
	const size = new Vector3()
	const boxSize = new Box3().setFromObject(model)
	boxSize.getSize(size)
	return size
}
export const getBoundingBox = (modelName: models | customModel, model: Object3D<Object3DEventMap>, colliderData: CollidersData): Entity => {
	const collider = colliderData[modelName]

	if (collider) {
		const size = new Vector3()
		if (collider.size) {
			size.set(...collider.size)
		} else {
			const boxSize = new Box3().setFromObject(model)
			boxSize.getSize(size)
		}
		if (collider.offset) {
			return {
				bodyDesc: new RigidBodyDesc(collider.type).lockRotations(),
				colliderDesc: ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setTranslation(...collider.offset).setSensor(collider.sensor),
				size,
			}
		}
	}
	return {}
}
export const modelColliderBundle = (model: Object3D<Object3DEventMap>, type = RigidBodyType.Dynamic, sensor = false, size?: Vector3) => {
	const cloneModel = clone(model)
	cloneMaterials(cloneModel)
	size ??= getSize(cloneModel)
	return {
		model: cloneModel,
		bodyDesc: new RigidBodyDesc(type).lockRotations(),
		colliderDesc: ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setTranslation(0, size.y / 2, 0).setSensor(sensor),
		rotation: new Quaternion(),
		size,
	} as const satisfies Entity
}

export const capsuleColliderBundle = (model: Object3D<Object3DEventMap>, size: Vector3) => {
	const cloneModel = clone(model)
	return {
		model: cloneModel,
		bodyDesc: RigidBodyDesc.dynamic().lockRotations(),
		colliderDesc: ColliderDesc.capsule(size.y / 2, size.x / 2).setTranslation(0, size.y / 2 + size.x / 2, 0),
		rotation: new Quaternion(),
		size,

	} as const satisfies Entity
}