import { type State, runIf } from './state'
import { pausedState } from '@/global/states'
import { ecs, world } from '@/global/init'

const addColliders = () => ecs.with('body', 'colliderDesc').onEntityAdded.subscribe((entity) => {
	const collider = world.createCollider(entity.colliderDesc, entity.body)

	ecs.removeComponent(entity, 'colliderDesc')
	ecs.addComponent(entity, 'collider', collider)
})

const removeBodies = () => ecs.with('body').onEntityRemoved.subscribe((entity) => {
	for (let i = 0; i < entity.body.numColliders(); i++) {
		const collider = entity.body.collider(i)
		world.removeCollider(collider, true)
	}
	world.removeRigidBody(entity.body)
})

const secondaryCollidersQuery = ecs.with('body', 'secondaryColliders').without('bodyDesc')
const addSecondaryColliders = () => secondaryCollidersQuery.onEntityAdded.subscribe((e) => {
	for (const collider of e.secondaryColliders) {
		world.createCollider(collider, e.body)
	}
})

const bodiesQuery = ecs.with('bodyDesc', 'position').without('body')
const addBodies = () => bodiesQuery.onEntityAdded.subscribe((entity) => {
	const body = world.createRigidBody(entity.bodyDesc)

	body.setTranslation(entity.position, true)
	if (entity.rotation) {
		body.setRotation(entity.rotation, true)
	}
	body.userData = entity
	ecs.addComponent(entity, 'body', body)
	ecs.removeComponent(entity, 'bodyDesc')
})
const stepWorld = () => {
	world.step()
}
export const physicsPlugin = (state: State) => {
	state
		.onPreUpdate(runIf(() => !pausedState.enabled, stepWorld))
		.addSubscriber(addBodies, addColliders, addSecondaryColliders, removeBodies)
}
