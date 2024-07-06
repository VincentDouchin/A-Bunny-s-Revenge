import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { PLAYER_DEFAULT_HEALTH, playerBundle } from './spawnPlayer'
import { assets, ecs } from '@/global/init'
import { type Entity, Interactable } from '@/global/entity'
import { addItemToPlayer } from '@/utils/dialogHelpers'
import { modelColliderBundle } from '@/lib/models'
import { Animator } from '@/global/animator'

export const spawnMarker = (name: string): Entity => {
	switch (name) {
		case 'ruin-player':return playerBundle(PLAYER_DEFAULT_HEALTH, null)
		case 'ruin-chest':{
			const model = clone(assets.models.Chest.scene)
			model.scale.setScalar(5)
			const chestAnimator = new Animator<Animations['Chest']>(model, assets.models.Chest.animations)
			return {
				...modelColliderBundle(model, RigidBodyType.Fixed, false),
				model,
				chestAnimator,
				onPrimary(entity) {
					addItemToPlayer({ name: 'recipe_book', quantity: 1 })
					chestAnimator.playClamped('chest_open')
					ecs.removeComponent(entity, 'onPrimary')
				},
				interactable: Interactable.Open,
			}
		}
		default:return {}
	}
}