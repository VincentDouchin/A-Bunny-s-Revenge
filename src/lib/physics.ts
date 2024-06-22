import { type State, runIf } from './state'
import { pausedState } from '@/global/states'
import { ecs, world } from '@/global/init'

const addColliders = () => ecs.with('body', 'colliderDesc').onEntityAdded.subscribe((entity) => {
	const collider = world.createCollider(entity.colliderDesc, entity.body)

	ecs.addComponent(entity, 'collider', collider)
	ecs.removeComponent(entity, 'colliderDesc')
})
const removeColliders = () => ecs.with('collider').onEntityRemoved.subscribe((entity) => {
	world.removeCollider(entity.collider, true)
})
const removeBodies = () => ecs.with('body').onEntityRemoved.subscribe((entity) => {
	world.removeRigidBody(entity.body)
})
const addSecondaryColliders = () => ecs.with('body', 'secondaryColliders').without('bodyDesc').onEntityAdded.subscribe((e) => {
	for (const collider of e.secondaryColliders) {
		world.createCollider(collider, e.body)
	}
})
const bodiesQuery = ecs.with('bodyDesc', 'position').without('body')
const stepWorld = () => {
	for (const entity of bodiesQuery) {
		const body = world.createRigidBody(entity.bodyDesc)

		ecs.removeComponent(entity, 'bodyDesc')
		body.setTranslation(entity.position, true)
		if (entity.rotation) {
			body.setRotation(entity.rotation, true)
		}
		body.userData = entity
		ecs.addComponent(entity, 'body', body)
	}
	world.step()
}
export const physicsPlugin = (state: State) => {
	state
		.onPreUpdate(runIf(() => !pausedState.enabled, stepWorld))
		.addSubscriber(addColliders, removeColliders, removeBodies, addSecondaryColliders)
}
