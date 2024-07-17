import { throttle } from '@solid-primitives/scheduled'
import { ecs, inputManager } from '@/global/init'
import { updateSave } from '@/global/save'
import { playStep } from '@/global/sounds'
import { cutSceneState, openMenuState, pausedState } from '@/global/states'
import { spawnFootstep } from '@/particles/footsteps'

const movementQuery = ecs.with('body', 'rotation', 'movementForce', 'speed')
const playerQuery = movementQuery.with('playerControls', 'position', 'state', 'lastStep', 'playerAnimator', 'modifiers')

export const playerSteps = () => {
	for (const player of playerQuery) {
		if (player.state === 'running' && player.playerAnimator.action) {
			for (const [time, foot] of [[12 / 20, 'right'], [3 / 20, 'left']] as const) {
				if (player.playerAnimator.getTimeRatio() >= time) {
					if (player.lastStep[foot] === false) {
						playStep('random')
						player.lastStep[foot] = true
						const honey = player.modifiers.hasModifier('honeySpot')
						spawnFootstep(foot, player.position, honey)
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
		if (inputManager.controls() === 'keyboard') {
			movementForce.normalize()
		}
	}
}

export const canPlayerMove = () => !openMenuState.enabled && !cutSceneState.enabled && !pausedState.enabled

export const savePlayerPosition = throttle(() => {
	const player = playerQuery.first
	if (player) {
		updateSave((s) => {
			s.playerPosition = player.position.toArray()
			s.playerRotation = player.rotation.toArray()
		})
	}
}, 1000)
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