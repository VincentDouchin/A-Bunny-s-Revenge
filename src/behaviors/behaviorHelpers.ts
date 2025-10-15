import type { With } from 'miniplex'
import type { Entity } from '@/global/entity'
import { QueryFilterFlags } from '@dimforge/rapier3d-compat'
import { Vector3 } from 'three'
import { params } from '@/global/context'
import { ecs, gameInputs, inputManager, settings, time } from '@/global/init'
import { app } from '@/global/states'
import { action } from '@/lib/behaviors'

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

export const getPlayerRotation = (e: With<Entity, 'position'>, force: Vector3) => {
	const lockOn = lockedOnQuery.first
	if (lockOn) {
		return lockOn.position.clone().sub(e.position).normalize()
	}
	if (app.isDisabled('menu') && settings.controls === 'mouse') {
		if (inputManager.controls() === 'gamepad') {
			return new Vector3(
				gameInputs.get('lookLeft').pressed - gameInputs.get('lookRight').pressed,
				0,
				gameInputs.get('lookForward').pressed - gameInputs.get('lookBackward').pressed,
			).normalize()
		}
		if (inputManager.controls() === 'keyboard') {
			return inputManager.mouseWorldPosition.clone().sub(e.position).normalize()
		}
	}
	return force
}
export const applyMove = <E extends With<Entity, 'body'>, C>(fn: (e: E, c: C) => Vector3) => action((entity: E, c: C) => {
	if (app.isEnabled('paused')) return
	const { body, controller, collider } = entity
	const force = fn(entity, c)
	if (controller && collider && body.isKinematic()) {
		if (!controller.computedGrounded()) {
			force.add(new Vector3(0, -0.2, 0))
		}
		controller.computeColliderMovement(collider, force, QueryFilterFlags.EXCLUDE_SENSORS, undefined)
		const movement = controller.computedMovement()
		const bodyPos = body.translation()
		const dest = new Vector3(bodyPos.x, bodyPos.y, bodyPos.z).add(movement)
		body.setNextKinematicTranslation(dest)
	} else {
		body.applyImpulse(force.multiplyScalar(1000), true)
	}
})

export const applyRotate = <E extends With<Entity, 'rotation' | 'targetRotation'>, C>(fn: (e: E, c: C) => Vector3) => action((e: E, c: C) => {
	if (app.isEnabled('paused') || app.isEnabled('menu')) return
	const rot = fn(e, c)
	if (rot.length() > 0) {
		e.targetRotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(rot.x, rot.z))
	}
})

export const moveToDirection = <E extends With<Entity, 'movementForce'>, C extends { direction?: Vector3 | null }>() => action((e: E, c: C) => {
	if (c.direction) {
		e.movementForce.x = c.direction.x
		e.movementForce.z = c.direction.z
	}
})

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
