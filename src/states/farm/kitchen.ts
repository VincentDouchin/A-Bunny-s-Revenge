import { RigidBodyType } from '@dimforge/rapier3d-compat'
import type { Entity } from '@/global/entity'
import { assets } from '@/global/init'
import type { direction } from '@/lib/directions'
import { modelColliderBundle } from '@/lib/models'
import { getRotationFromDirection } from '@/lib/transforms'

export const kitchenApplianceBundle = (modelName: kitchen, direction: direction) => {
	const rotation = getRotationFromDirection(direction)
	const model = assets.kitchen[modelName].scene.clone()
	model.scale.setScalar(3.5)
	const bundle = modelColliderBundle(model, RigidBodyType.Fixed)
	return { ...bundle, rotation, inMap: true } as const satisfies Entity
}