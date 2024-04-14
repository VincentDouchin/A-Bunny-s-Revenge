import type { With } from 'miniplex'
import { Vector3 } from 'three'
import { QueryFilterFlags } from '@dimforge/rapier3d-compat'
import type { Entity } from '@/global/entity'
import { time } from '@/global/init'
import { params } from '@/global/context'

export const getMovementForce = ({ movementForce, speed }: With<Entity, 'movementForce' | 'speed'>) => {
	const force = movementForce.clone().multiplyScalar(speed.value * params.speedUp * time.delta / 1000)
	return {
		force,
		isMoving: force.length() > 0,
	}
}
export const applyMove = (entity: With<Entity, 'body'>, force: Vector3) => {
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
export const applyRotate = (entity: With<Entity, 'rotation'>, force: Vector3) => {
	entity.rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(force.x, force.z))
}
export const takeDamage = (entity: With<Entity, 'currentHealth'>, damage: number) => {
	entity.currentHealth = Math.max(0, entity.currentHealth - damage)
}

// const { body, rotation, stateMachine, movementForce, speed, state, controller, collider } = entity
//  force.setY(0).multiplyScalar(['waitingAttack', 'attacking'].includes(state) ? 0.3 : 1)
// const moving = force.length() > 0
// moving && state !== 'picking' && rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(force.x, force.z))
// if (!['picking', 'hit', 'dying', 'dead', 'cheer'].includes(state)) {
// 	if (moving) {
// 		stateMachine.enter('running', entity)
// 	} else if (state !== 'attacking') {
// 		stateMachine.enter('idle', entity)
// 	}
