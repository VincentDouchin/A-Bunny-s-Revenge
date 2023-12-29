import { Vector3 } from 'three'
import { params } from '@/global/context'
import { ecs, time } from '@/global/init'
import { cutSceneState, openMenuState } from '@/global/states'
import { throttle } from '@/lib/state'
import { updateSave } from '@/global/save'

const playerQuery = ecs.with('playerControls', 'body', 'rotation', 'playerAnimator', 'movementForce', 'position')

export const movePlayer = () => {
	for (const { playerControls, movementForce } of playerQuery) {
		movementForce.setScalar(0)
		movementForce.x += playerControls.get('left').pressed
		movementForce.x -= playerControls.get('right').pressed
		movementForce.z -= playerControls.get('backward').pressed
		movementForce.z += playerControls.get('forward').pressed
		movementForce.normalize()
	}
}

export const applyMove = () => {
	for (const { body, rotation, playerAnimator, movementForce } of playerQuery) {
		const force = movementForce.clone().multiplyScalar(300 * params.speedUp * time.delta)
		const moving = force.length() > 0
		if (moving) {
			rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(force.x, force.z))
			playerAnimator.playAnimation('run')
		} else {
			playerAnimator.playAnimation('idle')
		}

		body.applyImpulse(force, true)
	}
}
export const canPlayerMove = () => !openMenuState.enabled && !cutSceneState.enabled

export const savePlayerPosition = throttle(1000, () => {
	const player = playerQuery.first
	if (player) {
		updateSave((s) => {
			s.playerPosition = player.position.toArray()
			s.playerRotation = player.rotation.toArray()
		})
	}
})