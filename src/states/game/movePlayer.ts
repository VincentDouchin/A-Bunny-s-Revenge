import { Vector3 } from 'three'
import { ecs, inputManager } from '@/global/init'
import { app } from '@/global/states'
import { spawnFootstep } from '@/particles/footsteps'

const movementQuery = ecs.with('body', 'rotation', 'movementForce', 'speed', 'targetMovementForce')
const playerQuery = movementQuery.with('playerControls', 'position', 'state', 'lastStep', 'playerAnimator', 'modifiers', 'model', 'worldPosition')

export const playerSteps = () => {
	for (const player of playerQuery) {
		if (player.state.current === 'running' && player.playerAnimator.action) {
			const ground = player.worldPosition.y
			player.model?.traverse((n) => {
				if (n.name.startsWith('toes')) {
					const pos = new Vector3()
					n.getWorldPosition(pos)
					const foot = n.name.endsWith('r') ? 'right' : 'left'
					if (pos.y - ground <= 0.3) {
						if (player.lastStep[foot] === false) {
							const honey = player.modifiers.hasModifier('honeySpot')
							spawnFootstep(foot, player.position, honey)
							player.lastStep[foot] = true
						}
					} else {
						player.lastStep[foot] = false
					}
				} })
		} else {
			player.lastStep.left = false
			player.lastStep.right = false
		}
	}
}

export const movePlayer = () => {
	for (const e of playerQuery) {
		const { playerControls, movementForce } = e
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

export const canPlayerMove = () => app.isDisabled('menu') && app.isDisabled('cutscene') && app.isDisabled('paused')

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
		player.targetMovementForce.setScalar(0)
		player.state.next = 'idle'
	}
}