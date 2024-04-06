import { QueryFilterFlags } from '@dimforge/rapier3d-compat'
import { Vector3 } from 'three'
import { params } from '@/global/context'
import { ecs, inputManager, time } from '@/global/init'
import { updateSave } from '@/global/save'
import { playStep } from '@/global/sounds'
import { cutSceneState, openMenuState, pausedState } from '@/global/states'
import { throttle } from '@/lib/state'

const movementQuery = ecs.with('body', 'rotation', 'movementForce', 'speed', 'stateMachine', 'state')
const playerQuery = movementQuery.with('playerControls', 'position', 'playerAnimator', 'state', 'lastStep')

export const playerSteps = () => {
	for (const player of playerQuery) {
		if (player.state === 'running' && player.playerAnimator.action) {
			for (const [time, foot] of [[12 / 20, 'right'], [3 / 20, 'left']] as const) {
				if (player.playerAnimator.action.time >= time) {
					if (player.lastStep[foot] === false) {
						playStep('random', { volume: -12 })
						player.lastStep[foot] = true
					}
				} else {
					player.lastStep[foot] = false
				}
			}
		} else {
			player.lastStep.left = false
			player.lastStep.right = false
		}
	}
}

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
		const { body, rotation, stateMachine, movementForce, speed, state, controller, collider } = entity
		const force = movementForce.clone().multiplyScalar(speed * params.speedUp * time.delta / 1000)
		force.setY(0).multiplyScalar(['waitingAttack', 'attacking'].includes(state) ? 0.3 : 1)
		const moving = force.length() > 0
		moving && state !== 'picking' && rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(force.x, force.z))
		if (state !== 'picking' && state !== 'hit' && state !== 'dying' && state !== 'dead' && state !== 'cheer') {
			if (moving) {
				stateMachine.enter('running', entity)
			} else if (state !== 'attacking') {
				stateMachine.enter('idle', entity)
			}
			if (controller && collider && body.isKinematic()) {
				controller.computeColliderMovement(collider, force.add(new Vector3(0, -0.981, 0)), QueryFilterFlags.EXCLUDE_SOLIDS, undefined)
				const movement = controller.computedMovement()
				const bodyPos = body.translation()
				const dest = new Vector3(bodyPos.x, bodyPos.y, bodyPos.z).add(movement)
				body.setNextKinematicTranslation(dest)
			} else {
				body.applyImpulse(force.multiplyScalar(1000), true)
			}
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
export const savePlayerFromTheEmbraceOfTheVoid = () => {
	const player = playerQuery.first
	if (player && player.position.y < -10) {
		player.body.setTranslation({ x: 0, y: 10, z: 0 }, true)
	}
}
export const stopPlayer = () => {
	const player = playerQuery.first
	if (player) {
		player.movementForce.setScalar(0)
	}
}