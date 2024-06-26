import type { Collider, RigidBody } from '@dimforge/rapier3d-compat'
import { type State, runIf } from './state'
import { pausedState } from '@/global/states'
import { ecs, world } from '@/global/init'
import type { Entity } from '@/global/entity'

const bodiesQuery = ecs.with('bodyDesc', 'position').without('body')
const colliderQueries = ecs.with('colliderDesc', 'body').without('collider')
const rotationWithBodyQuery = ecs.with('body', 'rotation')
const secondaryCollidersQuery = ecs.with('body', 'secondaryColliders')

const bodiesToRemove = new Set<RigidBody>()
const collidersToRemove = new Set<Collider>()
const secondaryColliders = new Map<Entity, Collider[]>()
const entitiesRemoved = new Set<Entity>()
const removeBodies = () => ecs.with('body').onEntityRemoved.subscribe((entity) => {
	bodiesToRemove.add(entity.body)
})
const removeColliders = () => ecs.with('collider').onEntityRemoved.subscribe((entity) => {
	collidersToRemove.add(entity.collider)
})
const removeSecondaryColliders = () => secondaryCollidersQuery.onEntityRemoved.subscribe((e) => {
	entitiesRemoved.add(e)
})

export const stepWorld = () => {
	const callBacks: Array<() => void> = []
	for (const entity of bodiesQuery) {
		const body = world.createRigidBody(entity.bodyDesc)

		body.setTranslation(entity.position, true)
		if (entity.rotation) {
			body.setRotation(entity.rotation, true)
		}
		body.userData = entity
		callBacks.push(() => {
			ecs.addComponent(entity, 'body', body)
			ecs.removeComponent(entity, 'bodyDesc')
		})
	}
	for (const entity of colliderQueries) {
		const collider = world.createCollider(entity.colliderDesc, entity.body)
		callBacks.push(() => {
			ecs.addComponent(entity, 'collider', collider)
			ecs.removeComponent(entity, 'colliderDesc')
		})
	}
	for (const entity of secondaryCollidersQuery) {
		const colliders = entity.secondaryColliders.map(desc => world.createCollider(desc, entity.body))
		secondaryColliders.set(entity, colliders)

		ecs.removeComponent(entity, 'secondaryColliders')
	}
	bodiesToRemove.clear()
	world.step()
	for (const body of bodiesToRemove) {
		world.removeRigidBody(body)
	}
	bodiesToRemove.clear()
	for (const collider of collidersToRemove) {
		world.removeCollider(collider, false)
	}
	collidersToRemove.clear()
	for (const entity of entitiesRemoved) {
		const colliders = secondaryColliders.get(entity)
		if (colliders) {
			for (const collider of colliders) {
				world.removeCollider(collider, false)
			}
		}
	}
	callBacks.forEach(callBack => callBack())
	for (const entity of rotationWithBodyQuery) {
		entity.body.setRotation(entity.rotation, true)
	}
}
export const physicsPlugin = (state: State) => {
	state
		.onUpdate(runIf(() => !pausedState.enabled, stepWorld))
		.addSubscriber(removeBodies, removeColliders, removeSecondaryColliders)
}
