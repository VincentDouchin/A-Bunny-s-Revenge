import type { Collider, RigidBody } from '@dimforge/rapier3d-compat'
import { type State, runIf } from './state'
import { ecs, world } from '@/global/init'
import { pausedState } from '@/global/states'

const bodiesQuery = ecs.with('bodyDesc', 'position').without('body')
const colliderQueries = ecs.with('colliderDesc', 'body').without('collider')
const rotationWithBodyQuery = ecs.with('body', 'rotation')
const secondaryCollidersQuery = ecs.with('body', 'secondaryCollidersDesc')

const bodiesToRemove = new Set<RigidBody>()
const collidersToRemove = new Set<Collider>()
const secondaryCollidersToRemove = new Set<Collider[]>()
const removeBodies = () => ecs.with('body').onEntityRemoved.subscribe((entity) => {
	bodiesToRemove.add(entity.body)
})
const removeColliders = () => ecs.with('collider').onEntityRemoved.subscribe((entity) => {
	collidersToRemove.add(entity.collider)
})
const removeSecondaryColliders = () => ecs.with('secondaryColliders').onEntityRemoved.subscribe((e) => {
	secondaryCollidersToRemove.add(e.secondaryColliders)
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
		const colliders = entity.secondaryCollidersDesc.map(desc => world.createCollider(desc, entity.body))
		ecs.addComponent(entity, 'secondaryColliders', colliders)
		ecs.removeComponent(entity, 'secondaryCollidersDesc')
	}
	world.step()
	for (const body of bodiesToRemove) {
		world.removeRigidBody(body)
	}
	bodiesToRemove.clear()
	for (const collider of collidersToRemove) {
		world.removeCollider(collider, false)
	}
	collidersToRemove.clear()
	for (const secondaryColliders of secondaryCollidersToRemove) {
		for (const collider of secondaryColliders) {
			world.removeCollider(collider, false)
		}
	}
	secondaryCollidersToRemove.clear()
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
