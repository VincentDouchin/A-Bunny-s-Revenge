import { Vector3 } from 'three'
import { params } from '@/global/context'
import { ecs, inputManager, time } from '@/global/init'
import { cutSceneState, openMenuState, pausedState } from '@/global/states'
import { throttle } from '@/lib/state'
import { updateSave } from '@/global/save'

const movementQuery = ecs.with('body', 'rotation', 'movementForce', 'speed', 'stateMachine', 'state')
const playerQuery = movementQuery.with('playerControls', 'position')

export const movePlayer = () => {
	for (const { playerControls, movementForce } of playerQuery) {
		movementForce.setScalar(0)
		movementForce.x += playerControls.get('left').pressed
		movementForce.x -= playerControls.get('right').pressed
		movementForce.z -= playerControls.get('backward').pressed
		movementForce.z += playerControls.get('forward').pressed
		if (inputManager.controls === 'keyboard') {
			movementForce.normalize()
		}
	}
}

export const applyMove = () => {
	for (const entity of movementQuery) {
		const { body, rotation, stateMachine, movementForce, speed, state } = entity
		const force = movementForce.clone().multiplyScalar(speed * params.speedUp * time.delta)
		const moving = force.length() > 0
		moving && rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(force.x, force.z))
		if (state !== 'picking' && state !== 'waitingAttack') {
			if (moving) {
				stateMachine.enter('running', entity)
			} else {
				stateMachine.enter('idle', entity)
			}

			body.applyImpulse(force, true)
		}
	}
}
export const canPlayerMove = () => !openMenuState.enabled && !cutSceneState.enabled && !pausedState.enabled

export const savePlayerPosition = throttle(1000, () => {
	const player = playerQuery.first
	if (player) {
		updateSave((s) => {
			s.playerPosition = player.position.toArray()
			s.playerRotation = player.rotation.toArray()
		})
	}
})