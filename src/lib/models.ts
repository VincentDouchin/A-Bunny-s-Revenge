import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import type { Object3D, Object3DEventMap } from 'three'
import { Box3, Quaternion, Vector3 } from 'three'

import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { Entity } from '@/global/entity'

export const modelColliderBundle = (model: Object3D<Object3DEventMap>, type = RigidBodyType.Dynamic, sensor = false) => {
	const cloneModel = clone(model)
	const size = new Vector3()
	new Box3().setFromObject(model).getSize(size)
	size.divideScalar(2)

	return {
		model: cloneModel,
		bodyDesc: new RigidBodyDesc(type).lockRotations(),
		colliderDesc: ColliderDesc.cuboid(size.x, size.y, size.z).setTranslation(0, size.y, 0).setSensor(sensor),
		rotation: new Quaternion(),
		size,
	} as const satisfies Entity
}