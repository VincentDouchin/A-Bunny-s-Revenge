import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { Group, Object3DEventMap } from 'three'
import { Box3, Quaternion, Vector3 } from 'three'

import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

export const modelColliderBundle = (model: Group<Object3DEventMap>) => {
	const cloneModel = clone(model)
	const size = new Vector3()
	new Box3().setFromObject(model).getSize(size)
	size.divideScalar(2)
	return {
		model: cloneModel,
		bodyDesc: RigidBodyDesc.dynamic().setCcdEnabled(true).lockRotations().setLinearDamping(7),
		colliderDesc: ColliderDesc.cuboid(size.x, size.y, size.z).setTranslation(0, size.y, 0),
		rotation: new Quaternion(),
	} as const
}