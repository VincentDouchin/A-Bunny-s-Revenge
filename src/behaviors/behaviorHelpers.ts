import { QueryFilterFlags } from '@dimforge/rapier3d-compat'
import type { With } from 'miniplex'
import { Vector3 } from 'three'
import { params } from '@/global/context'
import type { Entity } from '@/global/entity'
import { time } from '@/global/init'
import { pausedState } from '@/global/states'

export const getMovementForce = ({ movementForce, speed, targetMovementForce }: With<Entity, 'movementForce' | 'speed' >) => {
	const targetForce = movementForce.clone().multiplyScalar(speed.value * params.speedUp * time.delta / 1000)
	const force = targetMovementForce ? targetMovementForce.lerp(targetForce, time.delta / 200) : targetForce

	return {
		force,
		isMoving: (Math.abs(force.x) + Math.abs(force.z)) > 0.05,
	}
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
	entity.targetRotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(force.x, force.z))
	entity.rotation.slerp(entity.targetRotation, time.delta / 70)
}
export const takeDamage = (entity: With<Entity, 'currentHealth'>, damage: number) => {
	entity.currentHealth = Math.max(0, entity.currentHealth - damage)
}
