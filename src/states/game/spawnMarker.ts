import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { PLAYER_DEFAULT_HEALTH, playerBundle } from './spawnPlayer'
import { weaponBundle } from './weapon'
import { dialogs } from '@/constants/dialogs'
import { Animator } from '@/global/animator'
import { type Entity, Interactable } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'
import { addItemToPlayer, hasItem, removeItemFromPlayer } from '@/utils/dialogHelpers'

const chestBundle = () => {
	const model = clone(assets.models.Chest.scene)
	model.scale.setScalar(5)
	const colliderBundle = modelColliderBundle(model, RigidBodyType.Fixed, false)
	const chestAnimator = new Animator<Animations['Chest']>(colliderBundle.model, assets.models.Chest.animations)
	return {
		chestAnimator,
		...colliderBundle,
		interactable: Interactable.Open,
	}
}

export const spawnMarker = (name: string): Entity => {
	if (name === 'ruin-player') {
		removeItemFromPlayer({ name: 'recipe_book', quantity: 100 })
		return playerBundle(PLAYER_DEFAULT_HEALTH, null)
	}
	if (name === 'ruin-chest') {
		const chest = chestBundle()
		const onPrimary: Entity['onPrimary'] = async (entity, player) => {
			if (hasItem('recipe_book')) {
				ecs.update(player, { weapon: weaponBundle('SwordWeapon') })
				chest.chestAnimator.playClamped('chest_open')
				ecs.removeComponent(entity, 'onPrimary')
				ecs.removeComponent(entity, 'interactable')
			} else {
				addItemToPlayer({ name: 'recipe_book', quantity: 1 })
				chest.chestAnimator.playClamped('chest_open')
				ecs.removeComponent(entity, 'onPrimary')
				ecs.removeComponent(entity, 'interactable')
				ecs.update(player, {
					activeDialog: 'instant',
					dialog: dialogs.PlayerIntro3(),
				})
			}
		}

		return {
			...chest,
			onPrimary,

		}
	}
	if (name.startsWith('dialog-trigger')) {
		return { dialogTrigger: name.replace('dialog-trigger-', '') }
	}
	return {
		markerName: name,
	}
}