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
	// const y = boxSize.max.y - boxSize.min.y
	// const x = boxSize.max.x - boxSize.min.x
	// const z = boxSize.max.z - boxSize.min.z
	// if (debug) {
	// 	debugger
	// 	const box = new Mesh(
	// 		new BoxGeometry(x, y, z),
	// 		new MeshBasicMaterial({ color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, opacity: 0.5, transparent: true }),
	// 	)
	// 	box.position.y = y / 2
	// 	cloneModel.add(box)
	// }
	return {
		model: cloneModel,
		bodyDesc: new RigidBodyDesc(type).lockRotations(),
		colliderDesc: ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setTranslation(0, size.y / 2, 0).setSensor(sensor),
		rotation: new Quaternion(),
		size,
	} as const satisfies Entity
}