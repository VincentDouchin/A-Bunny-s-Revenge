import { QueryFilterFlags } from '@dimforge/rapier3d-compat'
import type { With } from 'miniplex'
import { Vector3 } from 'three'
import { params } from '@/global/context'
import type { Entity } from '@/global/entity'
import { ecs, inputManager, time } from '@/global/init'
import { save } from '@/global/save'
import { openMenuState, pausedState } from '@/global/states'

export const getMovementForce = ({ movementForce, speed, targetMovementForce }: With<Entity, 'movementForce' | 'speed' >) => {
	const targetForce = movementForce.clone().multiplyScalar(speed.value * params.speedUp * time.delta / 1000)
	const force = targetMovementForce ? targetMovementForce.lerp(targetForce, time.delta / 100) : targetForce

	return {
		force,
		isMoving: (Math.abs(force.x) + Math.abs(force.z)) > 0.05,
	}
}
const lockedOnQuery = ecs.with('lockedOn', 'position')
export const getPlayerRotation = (e: With<Entity, 'position' | 'playerControls'>, force: Vector3) => {
	const lockOn = lockedOnQuery.first
	if (lockOn) {
		return lockOn.position.clone().sub(e.position).normalize()
	}
	if (!openMenuState.enabled && save.settings.controls === 'mouse') {
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
export const applyMove = (entity: With<Entity, 'body' >, force: Vector3) => {
	if (pausedState.enabled) return
	const { body, controller, collider } = entity
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
export const applyRotate = (entity: With<Entity, 'rotation' | 'targetRotation'>, force: Vector3) => {
	if (pausedState.enabled) return
	if (force.length() > 0) {
		entity.targetRotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(force.x, force.z))
	}
}
export const takeDamage = (entity: With<Entity, 'currentHealth'>, damage: number) => {
	if (save.settings.difficulty === 'easy') {
		if (entity.player) {
			damage *= 0.5
		} else {
			damage *= 2
		}
	}
	entity.currentHealth = Math.max(0, entity.currentHealth - damage)
}
