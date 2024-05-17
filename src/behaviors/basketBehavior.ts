import { Vector3 } from 'three'
import { applyMove, applyRotate, getMovementForce } from './behaviorHelpers'
import type { Entity } from '@/global/entity'
import { ecs } from '@/global/init'
import type { StateParameters } from '@/lib/behaviors'
import { behaviorPlugin } from '@/lib/behaviors'
import { cutSceneState, mainMenuState } from '@/global/states'

const basketComponents = ['basket', 'basketAnimator', 'position', 'body', 'movementForce', 'targetRotation', 'rotation', 'speed'] as const satisfies readonly (keyof Entity)[]
const basketQuery = ecs.with(...basketComponents)
const playerQuery = ecs.with('player', 'position')
const basketParameters: StateParameters<(typeof basketComponents)[number]> = (e) => {
	const player = playerQuery.first
	let dist = 0
	const direction = new Vector3()
	if (player) {
		dist = player.position.distanceTo(e.position)
		direction.copy(player.position.clone().sub(e.position).normalize())
	}
	return { dist, direction, ...getMovementForce(e) }
}
export const basketBehaviorPlugin = behaviorPlugin(basketQuery, 'basket', basketParameters)({
	idle: {
		enter: (e) => {
			e.basketAnimator.playAnimation('WingFlap_Rocking')
		},
		update: (_e, setState, { dist }) => {
			if (dist > (mainMenuState.enabled ? 2 : 40) && !cutSceneState.enabled) {
				setState('running')
			}
		},

	},
	running: {
		enter: (e) => {
			e.basketAnimator.playAnimation('WingFlapBounce')
		},
		update: (e, setState, { dist, direction, force }) => {
			if (dist < (mainMenuState.enabled ? 0 : 20)) {
				setState('idle')
			}

			e.movementForce.x = direction.x
			e.movementForce.z = direction.z
			applyMove(e, force)
			applyRotate(e, force)
		},
	},
})