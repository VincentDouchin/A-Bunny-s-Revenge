import type { models } from '@assets/assets'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import type { Entity } from '@/global/entity'
import { assets } from '@/global/init'
import type { direction } from '@/lib/directions'
import { modelColliderBundle } from '@/lib/models'
import { getRotationFromDirection } from '@/lib/transforms'

export const kitchenApplianceBundle = (modelName: models, direction: direction, scale = 3.5) => {
	const rotation = getRotationFromDirection(direction)
	const model = assets.models[modelName].scene.clone()
	model.scale.setScalar(scale)
	const bundle = modelColliderBundle(model, RigidBodyType.Fixed)
	return { ...bundle, rotation, inMap: true } as const satisfies Entity
}