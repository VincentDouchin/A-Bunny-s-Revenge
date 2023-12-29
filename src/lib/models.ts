import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import type { Object3D, Object3DEventMap } from 'three'
import { Box3, Quaternion, Vector3 } from 'three'

import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { Entity } from '@/global/entity'

export const modelColliderBundle = (model: Object3D<Object3DEventMap>, type = RigidBodyType.Dynamic, sensor = false, size?: Vector3) => {
	const cloneModel = clone(model)

	if (!size) {
		size = new Vector3()
		const boxSize = new Box3().setFromObject(cloneModel)
		boxSize.getSize(size)
	}
	return {
		model: cloneModel,
		bodyDesc: new RigidBodyDesc(type).lockRotations(),
		colliderDesc: ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setTranslation(0, size.y / 2, 0).setSensor(sensor),
		rotation: new Quaternion(),
		size,
	} as const satisfies Entity
}