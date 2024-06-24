import type { RigidBody } from '@dimforge/rapier3d-compat'
import { type State, runIf } from './state'
import { pausedState } from '@/global/states'
import { ecs, world } from '@/global/init'

const addColliders = () => ecs.with('body', 'colliderDesc').onEntityAdded.subscribe((entity) => {
	const collider = world.createCollider(entity.colliderDesc, entity.body)

	ecs.removeComponent(entity, 'colliderDesc')
	ecs.addComponent(entity, 'collider', collider)
})
const bodiesToRemove = new Set<RigidBody>()
const removeBodies = () => ecs.with('body').onEntityRemoved.subscribe((entity) => {
	bodiesToRemove.add(entity.body)
})

const secondaryCollidersQuery = ecs.with('body', 'secondaryColliders').without('bodyDesc')
const addSecondaryColliders = () => secondaryCollidersQuery.onEntityAdded.subscribe((e) => {
	for (const collider of e.secondaryColliders) {
		world.createCollider(collider, e.body)
	}
})

const bodiesQuery = ecs.with('bodyDesc', 'position').without('body')

const stepWorld = () => {
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
	for (const body of bodiesToRemove) {
		for (let i = 0; i < body.numColliders(); i++) {
			const collider = body.collider(i)
			world.removeCollider(collider, true)
		}
		world.removeRigidBody(body)
	}
	bodiesToRemove.clear()
	world.step()
	callBacks.forEach(callBack => callBack())
}
export const physicsPlugin = (state: State) => {
	state
		.onPreUpdate(runIf(() => !pausedState.enabled, stepWorld))
		.addSubscriber(addColliders, addSecondaryColliders, removeBodies)
}
