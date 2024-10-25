import type { Entity } from '@/global/entity'
import type { With } from 'miniplex'
import { params } from '@/global/context'
import { ecs, inputManager, settings, time } from '@/global/init'
import { openMenuState, pausedState } from '@/global/states'
import { QueryFilterFlags } from '@dimforge/rapier3d-compat'
import { Vector3 } from 'three'

export const getMovementForce = ({ movementForce, speed, targetMovementForce }: With<Entity, 'movementForce' | 'speed'>) => {
	const targetForce = movementForce.clone().multiplyScalar(speed.value * params.speedUp * time.delta / 1000)
	const force = targetMovementForce ? targetMovementForce.lerp(targetForce, time.delta / 100) : targetForce

	return {
		force,
		isMoving: (Math.abs(force.x) + Math.abs(force.z)) > 0.05,
	}
}
const lockedOnQuery = ecs.with('lockedOn', 'position')

export const getRelativeDirection = (facingDir: Vector3, movementDir: Vector3) => {
	// Normalize the vectors
	const facing = facingDir.clone().normalize()
	const movement = movementDir.clone().normalize()

	// Get the right vector
	const right = facing.clone().cross(new Vector3(0, 1, 0))

	// Get dot products
	const forwardness = facing.dot(movement)
	const rightness = right.dot(movement)

	// Return the direction with the largest magnitude
	if (Math.abs(forwardness) > Math.abs(rightness)) {
		return forwardness > 0 ? 'front' : 'back'
	} else {
		return rightness > 0 ? 'right' : 'left'
	}
}

export const getPlayerRotation = (e: With<Entity, 'position' | 'playerControls'>, force: Vector3) => {
	const lockOn = lockedOnQuery.first
	if (lockOn) {
		return lockOn.position.clone().sub(e.position).normalize()
	}
	if (!openMenuState.enabled && settings.controls === 'mouse') {
		if (inputManager.controls() === 'gamepad') {
			return new Vector3(
				e.playerControls.get('lookLeft').pressed - e.playerControls.get('lookRight').pressed,
				0,
				e.playerControls.get('lookForward').pressed - e.playerControls.get('lookBackward').pressed,
			).normalize()
		}
		if (inputManager.controls() === 'keyboard') {
			return inputManager.mouseWorldPosition.clone().sub(e.position).normalize()
		}
	}
	return force
}
export const applyMove = (entity: With<Entity, 'body'>, force: Vector3) => {
	if (pausedState.enabled) return
	const { body, controller, collider } = entity
	if (controller && collider && body.isKinematic()) {
		if (!controller.computedGrounded()) {
			force.add(new Vector3(0, -0.2, 0))
		}
		controller.computeColliderMovement(collider, force, QueryFilterFlags.EXCLUDE_SENSORS | QueryFilterFlags.EXCLUDE_SOLIDS, undefined)
		const movement = controller.computedMovement()
		const bodyPos = body.translation()
		const dest = new Vector3(bodyPos.x, bodyPos.y, bodyPos.z).add(movement)
		body.setNextKinematicTranslation(dest)
	} else {
		body.applyImpulse(force.multiplyScalar(1000), true)
	}
}
export const applyRotate = (entity: With<Entity, 'rotation' | 'targetRotation'>, force: Vector3) => {
	if (pausedState.enabled || openMenuState.enabled) return
	if (force.length() > 0) {
		entity.targetRotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(force.x, force.z))
	}
}
export const takeDamage = (entity: With<Entity, 'currentHealth'>, damage: number) => {
	if (settings.difficulty === 'easy') {
		if (entity.player) {
			damage *= 0.5
		} else {
			damage *= 2
		}
	}
	entity.currentHealth = Math.max(0, entity.currentHealth - damage)
}
