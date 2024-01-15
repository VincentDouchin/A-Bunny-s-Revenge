import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { type Entity, Interactable } from '@/global/entity'
import { assets } from '@/global/init'
import { menuInputMap } from '@/global/inputMaps'
import { modelColliderBundle } from '@/lib/models'

export const cauldronBundle = (): Entity => {
	const model = assets.characters.cauldron.scene.clone()
	model.scale.setScalar(10)
	const bundle = modelColliderBundle(model, RigidBodyType.Fixed)
	return {
		...bundle,
		interactable: Interactable.Cook,
		...menuInputMap(),
		inventory: [null, null, null, null],
		inMap: true,

	}
}
