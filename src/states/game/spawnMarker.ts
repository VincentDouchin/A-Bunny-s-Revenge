import { PLAYER_DEFAULT_HEALTH, playerBundle } from './spawnPlayer'
import type { Entity } from '@/global/entity'
import { assets } from '@/global/init'

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
		return { model, basket: true, questMarker: ['intro_quest#0_find_basket'] }
	}

	if (name === 'cellar-door') {
		return {
			markerName: 'cellar-door',
		}
	}
	if (name.startsWith('dialog-trigger')) {
		return { dialogTrigger: name.replace('dialog-trigger-', '') }
	}
	return {
		markerName: name,
	}
}