import { PLAYER_DEFAULT_HEALTH, playerBundle } from './spawnPlayer'
import type { Entity } from '@/global/entity'
import { assets } from '@/global/init'

// const chestBundle = () => {
// 	const model = clone(assets.models.Chest.scene)
// 	model.scale.setScalar(5)
// 	const colliderBundle = modelColliderBundle(model, RigidBodyType.Fixed, false)
// 	const chestAnimator = new Animator<Animations['Chest']>(colliderBundle.model, assets.models.Chest.animations)
// 	return {
// 		chestAnimator,
// 		...colliderBundle,
// 		interactable: Interactable.Open,
// 	}
// }

export const spawnMarker = (name: string): Entity => {
	if (name === 'playerIntro') {
		const player = {
			...playerBundle(PLAYER_DEFAULT_HEALTH, null),
		}
		player.playerAnimator.playAnimation('sleeping')
		player.state = 'managed'
		return player
	}
	if (name === 'basketIntro') {
		const model = assets.models.basket.scene.clone()
		model.scale.setScalar(5)
		return { model, basket: true }
	}
	// if (name === 'ruin-chest') {
	// 	const chest = chestBundle()
	// 	const onPrimary: Entity['onPrimary'] = async (entity, player) => {
	// 		if (hasItem('recipe_book')) {
	// 			ecs.update(player, { weapon: weaponBundle('SwordWeapon') })
	// 			chest.chestAnimator.playClamped('chest_open')
	// 			ecs.removeComponent(entity, 'onPrimary')
	// 			ecs.removeComponent(entity, 'interactable')
	// 		} else {
	// 			addItemToPlayer({ name: 'recipe_book', quantity: 1 })
	// 			chest.chestAnimator.playClamped('chest_open')
	// 			ecs.removeComponent(entity, 'onPrimary')
	// 			ecs.removeComponent(entity, 'interactable')
	// 			ecs.update(player, {
	// 				activeDialog: 'instant',
	// 				dialog: dialogs.PlayerIntro3(),
	// 			})
	// 		}
	// 	}

	// 	return {
	// 		...chest,
	// 		onPrimary,

	// 	}
	// }
	if (name.startsWith('dialog-trigger')) {
		return { dialogTrigger: name.replace('dialog-trigger-', '') }
	}
	return {
		markerName: name,
	}
}