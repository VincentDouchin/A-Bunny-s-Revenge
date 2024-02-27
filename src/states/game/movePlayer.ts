import { Vector3 } from 'three'
import { Player } from 'tone'
import { params } from '@/global/context'
import { assets, ecs, inputManager, time } from '@/global/init'
import { cutSceneState, openMenuState, pausedState } from '@/global/states'
import { throttle } from '@/lib/state'
import { updateSave } from '@/global/save'
import { getRandom } from '@/utils/mapFunctions'

const movementQuery = ecs.with('body', 'rotation', 'movementForce', 'speed', 'stateMachine', 'state')
const playerQuery = movementQuery.with('playerControls', 'position', 'playerAnimator', 'state', 'lastStep')

export const playerSteps = () => {
	for (const player of playerQuery) {
		if (player.state === 'running' && player.playerAnimator.action) {
			for (const [time, foot] of [[12 / 20, 'right'], [3 / 20, 'left']] as const) {
				if (player.playerAnimator.action.time >= time) {
					if (player.lastStep[foot] === false) {
						const buffer = getRandom(assets.steps).buffer
						const sound = new Player(buffer).toDestination()
						sound.playbackRate = 3

						sound.start()
						sound.onstop = () => sound.dispose()
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
		const { body, rotation, stateMachine, movementForce, speed, state } = entity
		const force = movementForce.clone().multiplyScalar(speed * params.speedUp * time.delta)
		force.setY(0)
		const moving = force.length() > 0
		moving && rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(force.x, force.z))
		if (state !== 'picking' && state !== 'waitingAttack' && state !== 'hit' && state !== 'dying' && state !== 'dead') {
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
export const savePlayerFromTheEmbraceOfTheVoid = () => {
	const player = playerQuery.first
	if (player && player.position.y < -10) {
		player.body.setTranslation({ x: 0, y: 10, z: 0 }, true)
	}
}