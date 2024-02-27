import { type State, throttle } from './state'
import { ecs, world } from '@/global/init'

const addBodies = () => ecs.with('bodyDesc', 'position').onEntityAdded.subscribe((entity) => {
	const body = world.createRigidBody(entity.bodyDesc)
	body.setTranslation(entity.position, true)
	ecs.addComponent(entity, 'body', body)
	ecs.removeComponent(entity, 'bodyDesc')
})

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
const stepWorld = throttle(1 / 60, () => world.step())
export const physicsPlugin = (state: State) => {
	state
		.onPreUpdate(stepWorld)
		.addSubscriber(addBodies, addColliders, removeColliders, removeBodies)
}
